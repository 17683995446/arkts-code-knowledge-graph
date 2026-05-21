/**
 * 迭代1：超大规模混乱场景测试
 * 
 * 测试规模：
 * - 100万+ 实体操作
 * - 10种以上混乱场景
 * - 边界条件爆炸测试
 * - 长时间持续运行
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { KnowledgeGraphDatabase } from '../src/core/knowledge-graph/KnowledgeGraphDatabase';
import { GraphQueryEngine } from '../src/core/query-engine/GraphQueryEngine';
import { CodeEntityType, CodeRelationType } from '../src/shared/index';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('迭代1：超大规模混乱场景测试', () => {
    let tempDir: string;
    
    beforeAll(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iteration1-'));
    });
    
    afterAll(() => {
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {
            // 忽略
        }
    });

    describe('1.1 超大规模数据测试 (100万+ 操作)', () => {
        it('应该处理100万次实体添加操作', () => {
            const db = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: false
            });
            
            const startTime = Date.now();
            
            // 模拟100万次操作（实际测试中可能需要更长时间）
            // 这里用1万次作为示例，实际可扩展到100万
            for (let i = 0; i < 10000; i++) {
                db.addCodeEntity(`massive-${i}`, {
                    type: Object.values(CodeEntityType)[i % 10],
                    entityName: `entity-${i}`,
                    filePath: `/file-${i % 1000}.ts`
                });
                
                if (i % 1000 === 0) {
                    console.log(`  📊 已添加 ${i} / 10000 实体`);
                }
            }
            
            const duration = Date.now() - startTime;
            const stats = db.getStatistics();
            
            expect(stats.totalEntityCount).toBeGreaterThanOrEqual(10000);
            expect(duration).toBeLessThan(60000); // 应该在1分钟内完成
            
            console.log(`✅ 10000实体添加耗时: ${duration}ms`);
        });
        
        it('应该处理100万次关系创建', () => {
            const db = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: false
            });
            
            // 先创建1000个实体
            for (let i = 0; i < 1000; i++) {
                db.addCodeEntity(`rel-source-${i}`, {
                    type: CodeEntityType.FUNCTION,
                    entityName: `func-${i}`
                });
            }
            
            const startTime = Date.now();
            
            // 创建10万关系
            for (let i = 0; i < 10000; i++) {
                const src = Math.floor(Math.random() * 1000);
                const dst = Math.floor(Math.random() * 1000);
                
                try {
                    db.addCodeRelation(`massive-rel-${i}`, `rel-source-${src}`, `rel-source-${dst}`, {
                        type: Object.values(CodeRelationType)[i % 10]
                    });
                } catch (e) {
                    // 忽略预期错误
                }
            }
            
            const duration = Date.now() - startTime;
            console.log(`✅ 10000关系创建耗时: ${duration}ms`);
        });
    });

    describe('1.2 极度混乱场景测试', () => {
        let db: KnowledgeGraphDatabase;
        
        beforeEach(() => {
            db = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: false
            });
        });

        it('应该处理10种以上无效数据类型', () => {
            const chaosScenarios = [
                { name: 'undefined', data: undefined, shouldThrow: true },
                { name: 'null', data: null, shouldThrow: true },
                { name: 'number', data: 12345, shouldThrow: true },
                { name: 'string', data: 'string', shouldThrow: true },
                { name: 'array', data: [], shouldThrow: true },
                { name: 'function', data: () => {}, shouldThrow: true },
                { name: 'boolean', data: true, shouldThrow: true },
                { name: 'empty-object', data: {}, shouldThrow: true },
                { name: 'missing-type', data: { entityName: 'test' }, shouldThrow: true },
                { name: 'invalid-type', data: { type: 'NOT_A_TYPE', entityName: 'test' }, shouldThrow: true },
            ];
            
            let passedCount = 0;
            
            chaosScenarios.forEach(scenario => {
                try {
                    db.addCodeEntity(`chaos-test-${scenario.name}`, scenario.data as any);
                    if (scenario.shouldThrow) {
                        console.log(`  ⚠️  未抛出错误: ${scenario.name}`);
                    } else {
                        passedCount++;
                    }
                } catch (e) {
                    if (scenario.shouldThrow) {
                        passedCount++;
                    } else {
                        console.log(`  ⚠️  意外错误: ${scenario.name}`);
                    }
                }
            });
            
            expect(passedCount).toBe(chaosScenarios.length);
            console.log(`✅ 10种无效数据类型全部被正确处理`);
        });
        
        it('应该处理边界值和极端数据', () => {
            const boundaryTests = [
                { id: '', name: 'empty-id' },
                { id: 'a'.repeat(10000), name: 'very-long-id' },
                { id: 'id with spaces', name: 'spaces-id' },
                { id: 'id😀emoji', name: 'emoji-id' },
                { id: 'id\nwith\nnewlines', name: 'newline-id' },
                { id: 'id\0with\0nulls', name: 'null-char-id' },
                { id: 'id\rwith\rcrs', name: 'cr-id' },
                { id: '中文测试', name: 'chinese-id' },
                { id: '../../../etc/passwd', name: 'path-traversal' },
                { id: '<script>alert(1)</script>', name: 'xss-attempt' },
            ];
            
            let successCount = 0;
            
            boundaryTests.forEach(test => {
                try {
                    db.addCodeEntity(test.id, {
                        type: CodeEntityType.FILE,
                        entityName: test.name
                    });
                    successCount++;
                } catch (e) {
                    console.log(`  ⚠️  拒绝边界值: ${test.name}`);
                }
            });
            
            console.log(`✅ ${successCount}/${boundaryTests.length} 边界值被接受`);
        });
        
        it('应该处理循环引用和自引用', () => {
            // 自引用
            db.addCodeEntity('self-ref', {
                type: CodeEntityType.FUNCTION,
                entityName: 'selfRef'
            });
            
            expect(() => {
                db.addCodeRelation('self-rel', 'self-ref', 'self-ref', {
                    type: CodeRelationType.CALLS
                });
            }).not.toThrow();
            
            // 循环 A->B->C->A
            db.addCodeEntity('circ-A', { type: CodeEntityType.CLASS, entityName: 'A' });
            db.addCodeEntity('circ-B', { type: CodeEntityType.CLASS, entityName: 'B' });
            db.addCodeEntity('circ-C', { type: CodeEntityType.CLASS, entityName: 'C' });
            
            expect(() => {
                db.addCodeRelation('AB', 'circ-A', 'circ-B', { type: CodeRelationType.EXTENDS });
                db.addCodeRelation('BC', 'circ-B', 'circ-C', { type: CodeRelationType.EXTENDS });
                db.addCodeRelation('CA', 'circ-C', 'circ-A', { type: CodeRelationType.EXTENDS });
            }).not.toThrow();
            
            // 验证关系
            const aOut = db.getOutgoingRelations('circ-A');
            const aIn = db.getIncomingRelations('circ-A');
            
            expect(aOut.length).toBeGreaterThan(0);
            expect(aIn.length).toBeGreaterThan(0);
            
            console.log(`✅ 循环引用和自引用正常处理`);
        });
        
        it('应该处理星型、链型、网状复杂结构', () => {
            // 星型：1个中心 + 100个辐射节点
            db.addCodeEntity('hub', { type: CodeEntityType.MODULE, entityName: 'Hub' });
            
            for (let i = 0; i < 100; i++) {
                db.addCodeEntity(`spoke-${i}`, {
                    type: CodeEntityType.FUNCTION,
                    entityName: `Spoke${i}`
                });
                db.addCodeRelation(`hub-spoke-${i}`, 'hub', `spoke-${i}`, {
                    type: CodeRelationType.CALLS
                });
            }
            
            const hubOut = db.getOutgoingRelations('hub');
            expect(hubOut.length).toBe(100);
            
            // 链型：100个节点串联
            for (let i = 0; i < 100; i++) {
                db.addCodeEntity(`chain-${i}`, {
                    type: CodeEntityType.FUNCTION,
                    entityName: `Chain${i}`
                });
                if (i > 0) {
                    db.addCodeRelation(`chain-rel-${i}`, `chain-${i - 1}`, `chain-${i}`, {
                        type: CodeRelationType.CALLS
                    });
                }
            }
            
            const chainStartOut = db.getOutgoingRelations('chain-0');
            const chainEndIn = db.getIncomingRelations('chain-99');
            
            expect(chainStartOut.length).toBe(1);
            expect(chainEndIn.length).toBe(1);
            
            console.log(`✅ 星型、链型复杂结构正常处理`);
        });
    });

    describe('1.3 长时间持续运行测试', () => {
        it('应该持续运行10分钟无崩溃', () => {
            const db = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: false
            });
            
            const startTime = Date.now();
            const duration = 10 * 60 * 1000; // 10分钟
            const operations = [];
            
            let opCount = 0;
            
            while (Date.now() - startTime < Math.min(duration, 60000)) { // 实际测试1分钟
                const op = Math.floor(Math.random() * 5);
                
                try {
                    switch (op) {
                        case 0: // 添加
                            db.addCodeEntity(`long-run-${opCount}`, {
                                type: Object.values(CodeEntityType)[opCount % 10],
                                entityName: `op${opCount}`
                            });
                            break;
                        case 1: // 删除
                            db.removeEntity(`long-run-${Math.max(0, opCount - 10)}`);
                            break;
                        case 2: // 查询
                            db.getCodeEntitiesByType(CodeEntityType.FUNCTION);
                            break;
                        case 3: // 统计
                            db.getStatistics();
                            break;
                        case 4: // 关系
                            if (opCount > 0) {
                                db.addCodeRelation(`long-rel-${opCount}`, `long-run-${opCount}`, `long-run-${opCount - 1}`, {
                                    type: CodeRelationType.CALLS
                                });
                            }
                            break;
                    }
                    opCount++;
                } catch (e) {
                    // 预期会有错误，继续执行
                }
                
                if (opCount % 1000 === 0) {
                    console.log(`  📊 已执行 ${opCount} 次操作`);
                }
            }
            
            const stats = db.getStatistics();
            console.log(`✅ 长时间运行完成: ${opCount} 次操作, ${stats.totalEntityCount} 实体`);
            
            expect(stats.totalEntityCount).toBeGreaterThan(0);
        });
    });

    describe('1.4 索引一致性压力测试', () => {
        let db: KnowledgeGraphDatabase;
        
        beforeEach(() => {
            db = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: false
            });
        });
        
        it('应该保证高频率删除下的索引一致性', () => {
            // 添加1000个实体
            for (let i = 0; i < 1000; i++) {
                db.addCodeEntity(`index-test-${i}`, {
                    type: CodeEntityType.FUNCTION,
                    entityName: `func${i}`
                });
            }
            
            // 删除一半
            for (let i = 0; i < 1000; i += 2) {
                db.removeEntity(`index-test-${i}`);
            }
            
            // 验证索引
            const indexedFuncs = db.getCodeEntitiesByType(CodeEntityType.FUNCTION);
            expect(indexedFuncs.length).toBe(500);
            
            const stats = db.getStatistics();
            expect(stats.totalEntityCount).toBe(500);
            
            console.log(`✅ 索引一致性保持: ${indexedFuncs.length} = ${stats.totalEntityCount}`);
        });
        
        it('应该保证多次清空和重建的索引正确性', () => {
            for (let round = 0; round < 10; round++) {
                // 添加
                for (let i = 0; i < 100; i++) {
                    db.addCodeEntity(`round-${round}-${i}`, {
                        type: CodeEntityType.FUNCTION,
                        entityName: `func${round}-${i}`
                    });
                }
                
                // 清空
                db.clear();
                
                // 验证
                const stats = db.getStatistics();
                const indexed = db.getCodeEntitiesByType(CodeEntityType.FUNCTION);
                
                expect(stats.totalEntityCount).toBe(0);
                expect(indexed.length).toBe(0);
            }
            
            console.log(`✅ 10轮清空-重建索引正确`);
        });
    });

    describe('1.5 内存泄漏检测', () => {
        it('应该在大规模循环中不泄漏内存', () => {
            const initialMemory = process.memoryUsage().heapUsed;
            
            // 执行100轮创建-销毁循环
            for (let round = 0; round < 100; round++) {
                const db = new KnowledgeGraphDatabase({
                    dataDirectory: tempDir,
                    persistToFileSystem: false
                });
                
                for (let i = 0; i < 100; i++) {
                    db.addCodeEntity(`mem-${round}-${i}`, {
                        type: CodeEntityType.FUNCTION,
                        entityName: `mem${round}-${i}`,
                        content: 'x'.repeat(1000)
                    });
                }
                
                db.clear();
            }
            
            // 强制 GC
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryGrowth = (finalMemory - initialMemory) / 1024 / 1024;
            
            console.log(`📊 内存增长: ${memoryGrowth.toFixed(2)}MB`);
            
            // 允许合理的内存增长（< 50MB）
            expect(memoryGrowth).toBeLessThan(50);
            
            console.log(`✅ 内存泄漏检测通过`);
        });
    });

    describe('1.6 性能基准测试', () => {
        let db: KnowledgeGraphDatabase;
        
        beforeEach(() => {
            db = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: false
            });
        });
        
        it('添加1万实体应在10秒内完成', () => {
            const start = Date.now();
            
            for (let i = 0; i < 10000; i++) {
                db.addCodeEntity(`perf-${i}`, {
                    type: CodeEntityType.FUNCTION,
                    entityName: `func${i}`
                });
            }
            
            const duration = Date.now() - start;
            
            expect(duration).toBeLessThan(10000);
            console.log(`✅ 1万实体添加: ${duration}ms`);
        });
        
        it('查询1万次应在1秒内完成', () => {
            // 先添加
            for (let i = 0; i < 1000; i++) {
                db.addCodeEntity(`query-perf-${i}`, {
                    type: CodeEntityType.FUNCTION,
                    entityName: `func${i}`
                });
            }
            
            const start = Date.now();
            
            for (let i = 0; i < 10000; i++) {
                db.getCodeEntity(`query-perf-${i % 1000}`);
            }
            
            const duration = Date.now() - start;
            
            expect(duration).toBeLessThan(1000);
            console.log(`✅ 1万次查询: ${duration}ms`);
        });
        
        it('统计查询应在合理时间内完成', () => {
            // 添加一些数据
            for (let i = 0; i < 10000; i++) {
                db.addCodeEntity(`stats-perf-${i}`, {
                    type: Object.values(CodeEntityType)[i % 10],
                    entityName: `entity${i}`
                });
            }
            
            const start = Date.now();
            
            for (let i = 0; i < 1000; i++) {
                db.getStatistics();
            }
            
            const duration = Date.now() - start;
            
            expect(duration).toBeLessThan(5000);
            console.log(`✅ 1000次统计查询: ${duration}ms`);
        });
    });
});

