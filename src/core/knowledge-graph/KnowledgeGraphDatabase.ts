import Graphology from 'graphology';
import * as fs from 'fs';
import * as path from 'path';
import { CodeEntityType, CodeRelationType, CodeEntityData, CodeRelationData, KnowledgeGraphStatistics, CodeParsingResult } from '../../shared/index.js';
import { applicationLogger } from '../../infrastructure/logger/index.js';
import { KnowledgeGraphError } from '../../infrastructure/errors/index.js';
import { ensureDirectoryExists } from '../../shared/utilities.js';

/** 知识图谱数据库变更事件类型 */
type GraphChangeEvent = 'entity-added' | 'entity-removed' | 'relation-added' | 'relation-removed' | 'graph-cleared';

/** 知识图谱数据库配置选项 */
export interface KnowledgeGraphDatabaseOptions {
    dataDirectory?: string;
    persistToFileSystem?: boolean;
}

/** 知识图谱数据库类 */
export class KnowledgeGraphDatabase {
    private graphDatabase: Graphology.MultiDirectedGraph;
    private databaseOptions: Required<KnowledgeGraphDatabaseOptions>;
    private entityTypeIndex: Map<CodeEntityType, Set<string>> = new Map();
    private changeListeners: Map<GraphChangeEvent, Set<() => void>> = new Map();

    constructor(options: KnowledgeGraphDatabaseOptions = {}) {
        this.databaseOptions = {
            dataDirectory: './.arkts-code-graph',
            persistToFileSystem: true,
            ...options
        };
        this.graphDatabase = new Graphology.MultiDirectedGraph();
        this.initializeEntityTypeIndex();
        this.initializeChangeListeners();
    }

    /** 初始化变更事件监听器 */
    private initializeChangeListeners() {
        const eventTypes: GraphChangeEvent[] = ['entity-added', 'entity-removed', 'relation-added', 'relation-removed', 'graph-cleared'];
        eventTypes.forEach(event => {
            this.changeListeners.set(event, new Set());
        });
    }

    /**
     * 添加变更事件监听器
     * @param event 事件类型
     * @param listener 监听器函数
     */
    addChangeListener(event: GraphChangeEvent, listener: () => void): void {
        this.changeListeners.get(event)?.add(listener);
    }

    /**
     * 移除变更事件监听器
     * @param event 事件类型
     * @param listener 监听器函数
     */
    removeChangeListener(event: GraphChangeEvent, listener: () => void): void {
        this.changeListeners.get(event)?.delete(listener);
    }

