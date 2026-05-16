import { LocalIndex } from 'vectra';
import { CodeEntityData, SearchResultItem } from '../../shared/index.js';
import { KnowledgeGraphDatabase } from '../knowledge-graph/index.js';
import { applicationLogger } from '../../infrastructure/logger/index.js';
import { ensureDirectoryExists } from '../../shared/utilities.js';

/** 向量模型类型 */
export type VectorModelType = 'simple' | 'tfidf' | 'local';

/** 语义向量搜索配置选项 */
export interface SemanticVectorSearchOptions {
    dataDirectory?: string;
    searchEnabled?: boolean;
    vectorModel?: VectorModelType;
}

/** 语义向量搜索类 */
export class SemanticVectorSearch {
    private vectorIndex?: LocalIndex;
    private entityMetadataMap: Map<string, CodeEntityData> = new Map();
    private isInitialized = false;
    private searchOptions: SemanticVectorSearchOptions;
    private idfMap: Map<string, number> = new Map();
    private corpus: string[] = [];

    constructor(dataDirectory: string = './.arkts-code-graph/vector', searchEnabled: boolean = true, vectorModel: VectorModelType = 'tfidf') {
        this.searchOptions = { dataDirectory, searchEnabled, vectorModel };
    }

    /** 初始化向量搜索索引 */
    async initialize(): Promise<void> {
        if (!this.searchOptions.searchEnabled) {
            applicationLogger.debug('Semantic vector search is disabled');
            return;
        }
        try {
            ensureDirectoryExists(this.searchOptions.dataDirectory!);
            this.vectorIndex = new LocalIndex(this.searchOptions.dataDirectory!);
            if (!await this.vectorIndex.isIndexCreated()) {
                await this.vectorIndex.createIndex();
            }
            this.isInitialized = true;
            applicationLogger.info(`Semantic vector search initialized with model: ${this.searchOptions.vectorModel}`);
        } catch (error) {
            applicationLogger.warn('Failed to initialize semantic vector search, falling back to disabled state', error);
            this.searchOptions.searchEnabled = false;
        }
    }

    /**
     * 添加代码实体到向量索引
     * @param entityId 实体 ID
     * @param entityData 实体数据
     * @param entityText 实体文本表示
     */
    async addEntityToIndex(entityId: string, entityData: CodeEntityData, entityText: string): Promise<void> {
        if (!this.searchOptions.searchEnabled || !this.isInitialized || !this.vectorIndex)
            return;
        try {
            if (!entityId || !entityData) {
                applicationLogger.warn('Invalid entity data, skipping index addition');
                return;
            }
            this.entityMetadataMap.set(entityId, entityData);
            const safeEntityText = entityText || '';
            this.corpus.push(safeEntityText);
            const vector = await this.vectorize(safeEntityText);
            await this.vectorIndex.insertItem({
                id: entityId,
                metadata: {
                    type: entityData.type,
                    name: this.getEntityName(entityData)
                },
                vector
            });
            applicationLogger.debug(`Entity added to semantic vector index: ${entityId}`);
        } catch (error) {
            applicationLogger.warn(`Failed to add entity to semantic vector index: ${entityId}`, error);
        }
    }

    /**
     * 语义搜索代码实体
     * @param query 查询文本
     * @param topK 返回结果数量
     */
    async searchEntities(query: string, topK: number = 10): Promise<SearchResultItem[]> {
        if (!this.searchOptions.searchEnabled || !this.isInitialized || !this.vectorIndex) {
            return [];
        }
        try {
            const queryVector = await this.vectorize(query || '');
            const searchResults = await this.vectorIndex.queryItems(queryVector, Math.max(1, topK));
            return searchResults
                .map((result: any) => {
                    const entityData = this.entityMetadataMap.get(result.item.id);
                    return entityData ? {
                        entityId: result.item.id,
                        entityData,
                        relevanceScore: result.score
                    } : null;
                })
                .filter((item: any) => item !== null);
        } catch (error) {
            applicationLogger.warn('Semantic vector search failed', error);
            return [];
        }
    }

    /**
     * 从索引中删除代码实体
     * @param entityId 实体 ID
     */
    async removeEntityFromIndex(entityId: string): Promise<void> {
        if (!this.searchOptions.searchEnabled || !this.isInitialized || !this.vectorIndex)
            return;
        try {
            await this.vectorIndex.deleteItem(entityId);
            this.entityMetadataMap.delete(entityId);
            applicationLogger.debug(`Entity removed from semantic vector index: ${entityId}`);
        } catch (error) {
            applicationLogger.warn(`Failed to remove entity from semantic vector index: ${entityId}`);
        }
    }

