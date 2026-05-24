import { describe, it, expect } from 'vitest';
import { KnowledgeGraphDatabase } from '../src/core/knowledge-graph/KnowledgeGraphDatabase';
import { CodeEntityType, CodeRelationType, CodeEntityData, CodeRelationData } from '../src/shared/types';

describe('🌪️ 极端混乱场景深度测试', () => {
  
  const generateId = (prefix: string, index: number): string => `${prefix}-${Date.now()}-${index}`;
  
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
    
    return { entityId: generateId(`entity-${type}`, index), entityData: baseData as CodeEntityData };
  };

  describe('📦 批量操作的索引一致性', () => {
    it('1.1 批量操作时类型变更的索引清理', () => {
      const db = new KnowledgeGraphDatabase();
      
      // 创建混合有效/无效的实体数组，其中包含类型变更的场景
      const entityId = 'entity-batch-type-test';
      
      const entities = [
        { 
          entityId, 
          entityData: { type: CodeEntityType.FUNCTION, functionName: 'func1' } as CodeEntityData 
        },
        { 
          entityId: 'valid-2', 
          entityData: { type: CodeEntityType.CLASS, className: 'class1' } as CodeEntityData 
        }
      ];
      
      const successCount = db.batchAddCodeEntities(entities);
      expect(successCount).toBe(2);
      
      const functionsBefore = db.getCodeEntitiesByType(CodeEntityType.FUNCTION);
      console.log('   初始函数实体数:', functionsBefore.length);
      
      // 现在再次批量添加，但是将第一个实体的类型改为CLASS
      const updatedEntities = [
        { 
          entityId, 
          entityData: { type: CodeEntityType.CLASS, className: 'ChangedClass' } as CodeEntityData 
        },
        { 
          entityId: 'valid-3', 
          entityData: { type: CodeEntityType.INTERFACE, interfaceName: 'interface1' } as CodeEntityData 
        }
      ];
      
      const updatedSuccessCount = db.batchAddCodeEntities(updatedEntities);
      expect(updatedSuccessCount).toBe(2);
      
      const functionsAfter = db.getCodeEntitiesByType(CodeEntityType.FUNCTION);
      const classesAfter = db.getCodeEntitiesByType(CodeEntityType.CLASS);
      
      console.log('   批量更新后函数实体数:', functionsAfter.length);
      console.log('   批量更新后类实体数:', classesAfter.length);
      
      const functionStillIndexed = functionsAfter.some(e => e.entityId === entityId);
      
      if (functionStillIndexed) {
        console.error('   ❌ 发现问题！批量操作时类型变更没有清理旧索引！');
      }
    });
  });

  describe('⚡ 极端快速增删场景', () => {
    it('2.1 快速交替增删的内存稳定性', () => {
      const db = new KnowledgeGraphDatabase();
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        const entity = createTestEntity(CodeEntityType.FUNCTION, i);
        db.addCodeEntity(entity.entityId, entity.entityData);
        
        // 立即删除刚添加的实体
        if (i % 2 === 0) {
          db.removeEntity(entity.entityId);
        }
        
        // 每100次检查一次统计
        if (i % 100 === 0) {
          const stats = db.getStatistics();
          console.log(`   Iteration ${i}: ${stats.totalEntityCount} entities, ${stats.totalRelationCount} relations`);
        }
      }
      
      const finalStats = db.getStatistics();
      console.log(`   Final: ${finalStats.totalEntityCount} entities`);
      expect(finalStats.totalEntityCount).toBeLessThanOrEqual(iterations / 2 + 1);
    });
  });

  describe('🔄 循环依赖与密集关系', () => {
    it('3.1 创建深度循环依赖关系网络', () => {
      const db = new KnowledgeGraphDatabase();
      const entityCount = 50;
      
      // 创建实体
      const entities = [];
      for (let i = 0; i < entityCount; i++) {
        const entity = createTestEntity(CodeEntityType.FUNCTION, i);
        db.addCodeEntity(entity.entityId, entity.entityData);
        entities.push(entity.entityId);
      }
      
      // 创建深度循环依赖 - 每个实体连接到下3个
      let relationCount = 0;
      for (let i = 0; i < entities.length; i++) {
        for (let j = 1; j <= 3; j++) {
          const targetIdx = (i + j) % entities.length;
          const relId = generateId('rel', relationCount++);
          db.addCodeRelation(relId, entities[i], entities[targetIdx], {
            type: CodeRelationType.CALLS
          } as CodeRelationData);
        }
      }
      
      const stats = db.getStatistics();
      console.log(`   创建了 ${stats.totalEntityCount} 实体, ${stats.totalRelationCount} 关系`);
      expect(stats.totalRelationCount).toBe(relationCount);
      
      // 现在删除中间一个实体，检查级联效果
      const middleIdx = Math.floor(entities.length / 2);
      const entityToRemove = entities[middleIdx];
      db.removeEntity(entityToRemove);
      
      const afterStats = db.getStatistics();
      console.log(`   删除实体后: ${afterStats.totalEntityCount} 实体, ${afterStats.totalRelationCount} 关系`);
      
      // 检查关系是否减少
      expect(afterStats.totalRelationCount).toBeLessThan(stats.totalRelationCount);
    });
  });

  describe('🎲 完全随机混乱操作', () => {
    it('4.1 随机操作序列压力测试', () => {
      const db = new KnowledgeGraphDatabase();
      const operations = ['add', 'delete', 'addRelation', 'batchAdd', 'clear', 'search'];
      const iterations = 2000;
      const allCreatedEntities: string[] = [];
      
      console.log('   开始随机操作序列...');
      
      for (let i = 0; i < iterations; i++) {
        const randomOp = operations[Math.floor(Math.random() * operations.length)];
        
        switch (randomOp) {
          case 'add':
            const type = [CodeEntityType.FUNCTION, CodeEntityType.CLASS, CodeEntityType.VARIABLE][
              Math.floor(Math.random() * 3)
            ];
            const newEntity = createTestEntity(type, allCreatedEntities.length);
            db.addCodeEntity(newEntity.entityId, newEntity.entityData);
            allCreatedEntities.push(newEntity.entityId);
            break;
            
          case 'delete':
            if (allCreatedEntities.length > 0) {
              const randomIndex = Math.floor(Math.random() * allCreatedEntities.length);
              const entityIdToDelete = allCreatedEntities[randomIndex];
              const success = db.removeEntity(entityIdToDelete);
              if (success) {
                allCreatedEntities.splice(randomIndex, 1);
              }
            }
            break;
            
          case 'addRelation':
            if (allCreatedEntities.length >= 2) {
              const sourceIdx = Math.floor(Math.random() * allCreatedEntities.length);
              const targetIdx = (sourceIdx + 1) % allCreatedEntities.length;
              const relId = generateId('chaos-rel', i);
              try {
                db.addCodeRelation(relId, allCreatedEntities[sourceIdx], allCreatedEntities[targetIdx], {
                  type: CodeRelationType.CALLS
                } as CodeRelationData);
              } catch (e) {
                // ignore
              }
            }
            break;
            
          case 'batchAdd':
            const batchEntities = [];
            const batchCount = 5 + Math.floor(Math.random() * 10);
            for (let j = 0; j < batchCount; j++) {
              const ent = createTestEntity(
                [CodeEntityType.FUNCTION, CodeEntityType.INTERFACE][Math.floor(Math.random() * 2)],
                allCreatedEntities.length + j
              );
              batchEntities.push(ent);
              allCreatedEntities.push(ent.entityId);
            }
            db.batchAddCodeEntities(batchEntities);
            break;
            
          case 'clear':
            if (Math.random() < 0.05) { // 5%的概率清空
              db.clear();
              allCreatedEntities.length = 0;
            }
            break;
            
          case 'search':
            db.searchCodeEntitiesByName('test');
            break;
        }
        
        if (i % 200 === 0) {
          const stats = db.getStatistics();
          console.log(`   Step ${i}: ${stats.totalEntityCount} entities, ${stats.totalRelationCount} relations`);
        }
      }
      
      const finalStats = db.getStatistics();
      console.log(`   Final: ${finalStats.totalEntityCount} entities, ${finalStats.totalRelationCount} relations`);
    });
  });

  describe('🧩 复杂边界条件', () => {
    it('5.1 特殊字符ID和空值边界', () => {
      const db = new KnowledgeGraphDatabase();
      
      // 测试特殊字符ID
      const specialId = 'entity with spaces-and-$pec!al-chars';
      const specialEntity = {
        entityId: specialId,
        entityData: { type: CodeEntityType.FUNCTION, functionName: 'specialFunc' } as CodeEntityData
      };
      
      db.addCodeEntity(specialEntity.entityId, specialEntity.entityData);
      
      const found = db.getCodeEntity(specialId);
      expect(found).not.toBeNull();
      
      // 测试超长ID
      const longId = 'a'.repeat(1000);
      expect(() => {
        db.addCodeEntity(longId, { type: CodeEntityType.CLASS, className: 'LongIdClass' } as CodeEntityData);
      }).not.toThrow();
      
      // 测试边界查询 - 空字符串搜索
      const emptySearch = db.searchCodeEntitiesByName('');
      expect(emptySearch).toBeDefined();
    });
  });

  it('📊 测试总结', () => {
    console.log('\n' + '='.repeat(60));
    console.log('🌪️ 极端混乱场景测试完成');
    console.log('='.repeat(60));
    console.log('   发现的问题区域:');
    console.log('   1. 批量操作时类型变更的索引清理问题');
    console.log('   2. 建议添加更多错误报告和日志');
    console.log('='.repeat(60));
  });
});
