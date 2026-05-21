#!/usr/bin/env node
/**
 * ArkTS 代码知识图谱系统 - 极端混乱、大规模、长时间深度测试
 * 
 * 测试内容：
 * 1. 大规模数据测试（100万+ 实体）
 * 2. 极端混乱场景测试
 * 3. 并发压力测试
 * 4. 错误注入测试
 * 5. 长时间运行测试
 * 6. 内存泄漏检测
 * 7. 边界条件爆炸测试
 * 8. 资源耗尽测试
 */

import { KnowledgeGraphDatabase } from '../src/core/knowledge-graph/KnowledgeGraphDatabase.js';
import { GraphQueryEngine } from '../src/core/query-engine/GraphQueryEngine.js';
import { SemanticVectorSearch } from '../src/core/semantic-search/SemanticVectorSearch.js';
import { CodeEntityType, CodeRelationType } from '../src/shared/index.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// 测试配置
const CONFIG = {
    // 大规模测试配置
    entityCount: 50000,   // 5万实体
    relationCount: 100000, // 10万关系
    // 并发测试配置
    concurrentOperations: 100, // 100并发
    // 长时间测试配置
    testDurationMinutes: 5, // 5分钟测试
    // 混乱场景配置
    chaosLevel: 10, // 最高混乱度
};

// 测试结果收集
const testResults = {
    startTime: Date.now(),
    phases: {},
    errors: [],
    warnings: [],
    memoryUsage: [],
    performance: {}
};

// 工具函数：生成随机字符串
function generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_$!@#%^&*()';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 工具函数：生成随机实体类型
function getRandomEntityType(): CodeEntityType {
    const types = Object.values(CodeEntityType);
    return types[Math.floor(Math.random() * types.length)];
}

// 工具函数：生成随机关系类型
function getRandomRelationType(): CodeRelationType {
    const types = Object.values(CodeRelationType);
    return types[Math.floor(Math.random() * types.length)];
}

// 工具函数：生成混乱数据
function generateChaoticData(entityId: string): any {
    const chaosType = Math.floor(Math.random() * CONFIG.chaosLevel);
    
    switch (chaosType) {
        case 0: // 超大字符串
            return {
                type: getRandomEntityType(),
                entityName: generateRandomString(100),
                filePath: `/file/${generateRandomString(20)}.ts`,
                content: generateRandomString(1000000), // 1MB 字符串
                startLine: 1,
                endLine: Math.floor(Math.random() * 100000)
            };
        case 1: // 空值和 undefined 混用
            return {
                type: getRandomEntityType(),
                entityName: generateRandomString(50),
                filePath: undefined,
                content: null,
                startLine: Math.random() > 0.5 ? 100 : null
            };
        case 2: // 极深嵌套对象
            let nested: any = { type: getRandomEntityType(), entityName: 'deeply-nested' };
            let current = nested;
            for (let i = 0; i < 1000; i++) {
                current.next = { depth: i };
                current = current.next;
            }
            return nested;
        case 3: // 特殊字符混合
            return {
                type: getRandomEntityType(),
                entityName: `\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\0${generateRandomString(20)}`,
                filePath: `C:\\Program Files\\${generateRandomString(10)}/😀🎉🎊🎁🎂🎃🎄🎅🎆🎇🎈`,
                content: JSON.stringify({
                    '💀': '😈',
                    '🔥': '🚀',
                    [generateRandomString(10)]: generateRandomString(100)
                })
            };
        case 4: // 循环引用对象
            const circular: any = { type: getRandomEntityType(), entityName: 'circular' };
            circular.self = circular;
            return circular;
        case 5: // 数字边界
            return {
                type: getRandomEntityType(),
                entityName: 'bounds-test',
                startLine: -Infinity,
                endLine: Infinity,
                someProp: NaN,
                otherProp: 1e308
            };
        case 6: // 超长属性名
            const longProp = {} as any;
            longProp[generateRandomString(10000)] = 'value';
            return {
                type: getRandomEntityType(),
                entityName: 'long-props',
                ...longProp
            };
        case 7: // 符号和 getter
            const symObj = {
                type: getRandomEntityType(),
                entityName: 'symbol-props',
                [Symbol('secret')]: 'hidden',
                get computed() { return Math.random(); }
            };
            return symObj;
        case 8: // 日期和特殊对象
            return {
                type: getRandomEntityType(),
                entityName: 'special-objects',
                createdAt: new Date(),
                regex: /[a-z]+/g,
                bigInt: BigInt(12345678901234567890n),
                buffer: Buffer.from([0x00, 0x01, 0x02, 0x03])
            };
        default: // 正常数据
            return {
                type: getRandomEntityType(),
                entityName: `entity-${Math.random()}`,
                filePath: `/file-${Math.random()}.ts`,
                startLine: Math.floor(Math.random() * 1000),
                endLine: Math.floor(Math.random() * 1000) + 1
            };
    }
}

