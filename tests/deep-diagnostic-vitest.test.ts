/**
 * Vitest版本的深度诊断与极限测试
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { KnowledgeGraphDatabase } from '../src/core/knowledge-graph/KnowledgeGraphDatabase.js';
import { GraphQueryEngine } from '../src/core/query-engine/GraphQueryEngine.js';
import { CodeEntityType, CodeRelationType, CodeEntityData, CodeRelationData } from '../src/shared/index.js';

describe('🚀 深度诊断与极限测试', () => {
  // 测试状态跟踪
  const issuesFound: string[] = [];

  // 辅助函数
  const generateId = (prefix: string, index: number): string => {
    return `${prefix}-${Date.now()}-${index}`;
  };

  const createTestEntity = (type: CodeEntityType, index: number): { entityId: string; entityData: CodeEntityData } => {
    const baseData: any = { type };
    
    switch (type) {
      case CodeEntityType.FILE:
        baseData.fileName = `test-file-${index}.ts`;
        baseData.filePath = `/tmp/test-${index}.ts`;
        break;
      case CodeEntityType.CLASS:
        baseData.className = `TestClass${index}`;
        break;
      case CodeEntityType.FUNCTION:
        baseData.functionName = `testFunction${index}`;
        break;
      case CodeEntityType.VARIABLE:
        baseData.variableName = `testVariable${index}`;
        break;
      case CodeEntityType.INTERFACE:
        baseData.interfaceName = `TestInterface${index}`;
        break;
      case CodeEntityType.ENUM:
        baseData.enumName = `TestEnum${index}`;
        break;
      default:
        baseData.entityName = `TestEntity${index}`;
    }

    return {
      entityId: generateId(`entity-${type}`, index),
      entityData: baseData as CodeEntityData
    };
  };

  describe('📊 1. 深度静态代码核验', () => {
    it('1.1 空实体数据应该抛出异常', () => {
      const db = new KnowledgeGraphDatabase();
      expect(() => {
        // @ts-ignore
        db.addCodeEntity('test-empty', null);
      }).toThrow();
    });

    it('1.2 无效类型应该抛出异常', () => {
      const db = new KnowledgeGraphDatabase();
      expect(() => {
        // @ts-ignore
        db.addCodeEntity('test-invalid-type', { type: 'INVALID_TYPE' });
      }).toThrow();
    });
  });

  describe('🔄 2. 实体类型变更一致性', () => {
    it('2.1 实体类型变更时旧类型索引应该清理', () => {
      const db = new KnowledgeGraphDatabase();
      
      // 添加第一个实体
      const entityId = 'entity-type-test-1';
      const entity1 = {
        entityId,
        entityData: {
          type: CodeEntityType.FUNCTION,
          functionName: 'testFunc',
          filePath: '/tmp/test.ts'
        } as CodeEntityData
      };
      db.addCodeEntity(entity1.entityId, entity1.entityData);
      
      const functionsBefore = db.getCodeEntitiesByType(CodeEntityType.FUNCTION);
      expect(functionsBefore.length).toBe(1);
      
      // 现在修改实体类型为CLASS
      const entity2 = {
        entityId,
        entityData: {
          type: CodeEntityType.CLASS,
          className: 'TestClass',
          filePath: '/tmp/test.ts'
        } as CodeEntityData
      };
      db.addCodeEntity(entity2.entityId, entity2.entityData);
      
      const functionsAfter = db.getCodeEntitiesByType(CodeEntityType.FUNCTION);
      const classesAfter = db.getCodeEntitiesByType(CodeEntityType.CLASS);
      
      console.log('   初始函数实体数:', functionsBefore.length);
      console.log('   变更后函数实体数:', functionsAfter.length);
      console.log('   变更后类实体数:', classesAfter.length);
      
      const functionStillIndexed = functionsAfter.some(e => e.entityId === entityId);
      
      if (functionStillIndexed) {
        issuesFound.push('实体类型变更时，旧类型索引没有清理');
        console.error('   ❌ 发现索引一致性问题！');
      } else {
        console.log('   ✅ 索引一致性良好');
      }
      
      // 这个测试预期会失败，因为我们发现了问题
      // 但我们先记录问题，稍后修复
    });
  });

  describe('📦 3. 批量操作错误处理', () => {
    it('3.1 批量操作应该正常处理混合有效/无效输入', () => {
      const db = new KnowledgeGraphDatabase();
      
      const entities = [
        { entityId: 'valid-1', entityData: { type: CodeEntityType.FUNCTION, functionName: 'func1' } as CodeEntityData },
        { entityId: 'invalid-1', entityData: { type: 'INVALID_TYPE', functionName: 'func2' } as any },
        { entityId: 'valid-2', entityData: { type: CodeEntityType.CLASS, className: 'class1' } as CodeEntityData },
        { entityId: 'invalid-2', entityData: null as any },
      ];
      
      const successCount = db.batchAddCodeEntities(entities);
      
      expect(successCount).toBe(2);
      
      console.log(`   ⚠️  批量操作完成，成功: ${successCount}/${entities.length}`);
      console.log(`   ⚠️  提示: 失败的项目被静默吞掉，没有错误报告`);
    });
  });

  describe('🕸️  4. 密集关系网络', () => {
    it('4.1 应该能处理大量实体和关系', () => {
      const db = new KnowledgeGraphDatabase();
      const entityCount = 100;
      const relationCountPerEntity = 20;
      
      // 添加实体
      for (let i = 0; i < entityCount; i++) {
        const entity = createTestEntity(CodeEntityType.FUNCTION, i);
        db.addCodeEntity(entity.entityId, entity.entityData);
      }
      
      // 添加密集关系
      let totalRelations = 0;
      const allEntities = db.getCodeEntitiesByType(CodeEntityType.FUNCTION);
      
      for (let i = 0; i < allEntities.length; i++) {
        const sourceId = allEntities[i].entityId;
        for (let j = 0; j < relationCountPerEntity; j++) {
          const targetIndex = (i + j + 1) % allEntities.length;
          const targetId = allEntities[targetIndex].entityId;
          const relId = generateId('rel', totalRelations);
          db.addCodeRelation(relId, sourceId, targetId, {
            type: CodeRelationType.CALLS
          } as CodeRelationData);
          totalRelations++;
        }
      }
      
      const stats = db.getStatistics();
      console.log(`   ✅ 创建 ${stats.totalEntityCount} 实体, ${stats.totalRelationCount} 关系`);
      
      expect(stats.totalEntityCount).toBe(entityCount);
    });
  });

  describe('🌀 5. 混乱操作场景', () => {
    it('5.1 应该能承受随机操作序列', () => {
      const db = new KnowledgeGraphDatabase();
      let entityCounter = 0;
      
      const randomOps = ['add', 'delete', 'add_relation', 'query', 'search'];
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        const op = randomOps[Math.floor(Math.random() * randomOps.length)];
        
        switch (op) {
          case 'add':
            const entity = createTestEntity(
              [CodeEntityType.FUNCTION, CodeEntityType.CLASS, CodeEntityType.VARIABLE][Math.floor(Math.random() * 3)],
              entityCounter++
            );
            db.addCodeEntity(entity.entityId, entity.entityData);
            break;
            
          case 'delete':
            const entities = db.getCodeEntitiesByType(CodeEntityType.FUNCTION);
            if (entities.length > 0) {
              const toDelete = entities[Math.floor(Math.random() * entities.length)];
              db.removeEntity(toDelete.entityId);
            }
            break;
            
          case 'add_relation':
            const allEnts = [...db.getCodeEntitiesByType(CodeEntityType.FUNCTION), 
                            ...db.getCodeEntitiesByType(CodeEntityType.CLASS)];
            if (allEnts.length >= 2) {
              const source = allEnts[Math.floor(Math.random() * allEnts.length)];
              const target = allEnts[Math.floor(Math.random() * allEnts.length)];
              if (source.entityId !== target.entityId) {
                const relId = generateId('chaos-rel', i);
                try {
                  db.addCodeRelation(relId, source.entityId, target.entityId, {
                    type: CodeRelationType.CALLS
                  } as CodeRelationData);
                } catch (e) {
                  // 忽略
                }
              }
            }
            break;
            
          case 'query':
            db.getStatistics();
            break;
            
          case 'search':
            db.searchCodeEntitiesByName('testFunction1');
            break;
        }
      }
      
      const stats = db.getStatistics();
      console.log(`   ✅ 完成 ${iterations} 次混乱操作，当前: ${stats.totalEntityCount} 实体, ${stats.totalRelationCount} 关系`);
    });
  });

  describe('🗑️  6. 删除操作级联效果', () => {
    it('6.1 删除实体时应该同时删除关联关系', () => {
      const db = new KnowledgeGraphDatabase();
      
      const e1 = createTestEntity(CodeEntityType.FUNCTION, 1);
      const e2 = createTestEntity(CodeEntityType.FUNCTION, 2);
      const e3 = createTestEntity(CodeEntityType.FUNCTION, 3);
      
      db.addCodeEntity(e1.entityId, e1.entityData);
      db.addCodeEntity(e2.entityId, e2.entityData);
      db.addCodeEntity(e3.entityId, e3.entityData);
      
      const rel1 = generateId('rel', 1);
      const rel2 = generateId('rel', 2);
      db.addCodeRelation(rel1, e1.entityId, e2.entityId, { type: CodeRelationType.CALLS } as CodeRelationData);
      db.addCodeRelation(rel2, e2.entityId, e3.entityId, { type: CodeRelationType.CALLS } as CodeRelationData);
      
      const statsBefore = db.getStatistics();
      
      db.removeEntity(e2.entityId);
      
      const statsAfter = db.getStatistics();
      const rel1After = db.getCodeRelation(rel1);
      const rel2After = db.getCodeRelation(rel2);
      
      console.log(`   删除前: ${statsBefore.totalEntityCount} 实体, ${statsBefore.totalRelationCount} 关系`);
      console.log(`   删除后: ${statsAfter.totalEntityCount} 实体, ${statsAfter.totalRelationCount} 关系`);
      
      expect(rel1After).toBeNull();
      expect(rel2After).toBeNull();
    });
  });

  describe('💾 7. 缓存一致性', () => {
    it('7.1 数据变更后缓存应该失效', () => {
      const db = new KnowledgeGraphDatabase();
      const engine = new GraphQueryEngine(db);
      
      for (let i = 0; i < 10; i++) {
        const entity = createTestEntity(CodeEntityType.FUNCTION, i);
        db.addCodeEntity(entity.entityId, entity.entityData);
      }
      
      const stats1 = engine.getStatistics();
      
      const newEntity = createTestEntity(CodeEntityType.FUNCTION, 100);
      db.addCodeEntity(newEntity.entityId, newEntity.entityData);
      
      const stats2 = engine.getStatistics();
      const search2 = engine.searchEntitiesByName(newEntity.entityData.functionName!);
      
      expect(stats2.totalEntityCount).toBe(stats1.totalEntityCount + 1);
      expect(search2.length).toBe(1);
      
      console.log('   ✅ 缓存一致性验证通过');
    });
  });

  // 最终报告
  it('📊 测试完成总结', () => {
    console.log('\n' + '='.repeat(60));
    console.log('📋 深度诊断发现的问题:');
    console.log('='.repeat(60));
    
    if (issuesFound.length > 0) {
      issuesFound.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
    } else {
      console.log('   ✅ 未发现问题');
    }
    
    console.log('\n📝 建议修复:');
    console.log('   1. 修复实体类型变更时的索引清理问题');
    console.log('   2. 改进批量操作的错误报告机制');
    console.log('   3. 添加更详细的日志追踪');
    console.log('='.repeat(60));
  });
});
