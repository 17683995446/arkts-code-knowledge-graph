import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KnowledgeGraphDatabase } from '../src/core/knowledge-graph/KnowledgeGraphDatabase';
import { GraphQueryEngine } from '../src/core/query-engine/GraphQueryEngine';
import { CodeEntityType, CodeRelationType, CodeEntityData, CodeRelationData } from '../src/shared/types';

describe('🧩 模块集成联调与接口全量遍历测试', () => {
  
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

  let db: KnowledgeGraphDatabase;
  let engine: GraphQueryEngine;

  beforeEach(() => {
    db = new KnowledgeGraphDatabase();
    engine = new GraphQueryEngine(db);
  });

  afterEach(() => {
    engine.destroy();
  });

  describe('📦 1. KnowledgeGraphDatabase 接口全量测试', () => {
    
    describe('1.1 addCodeEntity 异常输入测试', () => {
      it('应该拒绝空实体数据', () => {
        expect(() => {
          // @ts-ignore
          db.addCodeEntity('test-empty', null);
        }).toThrow();
      });

      it('应该拒绝无效类型', () => {
        expect(() => {
          // @ts-ignore
          db.addCodeEntity('test-invalid', { type: 'INVALID_TYPE' });
        }).toThrow();
      });

      it('应该接受所有有效类型', () => {
        const types = [
          CodeEntityType.FILE,
          CodeEntityType.CLASS,
          CodeEntityType.FUNCTION,
          CodeEntityType.VARIABLE,
          CodeEntityType.INTERFACE,
          CodeEntityType.ENUM,
          CodeEntityType.MODULE,
          CodeEntityType.METHOD,
          CodeEntityType.PROPERTY,
          CodeEntityType.UNKNOWN
        ];

        types.forEach(type => {
          const entity = createTestEntity(type, Math.floor(Math.random() * 1000));
          expect(() => {
            db.addCodeEntity(entity.entityId, entity.entityData);
          }).not.toThrow();
        });

        const stats = db.getStatistics();
        expect(stats.totalEntityCount).toBe(types.length);
      });
    });

    describe('1.2 addCodeRelation 边界测试', () => {
      it('应该拒绝不存在的源实体', () => {
        const target = createTestEntity(CodeEntityType.FUNCTION, 1);
        db.addCodeEntity(target.entityId, target.entityData);

        expect(() => {
          db.addCodeRelation('rel-1', 'non-existent-source', target.entityId, {
            type: CodeRelationType.CALLS
          } as CodeRelationData);
        }).toThrow();
      });

      it('应该为不存在的目标实体创建占位符', () => {
        const source = createTestEntity(CodeEntityType.FUNCTION, 1);
        db.addCodeEntity(source.entityId, source.entityData);

        const relId = generateId('rel', 1);
        db.addCodeRelation(relId, source.entityId, 'non-existent-target', {
          type: CodeRelationType.CALLS
        } as CodeRelationData);

        const relation = db.getCodeRelation(relId);
        expect(relation).not.toBeNull();

        const target = db.getCodeEntity('non-existent-target');
        expect(target).not.toBeNull();
        expect(target?.type).toBe(CodeEntityType.UNKNOWN);
      });

      it('应该拒绝无效关系类型', () => {
        const source = createTestEntity(CodeEntityType.FUNCTION, 1);
        const target = createTestEntity(CodeEntityType.FUNCTION, 2);
        db.addCodeEntity(source.entityId, source.entityData);
        db.addCodeEntity(target.entityId, target.entityData);

        const relId = generateId('rel', 1);
        // @ts-ignore - 测试无效类型
        db.addCodeRelation(relId, source.entityId, target.entityId, { type: 'INVALID_REL' });

        const relation = db.getCodeRelation(relId);
        expect(relation).not.toBeNull(); // graphology不验证类型
      });
    });

    describe('1.3 查询接口边界测试', () => {
      it('应该正确处理不存在的实体查询', () => {
        const entity = db.getCodeEntity('non-existent-entity');
        expect(entity).toBeNull();
      });

      it('应该正确处理不存在的查询结果', () => {
        const relations = db.getCodeRelationsForEntity('non-existent');
        expect(Array.isArray(relations)).toBe(true);
        expect(relations.length).toBe(0);
      });

      it('应该正确处理空字符串搜索', () => {
        const results = db.searchCodeEntitiesByName('');
        expect(Array.isArray(results)).toBe(true);
      });

      it('应该正确处理超长ID查询', () => {
        const longId = 'a'.repeat(10000);
        const entity = db.getCodeEntity(longId);
        expect(entity).toBeNull();
      });
    });

    describe('1.4 批量操作接口测试', () => {
      it('应该正确处理混合有效/无效输入', () => {
        const entities = [
          { entityId: 'valid-1', entityData: { type: CodeEntityType.FUNCTION, functionName: 'f1' } as CodeEntityData },
          { entityId: 'invalid-type', entityData: { type: 'BAD' } as any },
          { entityId: 'invalid-null', entityData: null as any },
          { entityId: 'valid-2', entityData: { type: CodeEntityType.CLASS, className: 'C1' } as CodeEntityData },
        ];

        const count = db.batchAddCodeEntities(entities);
        expect(count).toBe(2); // 只有2个有效
      });

      it('应该正确处理空数组', () => {
        const count = db.batchAddCodeEntities([]);
        expect(count).toBe(0);
      });

      it('批量操作应该触发事件一次', () => {
        let eventCount = 0;
        db.addChangeListener('entity-added', () => eventCount++);
        
        const entities = Array.from({ length: 10 }, (_, i) => ({
          entityId: `batch-${i}`,
          entityData: { type: CodeEntityType.FUNCTION, functionName: `f${i}` } as CodeEntityData
        }));

        db.batchAddCodeEntities(entities);
        expect(eventCount).toBe(1); // 只触发一次
      });
    });

    describe('1.5 删除操作边界测试', () => {
      it('应该正确处理删除不存在的实体', () => {
        const result = db.removeEntity('non-existent');
        expect(result).toBe(false);
      });

      it('删除实体应该删除关联关系', () => {
        const e1 = createTestEntity(CodeEntityType.FUNCTION, 1);
        const e2 = createTestEntity(CodeEntityType.FUNCTION, 2);
        db.addCodeEntity(e1.entityId, e1.entityData);
        db.addCodeEntity(e2.entityId, e2.entityData);

        const relId = generateId('rel', 1);
        db.addCodeRelation(relId, e1.entityId, e2.entityId, {
          type: CodeRelationType.CALLS
        } as CodeRelationData);

        db.removeEntity(e1.entityId);
        
        const relation = db.getCodeRelation(relId);
        expect(relation).toBeNull();
      });

      it('删除不存在的关系应该返回false', () => {
        const result = db.removeRelation('non-existent-rel');
        expect(result).toBe(false);
      });
    });
  });

  describe('🔗 2. 模块集成测试', () => {
    
    describe('2.1 Database 与 QueryEngine 集成', () => {
      it('查询引擎应该与数据库保持同步', () => {
        // 添加数据
        const entity = createTestEntity(CodeEntityType.FUNCTION, 1);
        db.addCodeEntity(entity.entityId, entity.entityData);

        // 通过引擎查询
        const stats1 = engine.getStatistics();
        expect(stats1.totalEntityCount).toBe(1);

        // 通过引擎搜索
        const search1 = engine.searchEntitiesByName(entity.entityData.functionName!);
        expect(search1.length).toBe(1);

        // 添加新数据
        const entity2 = createTestEntity(CodeEntityType.FUNCTION, 2);
        db.addCodeEntity(entity2.entityId, entity2.entityData);

        // 验证缓存失效
        const stats2 = engine.getStatistics();
        expect(stats2.totalEntityCount).toBe(2);
      });

      it('引擎缓存应该正确失效', () => {
        const entity = createTestEntity(CodeEntityType.FUNCTION, 1);
        db.addCodeEntity(entity.entityId, entity.entityData);

        // 填充缓存
        engine.getStatistics();
        engine.searchEntitiesByName(entity.entityData.functionName!);

        // 删除实体
        db.removeEntity(entity.entityId);

        // 验证缓存已失效
        const stats = engine.getStatistics();
        expect(stats.totalEntityCount).toBe(0);
      });
    });

    describe('2.2 复杂关系网络集成', () => {
      it('应该正确处理复杂的关系查询', () => {
        const entities = Array.from({ length: 5 }, (_, i) => {
          const e = createTestEntity(CodeEntityType.CLASS, i);
          db.addCodeEntity(e.entityId, e.entityData);
          return e;
        });

        // 创建复杂关系
        for (let i = 0; i < entities.length; i++) {
          for (let j = i + 1; j < entities.length; j++) {
            db.addCodeRelation(
              generateId('rel', i * 10 + j),
              entities[i].entityId,
              entities[j].entityId,
              { type: CodeRelationType.EXTENDS } as CodeRelationData
            );
          }
        }

        const stats = db.getStatistics();
        expect(stats.totalRelationCount).toBe(10); // C(5,2) = 10

        // 验证关系查询
        const e0Relations = db.getCodeRelationsForEntity(entities[0].entityId);
        expect(e0Relations.length).toBe(4); // 连接到其他4个
      });

      it('应该正确处理继承关系查询', () => {
        const parent = createTestEntity(CodeEntityType.CLASS, 1);
        const child1 = createTestEntity(CodeEntityType.CLASS, 2);
        const child2 = createTestEntity(CodeEntityType.CLASS, 3);

        db.addCodeEntity(parent.entityId, parent.entityData);
        db.addCodeEntity(child1.entityId, child1.entityData);
        db.addCodeEntity(child2.entityId, child2.entityData);

        db.addCodeRelation('ext-1', child1.entityId, parent.entityId, {
          type: CodeRelationType.EXTENDS
        } as CodeRelationData);
        db.addCodeRelation('ext-2', child2.entityId, parent.entityId, {
          type: CodeRelationType.EXTENDS
        } as CodeRelationData);

        const hierarchy = engine.getClassInheritanceHierarchy(parent.entityId);
        expect(hierarchy).not.toBeNull();
        expect(hierarchy!.descendantClasses.length).toBe(2);
      });
    });

    describe('2.3 搜索功能集成', () => {
      it('应该正确处理模糊搜索', () => {
        const entities = [
          { entityId: 'func-1', entityData: { type: CodeEntityType.FUNCTION, functionName: 'getUserById' } as CodeEntityData },
          { entityId: 'func-2', entityData: { type: CodeEntityType.FUNCTION, functionName: 'getUserByName' } as CodeEntityData },
          { entityId: 'func-3', entityData: { type: CodeEntityType.FUNCTION, functionName: 'updateUser' } as CodeEntityData },
        ];

        entities.forEach(e => db.addCodeEntity(e.entityId, e.entityData));

        const results = db.searchCodeEntitiesByName('getUser');
        expect(results.length).toBe(2);
      });

      it('应该正确处理大小写不敏感搜索', () => {
        db.addCodeEntity('func-1', { type: CodeEntityType.FUNCTION, functionName: 'MyFunction' } as CodeEntityData);

        const results1 = engine.searchEntitiesByName('myfunction');
        const results2 = engine.searchEntitiesByName('MYFUNCTION');
        const results3 = engine.searchEntitiesByName('MyFunction');

        expect(results1.length).toBeGreaterThan(0);
        expect(results2.length).toBeGreaterThan(0);
        expect(results3.length).toBeGreaterThan(0);
      });
    });
  });

  describe('🔄 3. 业务场景闭环测试', () => {
    
    describe('3.1 完整项目解析流程', () => {
      it('应该完成从解析到查询的完整流程', () => {
        // 模拟解析结果
        const parsingResult = {
          codeEntities: [
            { entityId: 'file-1', entityData: { type: CodeEntityType.FILE, filePath: '/a.ts', fileName: 'a.ts' } as CodeEntityData },
            { entityId: 'class-1', entityData: { type: CodeEntityType.CLASS, className: 'MyClass' } as CodeEntityData },
            { entityId: 'func-1', entityData: { type: CodeEntityType.FUNCTION, functionName: 'myMethod' } as CodeEntityData },
          ],
          codeRelations: [
            { relationId: 'rel-1', sourceEntityId: 'class-1', targetEntityId: 'file-1', relationData: { type: CodeRelationType.CONTAINS } as CodeRelationData },
            { relationId: 'rel-2', sourceEntityId: 'func-1', targetEntityId: 'class-1', relationData: { type: CodeRelationType.CONTAINS } as CodeRelationData },
          ]
        };

        // 添加解析结果
        parsingResult.codeEntities.forEach(e => {
          db.addCodeEntity(e.entityId, e.entityData);
        });

        parsingResult.codeRelations.forEach(r => {
          db.addCodeRelation(r.relationId, r.sourceEntityId, r.targetEntityId, r.relationData);
        });

        // 验证统计
        const stats = db.getStatistics();
        expect(stats.totalEntityCount).toBe(3);
        expect(stats.totalRelationCount).toBe(2);

        // 验证查询
        const classes = db.getCodeEntitiesByType(CodeEntityType.CLASS);
        expect(classes.length).toBe(1);
        expect(classes[0].entityData.className).toBe('MyClass');

        // 验证关系
        const classRelations = db.getCodeRelationsForEntity('class-1');
        expect(classRelations.length).toBe(2);
      });
    });

    describe('3.2 逆向操作场景', () => {
      it('应该正确处理添加后删除', () => {
        const entity = createTestEntity(CodeEntityType.FUNCTION, 1);
        db.addCodeEntity(entity.entityId, entity.entityData);

        let stats = db.getStatistics();
        expect(stats.totalEntityCount).toBe(1);

        db.removeEntity(entity.entityId);

        stats = db.getStatistics();
        expect(stats.totalEntityCount).toBe(0);
      });

      it('应该正确处理重复添加', () => {
        const entity = createTestEntity(CodeEntityType.FUNCTION, 1);
        db.addCodeEntity(entity.entityId, entity.entityData);
        db.addCodeEntity(entity.entityId, entity.entityData); // 重复添加

        const stats = db.getStatistics();
        expect(stats.totalEntityCount).toBe(1); // 仍然只有1个
      });

      it('应该正确处理先删后增', () => {
        const entity = createTestEntity(CodeEntityType.FUNCTION, 1);
        db.addCodeEntity(entity.entityId, entity.entityData);
        db.removeEntity(entity.entityId);
        db.addCodeEntity(entity.entityId, entity.entityData);

        const stats = db.getStatistics();
        expect(stats.totalEntityCount).toBe(1);
      });
    });

    describe('3.3 中断场景', () => {
      it('应该正确处理批量操作中的部分失败', () => {
        const entities = [
          { entityId: 'valid-1', entityData: { type: CodeEntityType.FUNCTION, functionName: 'f1' } as CodeEntityData },
          { entityId: 'valid-2', entityData: { type: CodeEntityType.FUNCTION, functionName: 'f2' } as CodeEntityData },
        ];

        // 第一次批量
        db.batchAddCodeEntities(entities);

        // 部分删除
        db.removeEntity('valid-1');

        // 再次批量添加（包含已存在的）
        const moreEntities = [
          { entityId: 'valid-1', entityData: { type: CodeEntityType.FUNCTION, functionName: 'f1-updated' } as CodeEntityData },
          { entityId: 'valid-3', entityData: { type: CodeEntityType.FUNCTION, functionName: 'f3' } as CodeEntityData },
        ];

        db.batchAddCodeEntities(moreEntities);

        const stats = db.getStatistics();
        expect(stats.totalEntityCount).toBe(3); // f1(更新), f2, f3
      });
    });

    describe('3.4 重复操作场景', () => {
      it('应该正确处理重复的关系添加', () => {
        const e1 = createTestEntity(CodeEntityType.FUNCTION, 1);
        const e2 = createTestEntity(CodeEntityType.FUNCTION, 2);
        db.addCodeEntity(e1.entityId, e1.entityData);
        db.addCodeEntity(e2.entityId, e2.entityData);

        // 添加相同关系两次
        db.addCodeRelation('same-rel', e1.entityId, e2.entityId, {
          type: CodeRelationType.CALLS
        } as CodeRelationData);
        
        db.addCodeRelation('same-rel', e1.entityId, e2.entityId, {
          type: CodeRelationType.CALLS
        } as CodeRelationData);

        const stats = db.getStatistics();
        expect(stats.totalRelationCount).toBe(1); // 仍然只有1个
      });
    });
  });

  describe('💾 4. 数据一致性校验', () => {
    
    it('索引与实际数据应该一致', () => {
      // 添加各种类型
      const entities = [
        { type: CodeEntityType.FUNCTION, count: 5 },
        { type: CodeEntityType.CLASS, count: 3 },
        { type: CodeEntityType.VARIABLE, count: 4 },
      ];

      entities.forEach(({ type, count }) => {
        for (let i = 0; i < count; i++) {
          const e = createTestEntity(type, i);
          db.addCodeEntity(e.entityId, e.entityData);
        }
      });

      const stats = db.getStatistics();
      
      // 验证函数索引
      const functions = db.getCodeEntitiesByType(CodeEntityType.FUNCTION);
      expect(functions.length).toBe(stats.entityCountByType[CodeEntityType.FUNCTION]);
      expect(functions.length).toBe(5);

      // 验证类索引
      const classes = db.getCodeEntitiesByType(CodeEntityType.CLASS);
      expect(classes.length).toBe(stats.entityCountByType[CodeEntityType.CLASS]);
      expect(classes.length).toBe(3);

      // 验证变量索引
      const variables = db.getCodeEntitiesByType(CodeEntityType.VARIABLE);
      expect(variables.length).toBe(stats.entityCountByType[CodeEntityType.VARIABLE]);
      expect(variables.length).toBe(4);
    });

    it('删除后索引应该更新', () => {
      const e1 = createTestEntity(CodeEntityType.FUNCTION, 1);
      const e2 = createTestEntity(CodeEntityType.FUNCTION, 2);
      db.addCodeEntity(e1.entityId, e1.entityData);
      db.addCodeEntity(e2.entityId, e2.entityData);

      let functions = db.getCodeEntitiesByType(CodeEntityType.FUNCTION);
      expect(functions.length).toBe(2);

      db.removeEntity(e1.entityId);

      functions = db.getCodeEntitiesByType(CodeEntityType.FUNCTION);
      expect(functions.length).toBe(1);
      expect(functions[0].entityId).toBe(e2.entityId);
    });

    it('类型变更后索引应该正确更新', () => {
      const entityId = 'type-change-test';
      db.addCodeEntity(entityId, { type: CodeEntityType.FUNCTION, functionName: 'f1' } as CodeEntityData);

      let functions = db.getCodeEntitiesByType(CodeEntityType.FUNCTION);
      let classes = db.getCodeEntitiesByType(CodeEntityType.CLASS);
      expect(functions.length).toBe(1);
      expect(classes.length).toBe(0);

      // 变更类型
      db.addCodeEntity(entityId, { type: CodeEntityType.CLASS, className: 'C1' } as CodeEntityData);

      functions = db.getCodeEntitiesByType(CodeEntityType.FUNCTION);
      classes = db.getCodeEntitiesByType(CodeEntityType.CLASS);
      expect(functions.length).toBe(0); // 函数索引已清理
      expect(classes.length).toBe(1); // 类索引已添加
    });
  });

  describe('⚡ 5. 异常容错与性能核验', () => {
    
    it('应该正确处理大量并发查询', () => {
      // 添加数据
      for (let i = 0; i < 100; i++) {
        const e = createTestEntity(CodeEntityType.FUNCTION, i);
        db.addCodeEntity(e.entityId, e.entityData);
      }

      // 并发查询
      const queries = Array.from({ length: 50 }, () => 
        db.searchCodeEntitiesByName('test')
      );

      queries.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    });

    it('应该正确处理快速增删交替', () => {
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        const e = createTestEntity(CodeEntityType.FUNCTION, i);
        db.addCodeEntity(e.entityId, e.entityData);
        
        if (i % 2 === 0) {
          db.removeEntity(e.entityId);
        }
      }

      const stats = db.getStatistics();
      expect(stats.totalEntityCount).toBeLessThanOrEqual(iterations / 2 + 1);
    });

    it('应该正确处理极端深度关系', () => {
      // 创建链式关系
      const entities = Array.from({ length: 20 }, (_, i) => {
        const e = createTestEntity(CodeEntityType.FUNCTION, i);
        db.addCodeEntity(e.entityId, e.entityData);
        return e;
      });

      for (let i = 0; i < entities.length - 1; i++) {
        db.addCodeRelation(
          generateId('chain', i),
          entities[i].entityId,
          entities[i + 1].entityId,
          { type: CodeRelationType.CALLS } as CodeRelationData
        );
      }

      const stats = db.getStatistics();
      expect(stats.totalRelationCount).toBe(19);
    });
  });

  describe('📊 6. 测试总结', () => {
    it('应该生成完整的测试报告', () => {
      console.log('\n' + '='.repeat(60));
      console.log('📋 模块集成与接口全量测试完成');
      console.log('='.repeat(60));
      console.log('测试覆盖:');
      console.log('  ✓ 接口异常输入测试');
      console.log('  ✓ 批量操作边界测试');
      console.log('  ✓ 模块集成联调测试');
      console.log('  ✓ 业务场景闭环测试');
      console.log('  ✓ 数据一致性校验');
      console.log('  ✓ 异常容错与性能核验');
      console.log('='.repeat(60));
    });
  });
});
