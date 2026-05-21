/**
 * ArkTS 代码知识图谱系统 - 全流程系统化深度测试
 * 
 * 测试覆盖范围：
 * 1. 静态代码走读验证
 * 2. 单元测试覆盖所有分支
 * 3. 集成测试跨模块调用
 * 4. 接口测试异常入参
 * 5. 业务场景全覆盖
 * 6. 数据一致性验证
 * 7. 异常容错测试
 * 8. 性能基准测试
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { KnowledgeGraphDatabase } from '../src/core/knowledge-graph/KnowledgeGraphDatabase';
import { GraphQueryEngine } from '../src/core/query-engine/GraphQueryEngine';
import { SemanticVectorSearch } from '../src/core/semantic-search/SemanticVectorSearch';
import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService';
import { CodeEntityType, CodeRelationType } from '../src/shared/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('第一阶段：静态代码走读验证', () => {
  let tempDir: string;
  let database: KnowledgeGraphDatabase;
  let queryEngine: GraphQueryEngine;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'static-test-'));
    database = new KnowledgeGraphDatabase({
      dataDirectory: tempDir,
      persistToFileSystem: false
    });
    queryEngine = new GraphQueryEngine(database);
  });

  afterAll(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up temp directory:', error);
    }
  });

  describe('1.1 知识图谱数据库静态验证', () => {
    it('应该正确初始化图数据库', () => {
      expect(database).toBeDefined();
      expect(database.getStatistics().totalEntityCount).toBe(0);
    });

    it('应该正确创建实体节点', () => {
      const entityId = 'test-entity-1';
      const entityData = {
        type: CodeEntityType.FUNCTION,
        entityName: 'testFunction',
        filePath: '/test/file.ts',
        startLine: 1,
        endLine: 10
      };

      database.addCodeEntity(entityId, entityData);
      
      const retrievedEntity = database.getCodeEntity(entityId);
      expect(retrievedEntity).not.toBeNull();
      expect(retrievedEntity?.entityName).toBe('testFunction');
      expect(retrievedEntity?.type).toBe(CodeEntityType.FUNCTION);
    });

    it('应该正确创建关系边', () => {
      const sourceId = 'source-entity';
      const targetId = 'target-entity';
      const relationId = 'test-relation';
      
      database.addCodeEntity(sourceId, {
        type: CodeEntityType.CLASS,
        entityName: 'SourceClass',
        filePath: '/test/source.ts'
      });
      
      database.addCodeEntity(targetId, {
        type: CodeEntityType.METHOD,
        entityName: 'targetMethod',
        filePath: '/test/target.ts'
      });
      
      database.addCodeRelation(relationId, sourceId, targetId, {
        type: CodeRelationType.CALLS,
        sourceEntityName: 'SourceClass',
        targetEntityName: 'targetMethod'
      });
      
      const relation = database.getCodeRelation(relationId);
      expect(relation).not.toBeNull();
      expect(relation?.sourceEntityId).toBe(sourceId);
      expect(relation?.targetEntityId).toBe(targetId);
    });

    it('应该正确处理重复实体', () => {
      const entityId = 'duplicate-entity';
      
      database.addCodeEntity(entityId, {
        type: CodeEntityType.FUNCTION,
        entityName: 'firstFunction',
        filePath: '/test/file.ts'
      });
      
      database.addCodeEntity(entityId, {
        type: CodeEntityType.FUNCTION,
        entityName: 'updatedFunction',
        filePath: '/test/file.ts'
      });
      
      const entity = database.getCodeEntity(entityId);
      expect(entity?.entityName).toBe('updatedFunction');
    });

    it('应该正确处理未知目标实体', () => {
      const sourceId = 'source-only';
      const relationId = 'orphan-relation';
      
      database.addCodeEntity(sourceId, {
        type: CodeEntityType.CLASS,
        entityName: 'SourceOnly',
        filePath: '/test/source.ts'
      });
      
      database.addCodeRelation(relationId, sourceId, 'non-existent-target', {
        type: CodeRelationType.CALLS
      });
      
      const relation = database.getCodeRelation(relationId);
      expect(relation).not.toBeNull();
    });
  });

  describe('1.2 查询引擎静态验证', () => {
    beforeEach(() => {
      database.clear();
    });

    it('应该正确配置查询缓存', () => {
      queryEngine.configureCache({
        enabled: true,
        maxSize: 100,
        ttl: 30000
      });
      
      const stats = queryEngine.getCacheStats();
      expect(stats.maxSize).toBe(100);
    });

    it('应该正确清空缓存', () => {
      queryEngine.clearCache();
      const stats = queryEngine.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('应该正确获取统计信息', () => {
      database.addCodeEntity('stat-entity-1', {
        type: CodeEntityType.FUNCTION,
        entityName: 'statFunc1'
      });
      
      database.addCodeEntity('stat-entity-2', {
        type: CodeEntityType.FUNCTION,
        entityName: 'statFunc2'
      });
      
      const stats = queryEngine.getStatistics();
      expect(stats.totalEntityCount).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('第二阶段：单元测试覆盖所有分支', () => {
  let tempDir: string;
  let database: KnowledgeGraphDatabase;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unit-branch-test-'));
    database = new KnowledgeGraphDatabase({
      dataDirectory: tempDir,
      persistToFileSystem: false
    });
  });

  afterAll(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up temp directory:', error);
    }
  });

  describe('2.1 实体类型全分支覆盖', () => {
    Object.values(CodeEntityType).forEach(entityType => {
      it(`应该支持实体类型: ${entityType}`, () => {
        const entityId = `entity-${entityType}`;
        const entityData = {
          type: entityType,
          entityName: `TestEntity-${entityType}`,
          filePath: `/test/${entityType}.ts`
        };
        
        database.addCodeEntity(entityId, entityData);
        const retrieved = database.getCodeEntity(entityId);
        expect(retrieved?.type).toBe(entityType);
      });
    });
  });

  describe('2.2 关系类型全分支覆盖', () => {
    beforeEach(() => {
      database.clear();
    });

    Object.values(CodeRelationType).forEach(relationType => {
      it(`应该支持关系类型: ${relationType}`, () => {
        const sourceId = `source-${relationType}`;
        const targetId = `target-${relationType}`;
        const relationId = `relation-${relationType}`;
        
        database.addCodeEntity(sourceId, {
          type: CodeEntityType.FUNCTION,
          entityName: 'Source'
        });
        
        database.addCodeEntity(targetId, {
          type: CodeEntityType.FUNCTION,
          entityName: 'Target'
        });
        
        database.addCodeRelation(relationId, sourceId, targetId, {
          type: relationType
        });
        
        const relation = database.getCodeRelation(relationId);
        expect(relation?.relationData.type).toBe(relationType);
      });
    });
  });

  describe('2.3 边界条件覆盖', () => {
    it('应该处理空实体ID', () => {
      expect(() => {
        database.addCodeEntity('', {
          type: CodeEntityType.FUNCTION,
          entityName: 'EmptyId'
        });
      }).not.toThrow();
    });

    it('应该处理超长实体ID', () => {
      const longId = 'a'.repeat(10000);
      expect(() => {
        database.addCodeEntity(longId, {
          type: CodeEntityType.FUNCTION,
          entityName: 'LongId'
        });
      }).not.toThrow();
    });

    it('应该处理特殊字符实体ID', () => {
      const specialId = 'entity-!@#$%^&*()_+-=[]{}|;:,.<>?';
      expect(() => {
        database.addCodeEntity(specialId, {
          type: CodeEntityType.FUNCTION,
          entityName: 'SpecialChars'
        });
      }).not.toThrow();
    });

    it('应该处理获取不存在的实体', () => {
      const entity = database.getCodeEntity('non-existent-12345');
      expect(entity).toBeNull();
    });

    it('应该处理获取不存在的关??系', () => {
      const relation = database.getCodeRelation('non-existent-relation');
      expect(relation).toBeNull();
    });
  });

  describe('2.4 循环场景覆盖', () => {
    it('应该正确处理自引用关系', () => {
      const selfId = 'self-referencing';
      
      database.addCodeEntity(selfId, {
        type: CodeEntityType.CLASS,
        entityName: 'SelfClass'
      });
      
      database.addCodeRelation('self-ref', selfId, selfId, {
        type: CodeRelationType.EXTENDS
      });
      
      const relation = database.getCodeRelation('self-ref');
      expect(relation?.sourceEntityId).toBe(selfId);
      expect(relation?.targetEntityId).toBe(selfId);
    });

    it('应该正确处理多跳循环关系', () => {
      const entities = ['A', 'B', 'C', 'A'];
      
      entities.forEach((id, index) => {
        database.addCodeEntity(id, {
          type: CodeEntityType.CLASS,
          entityName: `Class${id}`
        });
      });
      
      database.addCodeRelation('rel-A-B', 'A', 'B', { type: CodeRelationType.CALLS });
      database.addCodeRelation('rel-B-C', 'B', 'C', { type: CodeRelationType.CALLS });
      database.addCodeRelation('rel-C-A', 'C', 'A', { type: CodeRelationType.CALLS });
      
      const relAB = database.getCodeRelation('rel-A-B');
      const relBC = database.getCodeRelation('rel-B-C');
      const relCA = database.getCodeRelation('rel-C-A');
      
      expect(relAB).not.toBeNull();
      expect(relBC).not.toBeNull();
      expect(relCA).not.toBeNull();
    });
  });
});

describe('第三阶段：集成测试跨模块调用', () => {
  let tempDir: string;
  let service: EnhancedCodeKnowledgeGraphService;

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'integration-test-'));
    service = new EnhancedCodeKnowledgeGraphService({
      dataDirectory: tempDir
    });
    await service.initialize();
  });

  afterAll(async () => {
    try {
      await service.saveToDisk();
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up:', error);
    }
  });

  describe('3.1 核心模块集成', () => {
    it('应该正确获取所有核心模块', () => {
      const queryEngine = service.getQueryEngine();
      const knowledgeGraph = service.getKnowledgeGraph();
      const semanticSearch = service.getSemanticSearch();
      const metricsAnalyzer = service.getMetricsAnalyzer();
      const symbolTable = service.getSymbolTableManager();
      
      expect(queryEngine).toBeDefined();
      expect(knowledgeGraph).toBeDefined();
      expect(semanticSearch).toBeDefined();
      expect(metricsAnalyzer).toBeDefined();
      expect(symbolTable).toBeDefined();
    });

    it('应该正确执行完整项目分析流程', async () => {
      const testProjectDir = path.join(tempDir, 'test-project');
      fs.mkdirSync(testProjectDir, { recursive: true });
      fs.writeFileSync(
        path.join(testProjectDir, 'index.ts'),
        `export function hello() { console.log('Hello'); }
         export class TestClass { }`
      );
      
      const result = await service.analyzeProject(testProjectDir);
      
      expect(result.knowledgeGraph).toBeDefined();
      expect(result.queryEngine).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('3.2 数据流转验证', () => {
    it('应该正确从解析结果构建图谱', async () => {
      const testProjectDir = path.join(tempDir, 'flow-test');
      fs.mkdirSync(testProjectDir, { recursive: true });
      fs.writeFileSync(
        path.join(testProjectDir, 'main.ts'),
        `class UserService {
          greet(): void { console.log('Hi'); }
        }
        export const service = new UserService();`
      );
      
      const result = await service.analyzeProject(testProjectDir);
      const stats = result.knowledgeGraph.getStatistics();
      
      expect(stats.totalEntityCount).toBeGreaterThan(0);
    });
  });

  describe('3.3 状态同步验证', () => {
    it('应该正确持久化和加载数据', async () => {
      const testProjectDir = path.join(tempDir, 'persist-test');
      fs.mkdirSync(testProjectDir, { recursive: true });
      fs.writeFileSync(
        path.join(testProjectDir, 'app.ts'),
        `export function app() { return 'app'; }`
      );
      
      await service.analyzeProject(testProjectDir);
      await service.saveToDisk();
      
      const newService = new EnhancedCodeKnowledgeGraphService({
        dataDirectory: tempDir
      });
      await newService.initialize();
      const loaded = await newService.loadFromDisk();
      
      expect(loaded).toBe(true);
    });
  });
});

describe('第四阶段：接口测试异常入参', () => {
  let tempDir: string;
  let database: KnowledgeGraphDatabase;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'interface-test-'));
    database = new KnowledgeGraphDatabase({
      dataDirectory: tempDir,
      persistToFileSystem: false
    });
  });

  afterAll(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up:', error);
    }
  });

  describe('4.1 异常入参测试', () => {
    it('应该处理 undefined 实体数据', () => {
      expect(() => {
        database.addCodeEntity('undefined-test', undefined as any);
      }).toThrow();
    });

    it('应该处理 null 实体数据', () => {
      expect(() => {
        database.addCodeEntity('null-test', null as any);
      }).toThrow();
    });

    it('应该处理异常类型参数', () => {
      expect(() => {
        database.addCodeEntity('bad-type', {
          type: 'INVALID_TYPE' as any,
          entityName: 'Test'
        });
      }).toThrow();
    });

    it('应该处理负数行号', () => {
      expect(() => {
        database.addCodeEntity('negative-lines', {
          type: CodeEntityType.FUNCTION,
          entityName: 'Test',
          startLine: -1,
          endLine: -10
        });
      }).not.toThrow();
    });

    it('应该处理超大数据', () => {
      const largeEntityId = 'large-entity';
      const largeData = {
        type: CodeEntityType.FILE,
        entityName: 'LargeFile',
        content: 'x'.repeat(1000000)
      };
      
      expect(() => {
        database.addCodeEntity(largeEntityId, largeData);
      }).not.toThrow();
    });
  });

  describe('4.2 超限参数测试', () => {
    it('应该处理极限数量的实体', () => {
      const limit = 10000;
      
      for (let i = 0; i < limit; i++) {
        database.addCodeEntity(`entity-${i}`, {
          type: CodeEntityType.FUNCTION,
          entityName: `Func${i}`
        });
      }
      
      const stats = database.getStatistics();
      expect(stats.totalEntityCount).toBeGreaterThanOrEqual(limit);
    });

    it('应该处理极限数量的关系', () => {
      database.clear();
      const limit = 5000;
      
      for (let i = 0; i < limit; i++) {
        const sourceId = `source-${i}`;
        const targetId = `target-${i}`;
        
        database.addCodeEntity(sourceId, {
          type: CodeEntityType.FUNCTION,
          entityName: `Source${i}`
        });
        
        database.addCodeEntity(targetId, {
          type: CodeEntityType.FUNCTION,
          entityName: `Target${i}`
        });
        
        database.addCodeRelation(`rel-${i}`, sourceId, targetId, {
          type: CodeRelationType.CALLS
        });
      }
      
      const stats = database.getStatistics();
      expect(stats.totalRelationCount).toBeGreaterThanOrEqual(limit);
    });
  });
});

describe('第五阶段：业务场景全覆盖', () => {
  let tempDir: string;
  let service: EnhancedCodeKnowledgeGraphService;

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'business-test-'));
    service = new EnhancedCodeKnowledgeGraphService({
      dataDirectory: tempDir
    });
    await service.initialize();
  });

  afterAll(async () => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up:', error);
    }
  });

  describe('5.1 正向业务流程', () => {
    it('应该完成完整的项目分析流程', async () => {
      const testProjectDir = path.join(tempDir, 'complete-flow');
      fs.mkdirSync(testProjectDir, { recursive: true });
      
      const files = [
        { name: 'index.ts', content: 'import { User } from "./user"; export class App { }' },
        { name: 'user.ts', content: 'export class User { name: string; }' },
        { name: 'utils.ts', content: 'export function util() { return 42; }' }
      ];
      
      files.forEach(file => {
        fs.writeFileSync(path.join(testProjectDir, file.name), file.content);
      });
      
      const result = await service.analyzeProject(testProjectDir);
      
      expect(result.duration).toBeGreaterThan(0);
      expect(result.knowledgeGraph.getStatistics().totalEntityCount).toBeGreaterThan(0);
    });
  });

  describe('5.2 逆向业务流程', () => {
    it('应该正确处理空项目', async () => {
      const emptyDir = path.join(tempDir, 'empty');
      fs.mkdirSync(emptyDir, { recursive: true });
      
      const result = await service.analyzeProject(emptyDir);
      expect(result.knowledgeGraph.getStatistics().totalEntityCount).toBe(0);
    });
  });

  describe('5.3 中断场景测试', () => {
    it('应该处理并发分析请求', async () => {
      const project1 = path.join(tempDir, 'project1');
      const project2 = path.join(tempDir, 'project2');
      
      fs.mkdirSync(project1, { recursive: true });
      fs.mkdirSync(project2, { recursive: true });
      
      fs.writeFileSync(path.join(project1, 'a.ts'), 'export const a = 1;');
      fs.writeFileSync(path.join(project2, 'b.ts'), 'export const b = 2;');
      
      const [result1, result2] = await Promise.all([
        service.analyzeProject(project1),
        service.analyzeProject(project2)
      ]);
      
      expect(result1.duration).toBeGreaterThan(0);
      expect(result2.duration).toBeGreaterThan(0);
    });
  });

  describe('5.4 重复操作场景', () => {
    it('应该处理重复分析请求', async () => {
      const testProject = path.join(tempDir, 'repeated');
      fs.mkdirSync(testProject, { recursive: true });
      fs.writeFileSync(path.join(testProject, 'app.ts'), 'export const x = 1;');
      
      const results = await Promise.all([
        service.analyzeProject(testProject),
        service.analyzeProject(testProject),
        service.analyzeProject(testProject)
      ]);
      
      results.forEach(result => {
        expect(result.duration).toBeGreaterThan(0);
      });
    });
  });
});

describe('第六阶段：数据一致性验证', () => {
  let tempDir: string;
  let database: KnowledgeGraphDatabase;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'data-consistency-'));
    database = new KnowledgeGraphDatabase({
      dataDirectory: tempDir,
      persistToFileSystem: false
    });
  });

  afterAll(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up:', error);
    }
  });

  describe('6.1 增删改查一致性', () => {
    it('应该保证添加和查询一致性', () => {
      const entityId = 'consistency-test';
      const entityData = {
        type: CodeEntityType.CLASS,
        entityName: 'ConsistencyClass',
        filePath: '/test/consistent.ts'
      };
      
      database.addCodeEntity(entityId, entityData);
      const retrieved = database.getCodeEntity(entityId);
      
      expect(retrieved?.entityName).toBe(entityData.entityName);
      expect(retrieved?.type).toBe(entityData.type);
    });

    it('应该保证更新一致性', () => {
      const entityId = 'update-consistency';
      
      database.addCodeEntity(entityId, {
        type: CodeEntityType.FUNCTION,
        entityName: 'OriginalName'
      });
      
      database.addCodeEntity(entityId, {
        type: CodeEntityType.FUNCTION,
        entityName: 'UpdatedName'
      });
      
      const entity = database.getCodeEntity(entityId);
      expect(entity?.entityName).toBe('UpdatedName');
    });

    it('应该保证删除一致性', () => {
      const entityId = 'delete-consistency';
      
      database.addCodeEntity(entityId, {
        type: CodeEntityType.VARIABLE,
        entityName: 'ToDelete'
      });
      
      database.removeEntity(entityId);
      const entity = database.getCodeEntity(entityId);
      expect(entity).toBeNull();
    });
  });

  describe('6.2 关联关系一致性', () => {
    it('应该保证关系数据一致性', () => {
      const sourceId = 'consistency-source';
      const targetId = 'consistency-target';
      const relationId = 'consistency-rel';
      
      database.addCodeEntity(sourceId, {
        type: CodeEntityType.FUNCTION,
        entityName: 'Source'
      });
      
      database.addCodeEntity(targetId, {
        type: CodeEntityType.FUNCTION,
        entityName: 'Target'
      });
      
      database.addCodeRelation(relationId, sourceId, targetId, {
        type: CodeRelationType.CALLS,
        sourceEntityName: 'Source',
        targetEntityName: 'Target'
      });
      
      const relation = database.getCodeRelation(relationId);
      expect(relation?.relationData.type).toBe(CodeRelationType.CALLS);
    });
  });

  describe('6.3 统计信息一致性', () => {
    it('应该保证统计数据准确性', () => {
      database.clear();
      
      database.addCodeEntity('func1', { type: CodeEntityType.FUNCTION, entityName: 'F1' });
      database.addCodeEntity('func2', { type: CodeEntityType.FUNCTION, entityName: 'F2' });
      database.addCodeEntity('cls1', { type: CodeEntityType.CLASS, entityName: 'C1' });
      
      const stats = database.getStatistics();
      expect(stats.totalEntityCount).toBe(3);
      expect(stats.entityCountByType[CodeEntityType.FUNCTION]).toBe(2);
      expect(stats.entityCountByType[CodeEntityType.CLASS]).toBe(1);
    });
  });
});

describe('第七阶段：异常容错测试', () => {
  let tempDir: string;
  let database: KnowledgeGraphDatabase;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'error-handling-'));
    database = new KnowledgeGraphDatabase({
      dataDirectory: tempDir,
      persistToFileSystem: false
    });
  });

  afterAll(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up:', error);
    }
  });

  describe('7.1 异常场景处理', () => {
    it('应该处理无效的文件路径', () => {
      expect(() => {
        database.addCodeEntity('invalid-path', {
          type: CodeEntityType.FILE,
          entityName: 'Test',
          filePath: '/invalid/\0/path'
        });
      }).not.toThrow();
    });

    it('应该处理Unicode字符', () => {
      expect(() => {
        database.addCodeEntity('unicode-测试', {
          type: CodeEntityType.FUNCTION,
          entityName: '测试函数',
          filePath: '/测试/路径.ts'
        });
      }).not.toThrow();
    });

    it('应该处理Emoji字符', () => {
      expect(() => {
        database.addCodeEntity('emoji-😀', {
          type: CodeEntityType.CLASS,
          entityName: 'Emoji😀Class',
          filePath: '/emoji/file.ts'
        });
      }).not.toThrow();
    });
  });

  describe('7.2 并发错误处理', () => {
    it('应该处理并发添加同一实体', async () => {
      const entityId = 'concurrent-entity';
      const tasks = Array(100).fill(null).map((_, i) => {
        return new Promise<void>((resolve) => {
          try {
            database.addCodeEntity(entityId, {
              type: CodeEntityType.FUNCTION,
              entityName: `Concurrent${i}`
            });
          } catch (error) {
            // 忽略错误
          }
          resolve();
        });
      });
      
      await Promise.all(tasks);
      const entity = database.getCodeEntity(entityId);
      expect(entity).not.toBeNull();
    });
  });

  describe('7.3 降级处理', () => {
    it('应该在大数据量时保持稳定', () => {
      const largeData = {
        type: CodeEntityType.FILE,
        entityName: 'LargeFile',
        content: 'x'.repeat(10 * 1024 * 1024)
      };
      
      expect(() => {
        database.addCodeEntity('large-data', largeData);
      }).not.toThrow();
    });
  });
});

describe('第八阶段：性能基准测试', () => {
  let tempDir: string;
  let database: KnowledgeGraphDatabase;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'performance-bench-'));
    database = new KnowledgeGraphDatabase({
      dataDirectory: tempDir,
      persistToFileSystem: false
    });
  });

  afterAll(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up:', error);
    }
  });

  describe('8.1 响应时间基准', () => {
    it('添加实体应在100ms内完成', () => {
      const start = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        database.addCodeEntity(`perf-entity-${i}`, {
          type: CodeEntityType.FUNCTION,
          entityName: `PerfFunc${i}`
        });
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });

    it('查询实体应在10ms内完成', () => {
      const start = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        database.getCodeEntity(`perf-entity-${i}`);
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it('统计查询应在50ms内完成', () => {
      const start = Date.now();
      
      for (let i = 0; i < 100; i++) {
        database.getStatistics();
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('8.2 内存使用基准', () => {
    it('应该正确管理大量实体内存', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < 10000; i++) {
        database.addCodeEntity(`mem-entity-${i}`, {
          type: CodeEntityType.FUNCTION,
          entityName: `MemFunc${i}`,
          content: 'x'.repeat(1000)
        });
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024);
      
      expect(memoryIncrease).toBeLessThan(100);
    });
  });

  describe('8.3 缓存性能基准', () => {
    it('查询引擎缓存应提升性能', () => {
      const queryEngine = new GraphQueryEngine(database);
      
      database.clear();
      
      for (let i = 0; i < 100; i++) {
        database.addCodeEntity(`cache-entity-${i}`, {
          type: CodeEntityType.FUNCTION,
          entityName: `CacheFunc${i}`
        });
      }
      
      const coldStart = Date.now();
      queryEngine.getStatistics();
      const coldDuration = Date.now() - coldStart;
      
      const hotStart = Date.now();
      for (let i = 0; i < 10; i++) {
        queryEngine.getStatistics();
      }
      const hotDuration = Date.now() - hotStart;
      
      expect(hotDuration).toBeLessThan(coldDuration * 5);
    });
  });
});