    /** 清空向量搜索索引 */
    async clearIndex(): Promise<void> {
        if (!this.searchOptions.searchEnabled || !this.isInitialized || !this.vectorIndex)
            return;
        try {
            await this.vectorIndex.deleteIndex();
            await this.vectorIndex.createIndex();
            this.entityMetadataMap.clear();
            this.corpus = [];
            this.idfMap.clear();
            applicationLogger.info('Semantic vector search index cleared');
        } catch (error) {
            applicationLogger.warn('Failed to clear semantic vector search index', error);
        }
    }

    /**
     * 从知识图谱添加实体到向量索引
     * @param knowledgeGraph 知识图谱数据库
     */
    async addEntitiesFromGraph(knowledgeGraph: KnowledgeGraphDatabase): Promise<void> {
        if (!this.searchOptions.searchEnabled || !this.isInitialized || !this.vectorIndex)
            return;
        applicationLogger.info('Adding entities from knowledge graph to semantic search index');
        const stats = knowledgeGraph.getStatistics();
        const entityTypes = Object.keys(stats.entityCountByType);
        for (const entityType of entityTypes) {
            try {
                const entities = knowledgeGraph.getCodeEntitiesByType(entityType);
                for (const { entityId, entityData } of entities) {
                    try {
                        const entityText = this.generateEntityText(entityData);
                        await this.addEntityToIndex(entityId, entityData, entityText);
                    } catch (entityError) {
                        applicationLogger.warn(`Failed to process entity ${entityId}`, entityError);
                    }
                }
            } catch (typeError) {
                applicationLogger.warn(`Failed to process entity type ${entityType}`);
            }
        }
        if (this.searchOptions.vectorModel === 'tfidf') {
            this.buildIDF();
        }
        applicationLogger.info('Entities from knowledge graph added to semantic search index');
    }

    /**
     * 根据当前向量模型向量化文本
     * @param text 输入文本
     */
    private async vectorize(text: string): Promise<number[]> {
        switch (this.searchOptions.vectorModel) {
            case 'simple':
                return this.simpleVectorize(text);
            case 'tfidf':
                return this.tfidfVectorize(text);
            case 'local':
                return this.localEmbed(text);
            default:
                return this.simpleVectorize(text);
        }
    }

