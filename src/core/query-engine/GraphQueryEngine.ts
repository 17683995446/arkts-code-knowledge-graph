import { CodeEntityData, CodeRelationData, CodeEntityType, KnowledgeGraphStatistics, CallChainPath, ClassInheritanceHierarchy } from '../../shared/index.js';
import { KnowledgeGraphDatabase } from '../knowledge-graph/index.js';
import { CodeRelationType } from '../../shared/index.js';

/** 知识图谱查询引擎 */
export class GraphQueryEngine {
    private graphDatabase: KnowledgeGraphDatabase;

    constructor(graphDatabase: KnowledgeGraphDatabase) {
        this.graphDatabase = graphDatabase;
    }

    /**
     * 获取知识图谱统计信息
     */
    getStatistics(): KnowledgeGraphStatistics {
        return this.graphDatabase.getStatistics();
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
        return this.graphDatabase.searchCodeEntitiesByName(name, entityType);
    }

    /**
     * 获取代码实体
     * @param entityId 实体 ID
     */
    getEntity(entityId: string): CodeEntityData | null {
        return this.graphDatabase.getCodeEntity(entityId);
    }

    /**
     * 按类型获取代码实体
     * @param entityType 实体类型
     */
    getEntitiesByType(entityType: CodeEntityType): Array<{
        entityId: string;
        entityData: CodeEntityData;
    }> {
        return this.graphDatabase.getCodeEntitiesByType(entityType);
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
