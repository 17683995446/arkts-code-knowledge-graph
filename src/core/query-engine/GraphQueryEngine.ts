import { CodeEntityData, CodeRelationData, CodeEntityType, KnowledgeGraphStatistics, CallChainPath, ClassInheritanceHierarchy } from '../../shared/index.js';
import { KnowledgeGraphDatabase } from '../knowledge-graph/index.js';
import { CodeRelationType } from '../../shared/index.js';

/** 查询缓存配置 */
interface QueryCacheConfig {
    enabled?: boolean;
    maxSize?: number;
    ttl?: number;
    maxItemSizeBytes?: number;
}

/** 知识图谱查询引擎 */
export class GraphQueryEngine {
    private graphDatabase: KnowledgeGraphDatabase;
    private queryCache: Map<string, { data: any; timestamp: number; lastAccessed: number }> = new Map();
    private cacheConfig: QueryCacheConfig = {
        enabled: true,
        maxSize: 200, // 显著减少缓存大小
        ttl: 60000,  // 1分钟TTL
        maxItemSizeBytes: 50 * 1024  // 最大50KB每个缓存项
    };
    private onGraphChangeCallback: (() => void) | null = null;

    constructor(graphDatabase: KnowledgeGraphDatabase, cacheConfig?: QueryCacheConfig) {
        this.graphDatabase = graphDatabase;
        if (cacheConfig) {
            this.cacheConfig = { ...this.cacheConfig, ...cacheConfig };
        }
        this.setupChangeListeners();
    }

    /**
     * 设置图谱变更监听器
     */
    private setupChangeListeners() {
        this.onGraphChangeCallback = () => {
            this.clearCache();
        };
        const events: Array<'entity-added' | 'entity-removed' | 'relation-added' | 'relation-removed' | 'graph-cleared'> = 
            ['entity-added', 'entity-removed', 'relation-added', 'relation-removed', 'graph-cleared'];
        events.forEach(event => {
            this.graphDatabase.addChangeListener(event, this.onGraphChangeCallback!);
        });
    }

    /**
     * 销毁查询引擎，清理监听器
     */
    destroy() {
        if (this.onGraphChangeCallback) {
            const events: Array<'entity-added' | 'entity-removed' | 'relation-added' | 'relation-removed' | 'graph-cleared'> = 
                ['entity-added', 'entity-removed', 'relation-added', 'relation-removed', 'graph-cleared'];
            events.forEach(event => {
                this.graphDatabase.removeChangeListener(event, this.onGraphChangeCallback!);
            });
            this.onGraphChangeCallback = null;
        }
    }

    /**
     * 配置查询缓存
     * @param config 缓存配置
     */
    configureCache(config: QueryCacheConfig): void {
        this.cacheConfig = { ...this.cacheConfig, ...config };
        if (!this.cacheConfig.enabled) {
            this.clearCache();
        }
    }

    /**
     * 清空查询缓存
     */
    clearCache(): void {
        this.queryCache.clear();
    }