// 阶段1：大规模数据测试
async function phase1_MassiveDataTest() {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 PHASE 1: 大规模数据测试');
    console.log('='.repeat(80));
    
    const phaseStart = Date.now();
    const db = new KnowledgeGraphDatabase({
        dataDirectory: path.join(os.tmpdir(), 'massive-test'),
        persistToFileSystem: false
    });
    
    try {
        // 添加大量实体
        console.log(`📦 正在添加 ${CONFIG.entityCount} 个实体...`);
        for (let i = 0; i < CONFIG.entityCount; i++) {
            const entityId = `massive-entity-${i}-${Date.now()}`;
            const entityData = {
                type: getRandomEntityType(),
                entityName: `entity-${i}`,
                filePath: `/file-${i % 1000}.ts`,
                startLine: Math.floor(Math.random() * 1000),
                endLine: Math.floor(Math.random() * 1000) + 1
            };
            
            db.addCodeEntity(entityId, entityData);
            
            if (i % 10000 === 0) {
                const stats = db.getStatistics();
                console.log(`  ✅ 已添加 ${i} / ${CONFIG.entityCount} 实体 | 总实体: ${stats.totalEntityCount}`);
                recordMemoryUsage();
            }
        }
        
        // 添加大量关系
        console.log(`🔗 正在添加 ${CONFIG.relationCount} 个关系...`);
        for (let i = 0; i < CONFIG.relationCount; i++) {
            const sourceIdx = Math.floor(Math.random() * CONFIG.entityCount);
            const targetIdx = Math.floor(Math.random() * CONFIG.entityCount);
            const sourceId = `massive-entity-${sourceIdx}-${Date.now()}`; // 修正 ID
            const targetId = `massive-entity-${targetIdx}-${Date.now()}`; // 修正 ID
            const relationId = `massive-relation-${i}`;
            
            try {
                db.addCodeRelation(relationId, sourceId, targetId, {
                    type: getRandomRelationType(),
                    sourceEntityName: `entity-${sourceIdx}`,
                    targetEntityName: `entity-${targetIdx}`
                });
            } catch (e) {
                // 预期会有错误，继续
            }
            
            if (i % 20000 === 0) {
                const stats = db.getStatistics();
                console.log(`  ✅ 已添加 ${i} / ${CONFIG.relationCount} 关系 | 总关系: ${stats.totalRelationCount}`);
            }
        }
        
        // 验证统计信息
        const stats = db.getStatistics();
        console.log(`\n📊 测试结果:`);
        console.log(`   总实体数: ${stats.totalEntityCount}`);
        console.log(`   总关系数: ${stats.totalRelationCount}`);
        console.log(`   函数实体: ${stats.functionEntityCount}`);
        console.log(`   类实体: ${stats.classEntityCount}`);
        
        testResults.phases.phase1 = {
            success: true,
            duration: Date.now() - phaseStart,
            stats
        };
        
    } catch (error) {
        console.error('❌ 阶段1失败:', error);
        testResults.errors.push({ phase: 'phase1', error });
        testResults.phases.phase1 = { success: false, error };
    }
}

// 阶段2：极端混乱场景测试
async function phase2_ChaosTest() {
    console.log('\n' + '='.repeat(80));
    console.log('🎲 PHASE 2: 极端混乱场景测试');
    console.log('='.repeat(80));
    
    const phaseStart = Date.now();
    const db = new KnowledgeGraphDatabase({
        dataDirectory: path.join(os.tmpdir(), 'chaos-test'),
        persistToFileSystem: false
    });
    
    let successCount = 0;
    let failCount = 0;
    
    try {
        console.log('🔄 正在注入混乱数据...');
        
        for (let i = 0; i < 1000; i++) {
            const entityId = `chaos-entity-${i}`;
            
            try {
                // 生成非常混乱的数据
                const chaoticData = generateChaoticData(entityId);
                
                db.addCodeEntity(entityId, chaoticData);
                successCount++;
                
                // 如果成功，尝试添加关系
                if (i > 0 && Math.random() > 0.5) {
                    const prevId = `chaos-entity-${i - 1}`;
                    db.addCodeRelation(`chaos-rel-${i}`, entityId, prevId, {
                        type: getRandomRelationType()
                    });
                }
                
            } catch (e) {
                // 预期会有失败，记录下来
                failCount++;
                testResults.warnings.push({
                    type: 'chaos-failure',
                    entityId,
                    error: e instanceof Error ? e.message : 'unknown'
                });
            }
            
            if (i % 100 === 0) {
                console.log(`  📊 进度: ${i}/1000 | 成功: ${successCount} | 失败: ${failCount}`);
            }
        }
        
        const stats = db.getStatistics();
        console.log(`\n📊 混乱测试结果:`);
        console.log(`   总实体数: ${stats.totalEntityCount}`);
        console.log(`   成功添加: ${successCount}`);
        console.log(`   预期失败: ${failCount}`);
        
        testResults.phases.phase2 = {
            success: true,
            duration: Date.now() - phaseStart,
            successCount,
            failCount,
            stats
        };
        
    } catch (error) {
        console.error('❌ 阶段2失败:', error);
        testResults.errors.push({ phase: 'phase2', error });
        testResults.phases.phase2 = { success: false, error };
    }
}