    /**
     * 触发变更事件
     * @param event 事件类型
     */
    private emitChangeEvent(event: GraphChangeEvent): void {
        const listeners = this.changeListeners.get(event);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener();
                } catch (error) {
                    applicationLogger.error(`Error in change listener: ${error}`);
                }
            });
        }
    }

    /** 初始化实体类型索引 */
    private initializeEntityTypeIndex() {
        Object.values(CodeEntityType).forEach(entityType => {
            this.entityTypeIndex.set(entityType, new Set());
        });
    }

    /**
     * 添加代码实体节点
     * @param entityId 实体唯一标识符
     * @param entityData 实体数据
     */
    addCodeEntity(entityId: string, entityData: CodeEntityData): void {
    try {
      if (!entityData || typeof entityData !== 'object') {
        throw new KnowledgeGraphError('Entity data must be a non-null object', {
          metadata: { entityId, entityData }
        });
      }
      
      if (!Object.values(CodeEntityType).includes(entityData.type)) {
        throw new KnowledgeGraphError(`Invalid entity type: ${entityData.type}. Valid types are: ${Object.values(CodeEntityType).join(', ')}`, {
          metadata: { entityId, entityData }
        });
      }
      
      if (this.graphDatabase.hasNode(entityId)) {
        // 实体已存在，先检查并清理旧类型索引
        const existingData = this.graphDatabase.getNodeAttributes(entityId);
        if (existingData && existingData.type !== entityData.type) {
          // 类型已变更，从旧类型索引中删除
          this.entityTypeIndex.get(existingData.type)?.delete(entityId);
          applicationLogger.debug(`Entity ${entityId} type changed from ${existingData.type} to ${entityData.type}`);
        }
        this.graphDatabase.mergeNodeAttributes(entityId, entityData);
      }
      else {
        this.graphDatabase.addNode(entityId, entityData);
      }
      this.entityTypeIndex.get(entityData.type)?.add(entityId);
      applicationLogger.debug(`Added/updated code entity: ${entityId} (${entityData.type})`);
      this.emitChangeEvent('entity-added');
    }
    catch (error) {
      if (error instanceof KnowledgeGraphError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new KnowledgeGraphError(`Failed to add code entity: ${errorMessage}`, {
        cause: error,
        metadata: { entityId, entityData }
      });
    }
  }

    /**
     * 添加代码关系边
     * @param relationId 关系唯一标识符
     * @param sourceEntityId 源实体 ID
     * @param targetEntityId 目标实体 ID
     * @param relationData 关系数据
     */
    addCodeRelation(relationId: string, sourceEntityId: string, targetEntityId: string, relationData: CodeRelationData): void {
        try {
            if (!this.graphDatabase.hasNode(sourceEntityId)) {
                throw new KnowledgeGraphError(`Source entity not found: ${sourceEntityId}`, {
                    metadata: { relationId, sourceEntityId, targetEntityId, relationData }
                });
            }
            if (!this.graphDatabase.hasNode(targetEntityId)) {
                applicationLogger.warn(`Target entity not found for relation, creating placeholder: ${targetEntityId}`);
                this.graphDatabase.addNode(targetEntityId, {
                    type: CodeEntityType.UNKNOWN,
                    entityName: targetEntityId
                } as unknown as CodeEntityData);
            }
            if (this.graphDatabase.hasEdge(relationId)) {
                this.graphDatabase.mergeEdgeAttributes(relationId, relationData);
            }
            else {
                this.graphDatabase.addEdgeWithKey(relationId, sourceEntityId, targetEntityId, relationData);
            }
            applicationLogger.debug(`Added/updated code relation: ${relationId} (${relationData.type})`);
            this.emitChangeEvent('relation-added');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new KnowledgeGraphError(`Failed to add code relation: ${errorMessage}`, {
                cause: error,
                metadata: { relationId, sourceEntityId, targetEntityId, relationData }
            });
        }
    }

    /**
     * 获取代码实体数据
     * @param entityId 实体 ID
     * @returns 实体数据或 null
     */
    getCodeEntity(entityId: string): CodeEntityData | null {
        if (!this.graphDatabase.hasNode(entityId))
            return null;
        return this.graphDatabase.getNodeAttributes(entityId);
    }

    /**
     * 删除代码实体
     * @param entityId 实体 ID
     * @returns 是否成功删除
     */
    removeEntity(entityId: string): boolean {
        try {
            if (!this.graphDatabase.hasNode(entityId)) {
                return false;
            }
            const entityData = this.graphDatabase.getNodeAttributes(entityId);
            this.graphDatabase.dropNode(entityId);
            this.entityTypeIndex.get(entityData.type)?.delete(entityId);
            applicationLogger.debug(`Removed code entity: ${entityId}`);
            this.emitChangeEvent('entity-removed');
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new KnowledgeGraphError(`Failed to remove code entity: ${errorMessage}`, {
                cause: error,
                metadata: { entityId }
            });
        }
    }

    /**
     * 删除代码关系
     * @param relationId 关系 ID
     * @returns 是否成功删除
     */
    removeRelation(relationId: string): boolean {
        try {
            if (!this.graphDatabase.hasEdge(relationId)) {
                return false;
            }
            this.graphDatabase.dropEdge(relationId);
            applicationLogger.debug(`Removed code relation: ${relationId}`);
            this.emitChangeEvent('relation-removed');
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new KnowledgeGraphError(`Failed to remove code relation: ${errorMessage}`, {
                cause: error,
                metadata: { relationId }
            });
        }
    }

    /**
     * 获取代码关系数据
     * @param relationId 关系 ID
     * @returns 包含源、目标和关系数据的对象或 null
     */
    getCodeRelation(relationId: string): {
        sourceEntityId: string;
        targetEntityId: string;
        relationData: CodeRelationData;
    } | null {
        if (!this.graphDatabase.hasEdge(relationId))
            return null;
        return {
            sourceEntityId: this.graphDatabase.source(relationId),
            targetEntityId: this.graphDatabase.target(relationId),
            relationData: this.graphDatabase.getEdgeAttributes(relationId)
        };
    }

    /**
     * 按类型获取代码实体
     * @param entityType 实体类型
     * @returns 实体 ID 和数据的数组
     */
    getCodeEntitiesByType(entityType: CodeEntityType): Array<{
        entityId: string;
        entityData: CodeEntityData;
    }> {
        const entityIds = this.entityTypeIndex.get(entityType) || new Set();
        return Array.from(entityIds).map(entityId => ({
            entityId,
            entityData: this.graphDatabase.getNodeAttributes(entityId)
        }));
    }

    /**
     * 按文件路径获取代码实体
     * @param filePath 文件路径
     * @returns 实体 ID 和数据的数组
     */
    getCodeEntitiesByFile(filePath: string): Array<{
        entityId: string;
        entityData: CodeEntityData;
    }> {
        const result: Array<{
            entityId: string;
            entityData: CodeEntityData;
        }> = [];
        
        this.graphDatabase.forEachNode((nodeId, attributes) => {
            if (attributes && attributes.filePath === filePath) {
                result.push({
                    entityId: nodeId,
                    entityData: attributes
                });
            }
        });
        
        return result;
    }

    /**
     * 获取实体的出边关系
     * @param entityId 实体 ID
     * @returns 关系数组
     */
    getOutgoingRelations(entityId: string): Array<{
        relationId: string;
        targetEntityId: string;
        relationData: CodeRelationData;
    }> {
        const relationIds = this.graphDatabase.outEdges(entityId);
        return relationIds.map(relationId => ({
            relationId,
            targetEntityId: this.graphDatabase.target(relationId),
            relationData: this.graphDatabase.getEdgeAttributes(relationId)
        }));
    }

    /**
     * 获取实体的入边关系
     * @param entityId 实体 ID
     * @returns 关系数组
     */
    getIncomingRelations(entityId: string): Array<{
        relationId: string;
        sourceEntityId: string;
        relationData: CodeRelationData;
    }> {
        const relationIds = this.graphDatabase.inEdges(entityId);
        return relationIds.map(relationId => ({
            relationId,
            sourceEntityId: this.graphDatabase.source(relationId),
            relationData: this.graphDatabase.getEdgeAttributes(relationId)
        }));
    }

    /**
     * 按名称搜索代码实体
     * @param name 要搜索的名称
     * @param entityType 可选的实体类型过滤
     * @returns 匹配的实体数组
     */
    searchCodeEntitiesByName(name: string, entityType?: CodeEntityType): Array<{
        entityId: string;
        entityData: CodeEntityData;
    }> {
        let results: Array<{ entityId: string; entityData: CodeEntityData }> = [];
        const searchEntity = (entityId: string) => {
            const entityData = this.graphDatabase.getNodeAttributes(entityId);
            let entityName = '';
            if ('fileName' in entityData)
                entityName = entityData.fileName;
            else if ('className' in entityData)
                entityName = entityData.className;
            else if ('functionName' in entityData)
                entityName = entityData.functionName;
            else if ('variableName' in entityData)
                entityName = entityData.variableName;
            else if ('interfaceName' in entityData)
                entityName = entityData.interfaceName;
            else if ('enumName' in entityData)
                entityName = entityData.enumName;
            else if ('entityName' in entityData)
                entityName = entityData.entityName;
            if (entityName === name && (!entityType || entityData.type === entityType)) {
                results.push({ entityId, entityData });
            }
        };
        if (entityType) {
            const entityIds = this.entityTypeIndex.get(entityType) || new Set();
            entityIds.forEach(searchEntity);
        }
        else {
            this.graphDatabase.forEachNode(searchEntity);
        }
        return results;
    }

    /**
     * 获取知识图谱统计信息
     * @returns 统计信息对象
     */
    getStatistics(): KnowledgeGraphStatistics {
        const entityCountByType: Record<string, number> = {};
        const relationCountByType: Record<string, number> = {};
        Object.values(CodeEntityType).forEach(entityType => {
            entityCountByType[entityType] = 0;
        });
        Object.values(CodeRelationType).forEach(relationType => {
            relationCountByType[relationType] = 0;
        });
        this.graphDatabase.forEachNode((_entityId, entityAttributes) => {
            const type = entityAttributes.type;
            entityCountByType[type] = (entityCountByType[type] || 0) + 1;
        });
        this.graphDatabase.forEachEdge((_relationId, relationAttributes) => {
            const type = relationAttributes.type;
            relationCountByType[type] = (relationCountByType[type] || 0) + 1;
        });
        return {
            totalEntityCount: this.graphDatabase.order,
            totalRelationCount: this.graphDatabase.size,
            entityCountByType,
            relationCountByType,
            fileEntityCount: entityCountByType[CodeEntityType.FILE],
            functionEntityCount: entityCountByType[CodeEntityType.FUNCTION],
            classEntityCount: entityCountByType[CodeEntityType.CLASS]
        };
    }

    /**
     * 将知识图谱保存到文件
     * @param filePath 保存路径（可选）
     */
    async saveToFileSystem(filePath?: string): Promise<void> {
        if (!this.databaseOptions.persistToFileSystem)
            return;
        const savePath = filePath || path.join(this.databaseOptions.dataDirectory, 'knowledge-graph.json');
        const directoryPath = path.dirname(savePath);
        ensureDirectoryExists(directoryPath);
        const graphData = this.graphDatabase.export();
        fs.writeFileSync(savePath, JSON.stringify(graphData, null, 2));
        applicationLogger.info(`Knowledge graph saved to: ${savePath}`);
    }

    /**
     * 从文件加载知识图谱
     * @param filePath 加载路径（可选）
     */
    async loadFromFileSystem(filePath?: string): Promise<void> {
        const loadPath = filePath || path.join(this.databaseOptions.dataDirectory, 'knowledge-graph.json');
        if (!fs.existsSync(loadPath)) {
            applicationLogger.warn(`Knowledge graph file not found: ${loadPath}`);
            return;
        }
        const graphData = JSON.parse(fs.readFileSync(loadPath, 'utf-8'));
        this.graphDatabase = Graphology.MultiDirectedGraph.from(graphData);
        this.rebuildEntityTypeIndex();
        applicationLogger.info(`Knowledge graph loaded from: ${loadPath}`);
    }

    /** 重建实体类型索引 */
    private rebuildEntityTypeIndex() {
        this.initializeEntityTypeIndex();
        this.graphDatabase.forEachNode((entityId, entityAttributes) => {
            this.entityTypeIndex.get(entityAttributes.type)?.add(entityId);
        });
    }

    /** 添加代码解析结果 */
    addParsingResult(parsingResult: CodeParsingResult): void {
        applicationLogger.info(`Adding ${parsingResult.codeEntities.length} entities and ${parsingResult.codeRelations.length} relations to graph`);
        for (const { entityId, entityData } of parsingResult.codeEntities) {
            this.addCodeEntity(entityId, entityData);
        }
        for (const { relationId, sourceEntityId, targetEntityId, relationData } of parsingResult.codeRelations) {
            this.addCodeRelation(relationId, sourceEntityId, targetEntityId, relationData);
        }
    }

    /** 清空知识图谱 */
    clear(): void {
        this.graphDatabase.clear();
        this.initializeEntityTypeIndex();
        applicationLogger.debug('Knowledge graph cleared');
        this.emitChangeEvent('graph-cleared');
    }

    /**
     * 批量添加代码实体（性能优化）
     * @param entities 实体数组
     */
    batchAddCodeEntities(entities: Array<{ entityId: string, entityData: CodeEntityData }>): number {
        const startTime = Date.now();
        let successCount = 0;

        for (const { entityId, entityData } of entities) {
            try {
                if (!entityData || typeof entityData !== 'object') {
                    continue;
                }

                if (!Object.values(CodeEntityType).includes(entityData.type)) {
                    continue;
                }

                if (this.graphDatabase.hasNode(entityId)) {
                    // 实体已存在，先检查并清理旧类型索引
                    const existingData = this.graphDatabase.getNodeAttributes(entityId);
                    if (existingData && existingData.type !== entityData.type) {
                        // 类型已变更，从旧类型索引中删除
                        this.entityTypeIndex.get(existingData.type)?.delete(entityId);
                        applicationLogger.debug(`Entity ${entityId} type changed from ${existingData.type} to ${entityData.type} (batch)`);
                    }
                    this.graphDatabase.mergeNodeAttributes(entityId, entityData);
                }
                else {
                    this.graphDatabase.addNode(entityId, entityData);
                }
                this.entityTypeIndex.get(entityData.type)?.add(entityId);
                successCount++;
            }
            catch (error) {
                // 单个失败不影响其他
            }
        }

        const duration = Date.now() - startTime;
        applicationLogger.debug(`Batch added ${successCount}/${entities.length} entities in ${duration}ms`);
        if (successCount > 0) {
            this.emitChangeEvent('entity-added');
        }
        return successCount;
    }

    /**
     * 批量添加代码关系（性能优化）
     * @param relations 关系数组
     */
    batchAddCodeRelations(relations: Array<{ relationId: string, sourceEntityId: string, targetEntityId: string, relationData: CodeRelationData }>): number {
        const startTime = Date.now();
        let successCount = 0;

        for (const { relationId, sourceEntityId, targetEntityId, relationData } of relations) {
            try {
                if (!this.graphDatabase.hasNode(sourceEntityId)) {
                    continue;
                }

                if (!this.graphDatabase.hasNode(targetEntityId)) {
                    this.graphDatabase.addNode(targetEntityId, {
                        type: CodeEntityType.UNKNOWN,
                        entityName: targetEntityId
                    } as unknown as CodeEntityData);
                }

                if (this.graphDatabase.hasEdge(relationId)) {
                    this.graphDatabase.mergeEdgeAttributes(relationId, relationData);
                }
                else {
                    this.graphDatabase.addEdgeWithKey(relationId, sourceEntityId, targetEntityId, relationData);
                }
                successCount++;
            }
            catch (error) {
                // 单个失败不影响其他
            }
        }

        const duration = Date.now() - startTime;
        applicationLogger.debug(`Batch added ${successCount}/${relations.length} relations in ${duration}ms`);
        if (successCount > 0) {
            this.emitChangeEvent('relation-added');
        }
        return successCount;
    }

    /**
     * 获取当前数据库性能统计
     */
    getPerformanceMetrics(): {
        totalNodes: number,
        totalEdges: number,
        entityTypeBreakdown: Record<CodeEntityType, number>,
        relationTypeBreakdown: Record<CodeRelationType, number>
    } {
        const entityTypeBreakdown = {} as Record<CodeEntityType, number>;
        const relationTypeBreakdown = {} as Record<CodeRelationType, number>;

        Object.values(CodeEntityType).forEach(type => {
            entityTypeBreakdown[type] = 0;
        });
        Object.values(CodeRelationType).forEach(type => {
            relationTypeBreakdown[type] = 0;
        });

        this.graphDatabase.forEachNode((_, attributes) => {
            entityTypeBreakdown[attributes.type] = (entityTypeBreakdown[attributes.type] || 0) + 1;
        });
        this.graphDatabase.forEachEdge((_, attributes) => {
            relationTypeBreakdown[attributes.type] = (relationTypeBreakdown[attributes.type] || 0) + 1;
        });

        return {
            totalNodes: this.graphDatabase.order,
            totalEdges: this.graphDatabase.size,
            entityTypeBreakdown,
            relationTypeBreakdown
        };
    }
}