    /**
     * 获取缓存统计信息
     */
    getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
        return {
            size: this.queryCache.size,
            maxSize: this.cacheConfig.maxSize || 200
        };
    }

    /**
     * 清理过期的缓存项
     */
    private cleanExpiredCache(): void {
        const now = Date.now();
        const ttl = this.cacheConfig.ttl || 60000;
        
        for (const [key, value] of this.queryCache.entries()) {
            if (now - value.timestamp > ttl) {
                this.queryCache.delete(key);
            }
        }
    }

    private getCacheKey(method: string, args: any[]): string {
        return `${method}:${JSON.stringify(args)}`;
    }

    /**
     * 估算对象大小
     */
    private estimateSize(obj: any): number {
        try {
            const str = JSON.stringify(obj);
            return str.length * 2; // 估算 UTF-16 字符大小
        } catch {
            // 如果估算失败，返回默认大小
            return 1024;
        }
    }

    private getFromCache<T>(key: string): T | null {
        if (!this.cacheConfig.enabled) return null;
        
        const cached = this.queryCache.get(key);
        if (!cached) return null;
        
        const age = Date.now() - cached.timestamp;
        if (age > (this.cacheConfig.ttl || 60000)) {
            this.queryCache.delete(key);
            return null;
        }
        
        // 更新最后访问时间
        cached.lastAccessed = Date.now();
        
        return cached.data as T;
    }

    private setToCache<T>(key: string, data: T): void {
        if (!this.cacheConfig.enabled) return;
        
        // 先清理过期项
        this.cleanExpiredCache();
        
        // 检查大小限制
        const itemSize = this.estimateSize(data);
        if (itemSize > (this.cacheConfig.maxItemSizeBytes || 50 * 1024)) {
            return; // 过大的项目不缓存
        }
        
        // 移除最少使用的项
        while (this.queryCache.size >= (this.cacheConfig.maxSize || 200)) {
            let oldestKey: string | undefined;
            let oldestTime = Date.now();
            
            for (const [k, v] of this.queryCache.entries()) {
                if (v.lastAccessed < oldestTime) {
                    oldestTime = v.lastAccessed;
                    oldestKey = k;
                }
            }
            
            if (oldestKey) {
                this.queryCache.delete(oldestKey);
            } else {
                break;
            }
        }
        
        this.queryCache.set(key, { 
            data, 
            timestamp: Date.now(), 
            lastAccessed: Date.now() 
        });
    }

    /**
     * 获取知识图谱统计信息
     */
    getStatistics(): KnowledgeGraphStatistics {
        const cacheKey = this.getCacheKey('getStatistics', []);
        const cached = this.getFromCache<KnowledgeGraphStatistics>(cacheKey);
        if (cached) return cached;
        
        const result = this.graphDatabase.getStatistics();
        this.setToCache(cacheKey, result);
        return result;
    }

    /**
     * 按名称搜索代码实体
     * @param name 要搜索的名称
     * @param entityType 可选的实体类型过滤
     */
    searchEntitiesByName(name: string, entityType?: CodeEntityType): Array<{
        entityId: string;
        entityData: CodeEntityData;
    }> {
        const cacheKey = this.getCacheKey('searchEntitiesByName', [name, entityType]);
        const cached = this.getFromCache<any[]>(cacheKey);
        if (cached) return cached;
        
        const result = this.graphDatabase.searchCodeEntitiesByName(name, entityType);
        this.setToCache(cacheKey, result);
        return result;
    }

    /**
     * 获取代码实体
     * @param entityId 实体 ID
     */
    getEntity(entityId: string): CodeEntityData | null {
        const cacheKey = this.getCacheKey('getEntity', [entityId]);
        const cached = this.getFromCache<CodeEntityData | null>(cacheKey);
        if (cached !== null) return cached;
        
        const result = this.graphDatabase.getCodeEntity(entityId);
        this.setToCache(cacheKey, result);
        return result;
    }

    /**
     * 按类型获取代码实体
     * @param entityType 实体类型
     */
    getEntitiesByType(entityType: CodeEntityType): Array<{
        entityId: string;
        entityData: CodeEntityData;
    }> {
        const cacheKey = this.getCacheKey('getEntitiesByType', [entityType]);
        const cached = this.getFromCache<any[]>(cacheKey);
        if (cached) return cached;
        
        const result = this.graphDatabase.getCodeEntitiesByType(entityType);
        this.setToCache(cacheKey, result);
        return result;
    }

    /**
     * 按文件路径获取代码实体
     * @param filePath 文件路径
     */
    getEntitiesByFile(filePath: string): Array<{
        entityId: string;
        entityData: CodeEntityData;
    }> {
        return this.graphDatabase.getCodeEntitiesByFile(filePath);
    }

    /**
     * 获取实体的调用关系
     * @param entityId 实体 ID
     */
    getCallRelations(entityId: string): Array<{
        relationId: string;
        targetEntityId: string;
        relationData: CodeRelationData;
    }> {
        const outgoingRelations = this.graphDatabase.getOutgoingRelations(entityId);
        return outgoingRelations.filter(rel => rel.relationData.type === CodeRelationType.CALLS);
    }

    /**
     * 获取实体的依赖关系
     * @param entityId 实体 ID
     */
    getDependencyRelations(entityId: string): Array<{
        relationId: string;
        targetEntityId: string;
        relationData: CodeRelationData;
    }> {
        const outgoingRelations = this.graphDatabase.getOutgoingRelations(entityId);
        return outgoingRelations.filter(rel => rel.relationData.type === CodeRelationType.IMPORTS ||
            rel.relationData.type === CodeRelationType.DEPENDS_ON);
    }

    /**
     * 获取调用链（DFS）
     * @param startEntityId 起始实体 ID
     * @param maxDepth 最大深度
     */
    getCallChain(startEntityId: string, maxDepth: number = 5): CallChainPath {
        const path: any[] = [];
        const visited = new Set();
        const dfs = (entityId: string, depth: number, relation?: CodeRelationData) => {
            if (depth > maxDepth || visited.has(entityId))
                return;
            visited.add(entityId);
            const entityData = this.graphDatabase.getCodeEntity(entityId);
            if (entityData) {
                path.push({ entityId, entityData, relation });
            }
            const callRelations = this.getCallRelations(entityId);
            for (const callRel of callRelations) {
                dfs(callRel.targetEntityId, depth + 1, callRel.relationData);
            }
        };
        dfs(startEntityId, 0);
        return {
            chainId: `call-chain-${startEntityId}`,
            path,
            depth: path.length - 1
        };
    }

    /**
     * 获取类继承层次结构
     * @param classEntityId 类实体 ID
     */
    getClassInheritanceHierarchy(classEntityId: string): ClassInheritanceHierarchy | null {
        const classEntityData = this.graphDatabase.getCodeEntity(classEntityId);
        if (!classEntityData || classEntityData.type !== CodeEntityType.CLASS) {
            return null;
        }

        const ancestorClasses: any[] = [];
        const descendantClasses: any[] = [];

        let currentEntityId = classEntityId;
        let visited = new Set();
        while (!visited.has(currentEntityId)) {
            visited.add(currentEntityId);
            const incomingExtendsRelations = this.graphDatabase.getOutgoingRelations(currentEntityId)
                .filter(rel => rel.relationData.type === CodeRelationType.EXTENDS);
            if (incomingExtendsRelations.length > 0) {
                const extendsRel = incomingExtendsRelations[0];
                const ancestorEntityData = this.graphDatabase.getCodeEntity(extendsRel.targetEntityId);
                if (ancestorEntityData && ancestorEntityData.type === CodeEntityType.CLASS) {
                    ancestorClasses.push({
                        entityId: extendsRel.targetEntityId,
                        entityData: ancestorEntityData,
                        relation: extendsRel.relationData
                    });
                    currentEntityId = extendsRel.targetEntityId;
                }
                else {
                    break;
                }
            }
            else {
                break;
            }
        }

        const allClassEntities = this.graphDatabase.getCodeEntitiesByType(CodeEntityType.CLASS);
        for (const { entityId, entityData } of allClassEntities) {
            if (entityId === classEntityId)
                continue;
            const outgoingExtendsRelations = this.graphDatabase.getOutgoingRelations(entityId)
                .filter(rel => rel.relationData.type === CodeRelationType.EXTENDS);
            for (const extendsRel of outgoingExtendsRelations) {
                if (extendsRel.targetEntityId === classEntityId) {
                    descendantClasses.push({
                        entityId,
                        entityData,
                        relation: extendsRel.relationData
                    });
                }
            }
        }

        return {
            classEntityId,
            classEntityData,
            ancestorClasses,
            descendantClasses
        };
    }
}