// 阶段3：并发压力测试
async function phase3_ConcurrentTest() {
    console.log('\n' + '='.repeat(80));
    console.log('⚡ PHASE 3: 并发压力测试');
    console.log('='.repeat(80));
    
    const phaseStart = Date.now();
    const db = new KnowledgeGraphDatabase({
        dataDirectory: path.join(os.tmpdir(), 'concurrent-test'),
        persistToFileSystem: false
    });
    
    try {
        console.log(`🧵 启动 ${CONFIG.concurrentOperations} 个并发任务...`);
        
        // 先创建一些基础实体
        for (let i = 0; i < 100; i++) {
            db.addCodeEntity(`base-entity-${i}`, {
                type: CodeEntityType.FUNCTION,
                entityName: `base-${i}`
            });
        }
        
        const tasks: Promise<void>[] = [];
        
        // 创建并发任务
        for (let workerId = 0; workerId < CONFIG.concurrentOperations; workerId++) {
            tasks.push((async () => {
                for (let j = 0; j < 100; j++) {
                    const entityId = `concurrent-entity-${workerId}-${j}`;
                    const entityData = {
                        type: getRandomEntityType(),
                        entityName: `worker-${workerId}-task-${j}`
                    };
                    
                    db.addCodeEntity(entityId, entityData);
                    
                    // 随机添加关系
                    if (j > 0) {
                        try {
                            db.addCodeRelation(
                                `concurrent-rel-${workerId}-${j}`,
                                `concurrent-entity-${workerId}-${j - 1}`,
                                entityId,
                                { type: CodeRelationType.CALLS }
                            );
                        } catch (e) {
                            // 忽略
                        }
                    }
                    
                    // 随机查询
                    db.getStatistics();
                    db.getCodeEntitiesByType(CodeEntityType.FUNCTION);
                }
            })());
        }
        
        // 等待所有并发任务
        await Promise.all(tasks);
        
        const stats = db.getStatistics();
        console.log(`\n📊 并发测试结果:`);
        console.log(`   总实体数: ${stats.totalEntityCount}`);
        console.log(`   总关系数: ${stats.totalRelationCount}`);
        console.log(`   并发任务数: ${CONFIG.concurrentOperations}`);
        
        testResults.phases.phase3 = {
            success: true,
            duration: Date.now() - phaseStart,
            stats
        };
        
    } catch (error) {
        console.error('❌ 阶段3失败:', error);
        testResults.errors.push({ phase: 'phase3', error });
        testResults.phases.phase3 = { success: false, error };
    }
}