    /**
     * 简单的字符级向量表示
     */
    private simpleVectorize(text: string): number[] {
        const vectorSize = 1536;
        const vector = new Array(vectorSize).fill(0);
        if (!text || text.length === 0) {
            return vector;
        }
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            const position = Math.abs(charCode % vectorSize);
            vector[position] += 1;
        }
        return this.normalize(vector);
    }

    /**
     * TF-IDF 向量化
     */
    private tfidfVectorize(text: string): number[] {
        const vectorSize = 1536;
        const vector = new Array(vectorSize).fill(0);
        if (!text || text.length === 0) {
            return vector;
        }
        const tokens = this.tokenize(text);
        if (tokens.length === 0) {
            return vector;
        }
        const tfMap = new Map<string, number>();
        for (const token of tokens) {
            const count = (tfMap.get(token) || 0) + 1;
            tfMap.set(token, count);
        }
        for (const [token, tf] of tfMap) {
            try {
                const idf = this.idfMap.get(token) || Math.log(2);
                const tfidf = tf * idf;
                const position = this.simpleHash(token, vectorSize);
                vector[position] += tfidf;
            } catch (error) {
                applicationLogger.debug('Failed to process token for tfidf');
            }
        }
        return this.normalize(vector);
    }

    /**
     * 本地嵌入模型（使用简单的嵌入）
     */
    private localEmbed(text: string): number[] {
        const vectorSize = 1536;
        const vector = new Array(vectorSize).fill(0);
        if (!text || text.length === 0) {
            return vector;
        }
        const tokens = this.tokenize(text);
        if (tokens.length === 0) {
            return vector;
        }
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const hash = this.simpleHash(token, vectorSize);
            if (hash >= 0 && hash < vectorSize) {
                vector[hash] += 1;
            }
            if (i < tokens.length - 1) {
                const nextHash = this.simpleHash(tokens[i + 1], vectorSize);
                const pairHash = Math.abs((hash + nextHash) % vectorSize);
                if (pairHash >= 0 && pairHash < vectorSize) {
                    vector[pairHash] += 0.5;
                }
            }
        }
        return this.normalize(vector);
    }

    /**
     * 构建 IDF 表
     */
    private buildIDF(): void {
        const validCorpus = this.corpus.filter(doc => doc && doc.length > 0);
        const totalDocs = Math.max(validCorpus.length, 1);
        const docFreq = new Map<string, number>();
        for (const doc of validCorpus) {
            try {
                const tokens = new Set(this.tokenize(doc));
                for (const token of tokens) {
                    const count = (docFreq.get(token) || 0) + 1;
                    docFreq.set(token, count);
                }
            } catch (error) {
            }
        }
        for (const [token, freq] of docFreq) {
            try {
                const idf = Math.log((totalDocs - freq + 0.5) / (freq + 0.5) + 1);
                this.idfMap.set(token, idf);
            } catch (error) {
                this.idfMap.set(token, Math.log(2));
            }
        }
    }

    /**
     * 简单的分词
     */
    private tokenize(text: string): string[] {
        if (!text || text.length === 0) {
            return [];
        }
        try {
            return text
                .toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter(token => token && token.length > 0);
        } catch (error) {
            return [];
        }
    }

    /**
     * 简单的哈希函数
     */
    private simpleHash(text: string, bucketSize: number): number {
        if (!text || text.length === 0 || bucketSize <= 0) {
            return 0;
        }
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & 0x7FFFFFFF;
        }
        return Math.abs(hash) % Math.max(1, bucketSize);
    }

    /**
     * 向量归一化
     */
    private normalize(vector: number[]): number[] {
        if (!vector || vector.length === 0) {
            return [];
        }
        let magnitude = 0;
        for (let i = 0; i < vector.length; i++) {
            const val = vector[i] || 0;
            magnitude += val * val;
        }
        magnitude = Math.sqrt(magnitude);
        if (magnitude > 0 && isFinite(magnitude)) {
            return vector.map(val => (val || 0) / magnitude);
        }
        return vector;
    }

    /**
     * 获取代码实体的名称
     */
    private getEntityName(entityData: CodeEntityData): string {
        if (!entityData)
            return 'unknown';
        if ('fileName' in entityData)
            return entityData.fileName || 'unknown-file';
        if ('className' in entityData)
            return entityData.className || 'unknown-class';
        if ('functionName' in entityData)
            return entityData.functionName || 'unknown-function';
        if ('variableName' in entityData)
            return entityData.variableName || 'unknown-variable';
        if ('interfaceName' in entityData)
            return entityData.interfaceName || 'unknown-interface';
        if ('enumName' in entityData)
            return entityData.enumName || 'unknown-enum';
        if ('entityName' in entityData)
            return entityData.entityName || 'unknown';
        return 'unknown';
    }

    /**
     * 生成代码实体的文本表示（更丰富的描述）
     */
    private generateEntityText(entityData: CodeEntityData): string {
        if (!entityData) {
            return 'Unknown entity';
        }
        const parts: string[] = [];
        parts.push(`Type: ${entityData.type || 'unknown'}`);
        if ('fileName' in entityData) {
            parts.push(`File: ${entityData.fileName || 'unknown'}`);
            if (entityData.filePath) {
                parts.push(`Path: ${entityData.filePath}`);
            }
        }
        if ('className' in entityData) {
            parts.push(`Class: ${entityData.className || 'unknown'}`);
            if (entityData.accessModifiers && entityData.accessModifiers.length > 0) {
                parts.push(`Modifiers: ${entityData.accessModifiers.join(', ')}`);
            }
        }
        if ('functionName' in entityData) {
            parts.push(`Function: ${entityData.functionName || 'unknown'}`);
            if (entityData.returnTypeAnnotation) {
                parts.push(`Returns: ${entityData.returnTypeAnnotation}`);
            }
            if (entityData.parameters && entityData.parameters.length > 0) {
                const params = entityData.parameters.map(p => {
                    try {
                        return `${p.name || 'unknown'}: ${p.typeAnnotation || 'any'}`;
                    } catch {
                        return 'param: any';
                    }
                });
                parts.push(`Parameters: ${params.join(', ')}`);
            }
        }
        if ('variableName' in entityData) {
            parts.push(`Variable: ${entityData.variableName || 'unknown'}`);
            if (entityData.variableTypeAnnotation) {
                parts.push(`Type: ${entityData.variableTypeAnnotation}`);
            }
        }
        if ('interfaceName' in entityData) {
            parts.push(`Interface: ${entityData.interfaceName || 'unknown'}`);
        }
        if ('enumName' in entityData) {
            parts.push(`Enum: ${entityData.enumName || 'unknown'}`);
            if (entityData.enumMemberNames && entityData.enumMemberNames.length > 0) {
                parts.push(`Members: ${entityData.enumMemberNames.join(', ')}`);
            }
        }
        return parts.join('. ');
    }
}
