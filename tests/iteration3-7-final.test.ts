/**
 * 迭代3-7综合：并发、一致性、性能、最终验收测试
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { KnowledgeGraphDatabase } from '../src/core/knowledge-graph/KnowledgeGraphDatabase';
import { GraphQueryEngine } from '../src/core/query-engine/GraphQueryEngine';
import { CodeEntityType, CodeRelationType } from '../src/shared/index';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('迭代3-7综合验收测试', () => {
    let tempDir: string;
    
    beforeAll(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'final-acceptance-'));
    });
    
    afterAll(() => {
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {
            // 忽略
        }
    });

    describe('迭代3：并发与竞态条件', () => {
        it('应该正确处理100个并发操作', async () => {
            const db = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: false
            });
            
            const promises = [];
            
            for (let i = 0; i < 100; i++) {
                promises.push((async () => {
                    for (let j = 0; j < 100; j++) {
                        const id = `concurrent-${i}-${j}`;
                        db.addCodeEntity(id, {
                            type: CodeEntityType.FUNCTION,
                            entityName: id
                        });
                    }
                })());
            }
            
            await Promise.all(promises);
            
            const stats = db.getStatistics();
            expect(stats.totalEntityCount).toBeGreaterThanOrEqual(1000);
            
            console.log(`✅ 100并发×100操作完成，实体数: ${stats.totalEntityCount}`);
        });
    });

    describe('迭代4：数据一致性与持久化', () => {
        it('应该保证持久化后数据完整', async () => {
            const db = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: true
            });
            
            for (let i = 0; i < 100; i++) {
                db.addCodeEntity(`persist-${i}`, {
                    type: CodeEntityType.FUNCTION,
                    entityName: `func${i}`
                });
            }
            
            await db.saveToFileSystem();
            
            const newDb = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: true
            });
            
            await newDb.loadFromFileSystem();
            
            const stats = newDb.getStatistics();
            expect(stats.totalEntityCount).toBe(100);
            
            console.log(`✅ 持久化验证通过: ${stats.totalEntityCount} 实体`);
        });
    });

    describe('迭代5：性能基准', () => {
        it('应该满足所有性能基准', () => {
            const db = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: false
            });
            
            const addStart = Date.now();
            for (let i = 0; i < 50000; i++) {
                db.addCodeEntity(`perf-${i}`, {
                    type: CodeEntityType.FUNCTION,
                    entityName: `func${i}`
                });
            }
            const addDuration = Date.now() - addStart;
            
            const queryStart = Date.now();
            for (let i = 0; i < 50000; i++) {
                db.getCodeEntity(`perf-${i}`);
            }
            const queryDuration = Date.now() - queryStart;
            
            expect(addDuration).toBeLessThan(30000); // 5万实体添加 < 30秒
            expect(queryDuration).toBeLessThan(5000);  // 5万查询 < 5秒
            
            console.log(`✅ 性能基准达标: 添加${addDuration}ms, 查询${queryDuration}ms`);
        });
    });

    describe('迭代6：综合问题修复验证', () => {
        it('应该正确拒绝无效类型', () => {
            const db = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: false
            });
            
            expect(() => {
                db.addCodeEntity('invalid', {
                    type: 'NOT_VALID' as any,
                    entityName: 'test'
                });
            }).toThrow();
            
            console.log(`✅ 无效类型验证工作正常`);
        });
        
        it('应该正确删除实体并同步索引', () => {
            const db = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: false
            });
            
            db.addCodeEntity('delete-me', {
                type: CodeEntityType.FUNCTION,
                entityName: 'func'
            });
            
            const before = db.getCodeEntitiesByType(CodeEntityType.FUNCTION).length;
            db.removeEntity('delete-me');
            const after = db.getCodeEntitiesByType(CodeEntityType.FUNCTION).length;
            
            expect(before - after).toBe(1);
            
            console.log(`✅ 删除后索引同步正常`);
        });
    });

    describe('迭代7：最终验收', () => {
        it('应该通过所有核心功能验收', () => {
            const db = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: false
            });
            
            // 添加
            db.addCodeEntity('final-1', {
                type: CodeEntityType.CLASS,
                entityName: 'FinalClass'
            });
            db.addCodeEntity('final-2', {
                type: CodeEntityType.FUNCTION,
                entityName: 'finalFunc'
            });
            
            // 查询
            const entity = db.getCodeEntity('final-1');
            expect(entity?.entityName).toBe('FinalClass');
            
            // 关系
            db.addCodeRelation('final-rel', 'final-1', 'final-2', {
                type: CodeRelationType.CALLS
            });
            
            const relation = db.getCodeRelation('final-rel');
            expect(relation).not.toBeNull();
            
            // 统计
            const stats = db.getStatistics();
            expect(stats.totalEntityCount).toBeGreaterThanOrEqual(2);
            
            console.log(`✅ 最终验收通过: ${stats.totalEntityCount} 实体, ${stats.totalRelationCount} 关系`);
        });
    });
});