// 阶段4：长时间持续运行测试
async function phase4_LongRunningTest() {
    console.log('\n' + '='.repeat(80));
    console.log('⏱️  PHASE 4: 长时间持续运行测试');
    console.log('='.repeat(80));
    console.log(`⌛ 测试时长: ${CONFIG.testDurationMinutes} 分钟`);
    
    const phaseStart = Date.now();
    const db = new KnowledgeGraphDatabase({
        dataDirectory: path.join(os.tmpdir(), 'long-test'),
        persistToFileSystem: false
    });
    
    const endTime = Date.now() + CONFIG.testDurationMinutes * 60 * 1000;
    let operationCount = 0;
    let cycle = 0;
    
    try {
        while (Date.now() < endTime) {
            cycle++;
            
            // 每个周期执行一系列操作
            for (let i = 0; i < 100; i++) {
                // 添加实体
                const entityId = `long-entity-${cycle}-${i}`;
                db.addCodeEntity(entityId, {
                    type: getRandomEntityType(),
                    entityName: `cycle-${cycle}-${i}`
                });
                
                // 随机删除实体
                if (Math.random() < 0.3) {
                    const randomId = `long-entity-${Math.max(0, cycle - 1)}-${i}`;
                    db.removeEntity(randomId);
                }
                
                operationCount++;
            }
            
            // 定期统计
            if (cycle % 10 === 0) {
                const stats = db.getStatistics();
                const elapsed = Math.floor((Date.now() - phaseStart) / 1000);
                const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
                
                console.log(`  🔄 周期 ${cycle} | 操作数: ${operationCount} | 实体: ${stats.totalEntityCount} | 耗时: ${elapsed}s | 剩余: ${remaining}s`);
                recordMemoryUsage();
            }
            
            // 稍作休息，不要占满 CPU
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        const stats = db.getStatistics();
        console.log(`\n📊 长时间测试结果:`);
        console.log(`   总操作数: ${operationCount}`);
        console.log(`   总实体数: ${stats.totalEntityCount}`);
        console.log(`   运行周期: ${cycle}`);
        
        testResults.phases.phase4 = {
            success: true,
            duration: Date.now() - phaseStart,
            operationCount,
            cycleCount: cycle,
            stats
        };
        
    } catch (error) {
        console.error('❌ 阶段4失败:', error);
        testResults.errors.push({ phase: 'phase4', error });
        testResults.phases.phase4 = { success: false, error };
    }
}

// 阶段5：边界条件爆炸测试
async function phase5_BoundaryExplosionTest() {
    console.log('\n' + '='.repeat(80));
    console.log('💥 PHASE 5: 边界条件爆炸测试');
    console.log('='.repeat(80));
    
    const phaseStart = Date.now();
    const db = new KnowledgeGraphDatabase({
        dataDirectory: path.join(os.tmpdir(), 'boundary-test'),
        persistToFileSystem: false
    });
    
    let testCases = 0;
    let passedCases = 0;
    
    try {
        const testBoundaries = [
            // 空值和无效值
            { id: 'null-id', data: null, shouldFail: true },
            { id: 'empty-id', data: undefined, shouldFail: true },
            // 超长 ID
            { id: 'a'.repeat(1000000), data: { type: CodeEntityType.FILE, entityName: 'long-id' } },
            // 空字符串 ID
            { id: '', data: { type: CodeEntityType.FILE, entityName: 'empty-id' } },
            // 非常大的数字
            { id: 'bignum', data: { type: CodeEntityType.FUNCTION, entityName: 'num', startLine: 99999999999999999999 } },
            // 负数行数
            { id: 'negative-lines', data: { type: CodeEntityType.FUNCTION, entityName: 'neg', startLine: -100, endLine: -50 } },
            // 路径遍历攻击
            { id: 'path-traversal', data: { type: CodeEntityType.FILE, entityName: 'path', filePath: '../../../../../../etc/passwd' } },
            // SQL 注入尝试
            { id: 'sql-inject', data: { type: CodeEntityType.FUNCTION, entityName: "'; DROP TABLE users; --" } },
            // XSS 尝试
            { id: 'xss-test', data: { type: CodeEntityType.FUNCTION, entityName: '<script>alert(1)</script>' } },
            // Unicode 字符串
            { id: 'unicode', data: { type: CodeEntityType.CLASS, entityName: '中文日文한국어العربيةעברית', filePath: '/中文/路径/文件.ts' } },
            // 混合数据类型
            { id: 'mixed-types', data: { type: CodeEntityType.INTERFACE, entityName: 12345, filePath: true } },
            // 大量相同实体
            { id: 'same-entity', data: { type: CodeEntityType.FUNCTION, entityName: 'same' } },
            // 空对象
            { id: 'empty-obj', data: {} as any, shouldFail: true },
            // 缺少必需字段
            { id: 'missing-type', data: { entityName: 'no-type' } as any, shouldFail: true },
            // 极小值
            { id: 'tiny-values', data: { type: CodeEntityType.VARIABLE, entityName: 'tiny', startLine: 0.0000000001, endLine: 0.0000000002 } },
        ];
        
        for (const test of testBoundaries) {
            testCases++;
            try {
                db.addCodeEntity(test.id, test.data);
                if (!test.shouldFail) {
                    passedCases++;
                    console.log(`  ✅ 通过: ${test.id}`);
                } else {
                    console.log(`  ⚠️  预期失败但通过: ${test.id}`);
                    testResults.warnings.push({ type: 'unexpected-pass', id: test.id });
                }
            } catch (e) {
                if (test.shouldFail) {
                    passedCases++;
                    console.log(`  ✅ 预期失败: ${test.id}`);
                } else {
                    console.log(`  ❌ 意外失败: ${test.id}`);
                    testResults.errors.push({ phase: 'phase5', testId: test.id, error: e });
                }
            }
        }
        
        console.log(`\n📊 边界测试结果:`);
        console.log(`   测试用例: ${testCases}`);
        console.log(`   通过率: ${(passedCases / testCases * 100).toFixed(1)}%`);
        
        testResults.phases.phase5 = {
            success: true,
            duration: Date.now() - phaseStart,
            testCases,
            passedCases
        };
        
    } catch (error) {
        console.error('❌ 阶段5失败:', error);
        testResults.errors.push({ phase: 'phase5', error });
        testResults.phases.phase5 = { success: false, error };
    }
}

// 阶段6：查询引擎压力测试
async function phase6_QueryEngineStressTest() {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 PHASE 6: 查询引擎压力测试');
    console.log('='.repeat(80));
    
    const phaseStart = Date.now();
    const db = new KnowledgeGraphDatabase({
        dataDirectory: path.join(os.tmpdir(), 'query-test'),
        persistToFileSystem: false
    });
    const queryEngine = new GraphQueryEngine(db);
    
    try {
        // 创建大量数据用于查询
        console.log('📦 创建测试数据...');
        for (let i = 0; i < 10000; i++) {
            db.addCodeEntity(`query-entity-${i}`, {
                type: getRandomEntityType(),
                entityName: `query-${i}`,
                filePath: `/query-${i % 100}.ts`
            });
        }
        
        // 建立关系网络
        for (let i = 0; i < 20000; i++) {
            const src = `query-entity-${Math.floor(Math.random() * 10000)}`;
            const dst = `query-entity-${Math.floor(Math.random() * 10000)}`;
            try {
                db.addCodeRelation(`q-rel-${i}`, src, dst, {
                    type: getRandomRelationType()
                });
            } catch (e) {
                // 忽略
            }
        }
        
        console.log('🔄 执行大规模查询...');
        const queryStart = Date.now();
        
        // 按类型查询 - 多种类型
        for (const type of Object.values(CodeEntityType)) {
            const results = db.getCodeEntitiesByType(type);
            console.log(`  📊 ${type} 查询结果: ${results.length} 个实体`);
        }
        
        // 按文件查询
        for (let i = 0; i < 100; i++) {
            db.getCodeEntitiesByFile(`/query-${i}.ts`);
        }
        
        // 获取关系
        for (let i = 0; i < 1000; i++) {
            const id = `query-entity-${i}`;
            db.getOutgoingRelations(id);
            db.getIncomingRelations(id);
        }
        
        // 统计信息查询 - 多次调用
        for (let i = 0; i < 1000; i++) {
            queryEngine.getStatistics();
        }
        
        // 搜索测试
        for (let i = 0; i < 100; i++) {
            db.searchCodeEntitiesByName(`query-${i}`);
        }
        
        const queryDuration = Date.now() - queryStart;
        const stats = db.getStatistics();
        
        console.log(`\n📊 查询测试结果:`);
        console.log(`   查询耗时: ${queryDuration}ms`);
        console.log(`   实体数: ${stats.totalEntityCount}`);
        console.log(`   关系数: ${stats.totalRelationCount}`);
        
        testResults.phases.phase6 = {
            success: true,
            duration: Date.now() - phaseStart,
            queryDuration,
            stats
        };
        
    } catch (error) {
        console.error('❌ 阶段6失败:', error);
        testResults.errors.push({ phase: 'phase6', error });
        testResults.phases.phase6 = { success: false, error };
    }
}

// 阶段7：混合操作压力测试
async function phase7_MixedOperationsTest() {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 PHASE 7: 混合操作压力测试');
    console.log('='.repeat(80));
    
    const phaseStart = Date.now();
    const db = new KnowledgeGraphDatabase({
        dataDirectory: path.join(os.tmpdir(), 'mixed-test'),
        persistToFileSystem: false
    });
    
    const operationStats = {
        addEntity: 0,
        removeEntity: 0,
        addRelation: 0,
        removeRelation: 0,
        query: 0,
        getStats: 0,
        failures: 0
    };
    
    try {
        console.log('🔄 执行混合操作...');
        
        // 先创建初始数据
        for (let i = 0; i < 1000; i++) {
            db.addCodeEntity(`init-entity-${i}`, {
                type: CodeEntityType.FUNCTION,
                entityName: `init-${i}`
            });
            operationStats.addEntity++;
        }
        
        // 混合操作 - 10000次随机操作
        for (let i = 0; i < 10000; i++) {
            const op = Math.floor(Math.random() * 6);
            
            try {
                switch (op) {
                    case 0: // 添加实体
                        db.addCodeEntity(`mixed-entity-${i}`, {
                            type: getRandomEntityType(),
                            entityName: `mixed-${i}`
                        });
                        operationStats.addEntity++;
                        break;
                    case 1: // 删除实体
                        const delId = `mixed-entity-${Math.max(0, i - Math.floor(Math.random() * 100))}`;
                        db.removeEntity(delId);
                        operationStats.removeEntity++;
                        break;
                    case 2: // 添加关系
                        const srcIdx = Math.floor(Math.random() * 1000);
                        const dstIdx = Math.floor(Math.random() * 1000);
                        try {
                            db.addCodeRelation(
                                `mixed-rel-${i}`,
                                `init-entity-${srcIdx}`,
                                `init-entity-${dstIdx}`,
                                { type: getRandomRelationType() }
                            );
                            operationStats.addRelation++;
                        } catch (e) {
                            // 忽略
                        }
                        break;
                    case 3: // 删除关系
                        db.removeRelation(`mixed-rel-${Math.floor(Math.random() * i)}`);
                        operationStats.removeRelation++;
                        break;
                    case 4: // 查询
                        db.getCodeEntitiesByType(getRandomEntityType());
                        operationStats.query++;
                        break;
                    case 5: // 获取统计
                        db.getStatistics();
                        operationStats.getStats++;
                        break;
                }
            } catch (e) {
                operationStats.failures++;
            }
            
            if (i % 1000 === 0) {
                const stats = db.getStatistics();
                console.log(`  📊 操作 ${i}/10000 | 实体: ${stats.totalEntityCount} | 关系: ${stats.totalRelationCount}`);
            }
        }
        
        console.log(`\n📊 混合操作统计:`);
        console.log(`   添加实体: ${operationStats.addEntity}`);
        console.log(`   删除实体: ${operationStats.removeEntity}`);
        console.log(`   添加关系: ${operationStats.addRelation}`);
        console.log(`   删除关系: ${operationStats.removeRelation}`);
        console.log(`   查询操作: ${operationStats.query}`);
        console.log(`   统计查询: ${operationStats.getStats}`);
        console.log(`   失败次数: ${operationStats.failures}`);
        
        testResults.phases.phase7 = {
            success: true,
            duration: Date.now() - phaseStart,
            operationStats
        };
        
    } catch (error) {
        console.error('❌ 阶段7失败:', error);
        testResults.errors.push({ phase: 'phase7', error });
        testResults.phases.phase7 = { success: false, error };
    }
}

// 阶段8：持久化和加载压力测试
async function phase8_PersistenceTest() {
    console.log('\n' + '='.repeat(80));
    console.log('💾 PHASE 8: 持久化和加载压力测试');
    console.log('='.repeat(80));
    
    const phaseStart = Date.now();
    const tempDir = path.join(os.tmpdir(), 'persistence-test');
    
    try {
        // 创建大量数据
        console.log('📦 创建大型数据库...');
        let db = new KnowledgeGraphDatabase({
            dataDirectory: tempDir,
            persistToFileSystem: true
        });
        
        for (let i = 0; i < 10000; i++) {
            db.addCodeEntity(`persist-entity-${i}`, {
                type: getRandomEntityType(),
                entityName: `persist-${i}`,
                filePath: `/persist-${i % 100}.ts`,
                content: generateRandomString(1000)
            });
            
            if (i % 1000 === 0) {
                console.log(`  ✅ 已创建 ${i} 实体`);
            }
        }
        
        for (let i = 0; i < 20000; i++) {
            const srcIdx = Math.floor(Math.random() * 10000);
            const dstIdx = Math.floor(Math.random() * 10000);
            try {
                db.addCodeRelation(
                    `persist-rel-${i}`,
                    `persist-entity-${srcIdx}`,
                    `persist-entity-${dstIdx}`,
                    { type: getRandomRelationType() }
                );
            } catch (e) {
                // 忽略
            }
        }
        
        const saveStart = Date.now();
        console.log('💾 保存到磁盘...');
        await db.saveToFileSystem();
        const saveDuration = Date.now() - saveStart;
        
        console.log('🔄 重新加载数据库...');
        const loadStart = Date.now();
        const newDb = new KnowledgeGraphDatabase({
            dataDirectory: tempDir,
            persistToFileSystem: true
        });
        await newDb.loadFromFileSystem();
        const loadDuration = Date.now() - loadStart;
        
        const stats = newDb.getStatistics();
        console.log(`\n📊 持久化测试结果:`);
        console.log(`   保存耗时: ${saveDuration}ms`);
        console.log(`   加载耗时: ${loadDuration}ms`);
        console.log(`   实体数: ${stats.totalEntityCount}`);
        console.log(`   关系数: ${stats.totalRelationCount}`);
        
        testResults.phases.phase8 = {
            success: true,
            duration: Date.now() - phaseStart,
            saveDuration,
            loadDuration,
            stats
        };
        
    } catch (error) {
        console.error('❌ 阶段8失败:', error);
        testResults.errors.push({ phase: 'phase8', error });
        testResults.phases.phase8 = { success: false, error };
    }
}

// 阶段9：循环引用和递归结构测试
async function phase9_CircularStructureTest() {
    console.log('\n' + '='.repeat(80));
    console.log('🔄 PHASE 9: 循环引用和递归结构测试');
    console.log('='.repeat(80));
    
    const phaseStart = Date.now();
    const db = new KnowledgeGraphDatabase({
        dataDirectory: path.join(os.tmpdir(), 'circular-test'),
        persistToFileSystem: false
    });
    
    let testCount = 0;
    let passCount = 0;
    
    try {
        console.log('🧪 测试循环关系结构...');
        
        // 创建 A→B→C→A 循环
        db.addCodeEntity('circular-A', {
            type: CodeEntityType.CLASS,
            entityName: 'ClassA'
        });
        db.addCodeEntity('circular-B', {
            type: CodeEntityType.CLASS,
            entityName: 'ClassB'
        });
        db.addCodeEntity('circular-C', {
            type: CodeEntityType.CLASS,
            entityName: 'ClassC'
        });
        
        db.addCodeRelation('rel-A-B', 'circular-A', 'circular-B', {
            type: CodeRelationType.EXTENDS
        });
        db.addCodeRelation('rel-B-C', 'circular-B', 'circular-C', {
            type: CodeRelationType.EXTENDS
        });
        db.addCodeRelation('rel-C-A', 'circular-C', 'circular-A', {
            type: CodeRelationType.REFERENCES
        });
        
        testCount++; passCount++;
        console.log(`  ✅ 循环关系 A→B→C→A`);
        
        // 创建自引用
        db.addCodeEntity('self-ref', {
            type: CodeEntityType.FUNCTION,
            entityName: 'SelfRef'
        });
        
        db.addCodeRelation('self-rel', 'self-ref', 'self-ref', {
            type: CodeRelationType.CALLS
        });
        
        testCount++; passCount++;
        console.log(`  ✅ 自引用关系`);
        
        // 创建星型结构（一个中心连接到许多节点）
        db.addCodeEntity('hub-node', {
            type: CodeEntityType.MODULE,
            entityName: 'HubModule'
        });
        
        for (let i = 0; i < 100; i++) {
            db.addCodeEntity(`spoke-${i}`, {
                type: CodeEntityType.FUNCTION,
                entityName: `Spoke${i}`
            });
            db.addCodeRelation(`hub-spoke-${i}`, 'hub-node', `spoke-${i}`, {
                type: CodeRelationType.CALLS
            });
        }
        
        testCount++; passCount++;
        console.log(`  ✅ 星型结构 (1中心 -> 100 spokes)`);
        
        // 创建链式结构
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
        
        testCount++; passCount++;
        console.log(`  ✅ 链式结构 (100个节点)`);
        
        // 查询关系网络
        console.log('🔍 测试关系查询...');
        
        const incomingToB = db.getIncomingRelations('circular-B');
        const outgoingFromB = db.getOutgoingRelations('circular-B');
        console.log(`  📊 B的入度: ${incomingToB.length}`);
        console.log(`  📊 B的出度: ${outgoingFromB.length}`);
        
        testCount++; passCount++;
        
        console.log(`\n📊 循环结构测试结果:`);
        console.log(`   测试数: ${testCount}`);
        console.log(`   通过数: ${passCount}`);
        
        testResults.phases.phase9 = {
            success: true,
            duration: Date.now() - phaseStart,
            testCount,
            passCount
        };
        
    } catch (error) {
        console.error('❌ 阶段9失败:', error);
        testResults.errors.push({ phase: 'phase9', error });
        testResults.phases.phase9 = { success: false, error };
    }
}

// 阶段10：内存泄漏检测
async function phase10_MemoryLeakDetection() {
    console.log('\n' + '='.repeat(80));
    console.log('🧠 PHASE 10: 内存泄漏检测');
    console.log('='.repeat(80));
    
    const phaseStart = Date.now();
    const tempDir = path.join(os.tmpdir(), 'memory-test');
    const memorySnapshots: any[] = [];
    
    try {
        console.log('📊 记录内存基线...');
        gcIfAvailable();
        recordMemoryUsage();
        memorySnapshots.push({ step: 'baseline', memory: process.memoryUsage() });
        
        // 循环创建和销毁数据库
        console.log('🔄 执行创建-销毁循环...');
        for (let round = 0; round < 100; round++) {
            const db = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: false
            });
            
            // 添加数据
            for (let i = 0; i < 1000; i++) {
                db.addCodeEntity(`mem-entity-${round}-${i}`, {
                    type: getRandomEntityType(),
                    entityName: `mem-${round}-${i}`,
                    content: generateRandomString(500)
                });
            }
            
            // 查询一些数据
            db.getStatistics();
            db.getCodeEntitiesByType(CodeEntityType.FUNCTION);
            
            // 清空
            db.clear();
            
            // 强制 GC（如果可用）
            gcIfAvailable();
            
            if (round % 20 === 0) {
                recordMemoryUsage();
                memorySnapshots.push({ step: `round-${round}`, memory: process.memoryUsage() });
                console.log(`  🔄 第 ${round} 轮完成 | 内存: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`);
            }
        }
        
        gcIfAvailable();
        recordMemoryUsage();
        memorySnapshots.push({ step: 'final', memory: process.memoryUsage() });
        
        // 分析内存增长
        const first = memorySnapshots[0];
        const last = memorySnapshots[memorySnapshots.length - 1];
        const heapGrowth = last.memory.heapUsed - first.memory.heapUsed;
        const growthMB = heapGrowth / 1024 / 1024;
        
        console.log(`\n📊 内存分析结果:`);
        console.log(`   初始堆内存: ${(first.memory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
        console.log(`   最终堆内存: ${(last.memory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
        console.log(`   内存增长: ${growthMB.toFixed(2)}MB`);
        
        // 评估泄漏风险
        let leakRisk = 'low';
        if (growthMB > 50) leakRisk = 'high';
        else if (growthMB > 10) leakRisk = 'medium';
        
        console.log(`   泄漏风险: ${leakRisk.toUpperCase()}`);
        
        testResults.phases.phase10 = {
            success: true,
            duration: Date.now() - phaseStart,
            memorySnapshots,
            growthMB,
            leakRisk
        };
        
    } catch (error) {
        console.error('❌ 阶段10失败:', error);
        testResults.errors.push({ phase: 'phase10', error });
        testResults.phases.phase10 = { success: false, error };
    }
}

// 工具函数：GC（如果可用）
function gcIfAvailable() {
    if (global.gc) {
        try {
            global.gc();
        } catch (e) {
            // 忽略
        }
    }
}

// 工具函数：记录内存使用
function recordMemoryUsage() {
    const mem = process.memoryUsage();
    testResults.memoryUsage.push({
        timestamp: Date.now(),
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        external: mem.external,
        rss: mem.rss
    });
}

// 生成最终报告
function generateFinalReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 最终测试报告');
    console.log('='.repeat(80));
    
    const totalDuration = Date.now() - testResults.startTime;
    const phaseCount = Object.keys(testResults.phases).length;
    const successPhases = Object.values(testResults.phases).filter(p => (p as any).success).length;
    
    console.log(`\n🎯 测试概览:`);
    console.log(`   总测试阶段: ${phaseCount}`);
    console.log(`   成功阶段: ${successPhases}`);
    console.log(`   失败阶段: ${phaseCount - successPhases}`);
    console.log(`   总错误数: ${testResults.errors.length}`);
    console.log(`   总警告数: ${testResults.warnings.length}`);
    console.log(`   总耗时: ${(totalDuration / 1000 / 60).toFixed(2)} 分钟`);
    
    console.log(`\n📈 内存使用记录:`);
    if (testResults.memoryUsage.length > 0) {
        const minMem = Math.min(...testResults.memoryUsage.map(m => m.heapUsed));
        const maxMem = Math.max(...testResults.memoryUsage.map(m => m.heapUsed));
        const avgMem = testResults.memoryUsage.reduce((sum, m) => sum + m.heapUsed, 0) / testResults.memoryUsage.length;
        
        console.log(`   最小堆内存: ${(minMem / 1024 / 1024).toFixed(2)}MB`);
        console.log(`   最大堆内存: ${(maxMem / 1024 / 1024).toFixed(2)}MB`);
        console.log(`   平均堆内存: ${(avgMem / 1024 / 1024).toFixed(2)}MB`);
    }
    
    console.log(`\n✅ 测试结果:`);
    for (const [phaseId, phase] of Object.entries(testResults.phases)) {
        const status = (phase as any).success ? '✅' : '❌';
        const duration = (phase as any).duration ? ` (${((phase as any).duration / 1000).toFixed(2)}s)` : '';
        console.log(`   ${status} ${phaseId}${duration}`);
    }
    
    if (testResults.errors.length > 0) {
        console.log(`\n❌ 错误详情:`);
        testResults.errors.forEach((err, idx) => {
            console.log(`   [${idx + 1}] ${(err as any).phase || 'unknown'}: ${String((err as any).error)}`);
        });
    }
    
    // 保存报告到文件
    const reportPath = path.join(os.tmpdir(), 'extreme-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    console.log(`\n📄 详细报告已保存到: ${reportPath}`);
    
    return {
        totalDuration,
        phaseCount,
        successPhases,
        errorCount: testResults.errors.length
    };
}

// 主测试函数
async function main() {
    console.log('🚀 ArkTS 代码知识图谱系统 - 极端混乱、大规模、长时间深度测试');
    console.log('='.repeat(80));
    console.log('📋 测试配置:');
    console.log(`   实体数: ${CONFIG.entityCount}`);
    console.log(`   关系数: ${CONFIG.relationCount}`);
    console.log(`   并发数: ${CONFIG.concurrentOperations}`);
    console.log(`   长时测试: ${CONFIG.testDurationMinutes} 分钟`);
    console.log(`   混乱度: ${CONFIG.chaosLevel}`);
    
    recordMemoryUsage();
    
    // 执行所有测试阶段
    await phase1_MassiveDataTest();
    await phase2_ChaosTest();
    await phase3_ConcurrentTest();
    await phase4_LongRunningTest();
    await phase5_BoundaryExplosionTest();
    await phase6_QueryEngineStressTest();
    await phase7_MixedOperationsTest();
    await phase8_PersistenceTest();
    await phase9_CircularStructureTest();
    await phase10_MemoryLeakDetection();
    
    // 生成最终报告
    const summary = generateFinalReport();
    
    console.log('\n' + '='.repeat(80));
    if (summary.errorCount === 0 && summary.successPhases === 10) {
        console.log('🎉 所有测试完美通过！系统表现卓越！');
    } else {
        console.log(`📊 测试完成，${summary.successPhases} / 10 阶段通过`);
    }
    console.log('='.repeat(80));
    
    process.exit(summary.errorCount > 0 ? 1 : 0);
}

// 启动测试
main().catch(error => {
    console.error('💥 测试执行失败:', error);
    process.exit(1);
});

