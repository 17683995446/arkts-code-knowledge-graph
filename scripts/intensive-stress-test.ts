import { MultiLanguageParser } from '../src/core/code-parser/MultiLanguageParser';
import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService';
import { ApplicationLogger } from '../src/infrastructure/logger/Logger';

const logger = ApplicationLogger.getInstance();

async function testScenario1_ConcurrentParsing() {
    logger.info('=== 测试场景1: 多源并发解析 ===');
    const parser = new MultiLanguageParser();
    
    const testPaths = [
        '/workspace/src/core',
        '/workspace/src/services', 
        '/workspace/src/api',
        '/workspace/tests',
        '/workspace/src/utils'
    ];
    
    const start = Date.now();
    const results = await Promise.all(
        testPaths.map(path => parser.parseDirectoryParallel(path, 5))
    );
    const duration = Date.now() - start;
    
    const totalEntities = results.reduce((sum, r) => sum + r.codeEntities.length, 0);
    const totalRelations = results.reduce((sum, r) => sum + r.codeRelations.length, 0);
    
    logger.info(`并发解析完成: ${duration}ms, ${totalEntities}个实体, ${totalRelations}个关系`);
    
    return { duration, totalEntities, totalRelations, paths: testPaths.length };
}

async function testScenario2_LargeScaleGraph() {
    logger.info('=== 测试场景2: 大规模知识图谱构建 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    
    const start = Date.now();
    await service.buildKnowledgeGraph('/workspace/src');
    const buildTime = Date.now() - start;
    
    const stats = service.getStatistics();
    logger.info(`图谱构建完成: ${buildTime}ms, ${stats.nodeCount}节点, ${stats.edgeCount}边`);
    
    return { buildTime, nodeCount: stats.nodeCount, edgeCount: stats.edgeCount };
}

async function testScenario3_ComplexQueries() {
    logger.info('=== 测试场景3: 复杂查询测试 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.buildKnowledgeGraph('/workspace/src');
    
    const queries = [
        { name: 'findClasses', query: { type: 'class' } },
        { name: 'findFunctions', query: { type: 'function' } },
        { name: 'findExports', query: { type: 'export' } },
        { name: 'findByName', query: { name: 'Parser' } },
        { name: 'findByFile', query: { filePath: '/workspace/src/core/code-parser' } }
    ];
    
    const results: any = {};
    for (const q of queries) {
        const start = Date.now();
        const result = service.queryEntities(q.query);
        const duration = Date.now() - start;
        results[q.name] = { count: result.length, time: duration };
        logger.info(`查询${q.name}: ${result.length}结果, ${duration}ms`);
    }
    
    return results;
}

async function testScenario4_CacheStress() {
    logger.info('=== 测试场景4: 缓存压力测试 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    
    await service.buildKnowledgeGraph('/workspace/src');
    
    const iterations = 50;
    const start = Date.now();
    
    for (let i = 0; i < iterations; i++) {
        service.queryEntities({ type: 'class' });
        if (i % 10 === 0) {
            service.clearCache();
        }
    }
    
    const duration = Date.now() - start;
    const avgTime = duration / iterations;
    
    logger.info(`缓存压力测试: ${iterations}次迭代, ${duration}ms总时间, ${avgTime.toFixed(2)}ms平均`);
    
    return { iterations, totalTime: duration, avgTime };
}

async function testScenario5_MemoryLeakDetection() {
    logger.info('=== 测试场景5: 内存泄漏检测 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    
    const initialMemory = process.memoryUsage();
    logger.info(`初始内存: heapUsed=${(initialMemory.heapUsed/1024/1024).toFixed(2)}MB`);
    
    for (let i = 0; i < 20; i++) {
        await service.buildKnowledgeGraph('/workspace/src');
        service.clearCache();
    }
    
    if (global.gc) {
        global.gc();
    }
    
    const finalMemory = process.memoryUsage();
    const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
    
    logger.info(`最终内存: heapUsed=${(finalMemory.heapUsed/1024/1024).toFixed(2)}MB`);
    logger.info(`内存增长: ${memoryIncrease.toFixed(2)}MB`);
    
    return { initial: initialMemory.heapUsed, final: finalMemory.heapUsed, increase: memoryIncrease };
}

async function testScenario6_ConcurrentQueryStress() {
    logger.info('=== 测试场景6: 并发查询压力测试 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.buildKnowledgeGraph('/workspace/src');
    
    const concurrentLevels = [5, 10, 20, 50];
    const results: any = {};
    
    for (const level of concurrentLevels) {
        const start = Date.now();
        const promises = [];
        
        for (let i = 0; i < level; i++) {
            promises.push(service.queryEntities({ type: 'class' }));
            promises.push(service.queryEntities({ type: 'function' }));
        }
        
        await Promise.all(promises);
        const duration = Date.now() - start;
        
        results[level] = { duration, avgTime: duration / level };
        logger.info(`并发度${level}: ${duration}ms, 平均${(duration/level).toFixed(2)}ms`);
    }
    
    return results;
}

async function runAllTests() {
    logger.info('========== 开始综合压力测试 ==========');
    
    const testResults: any = {};
    
    try {
        testResults.scenario1 = await testScenario1_ConcurrentParsing();
    } catch (e) {
        logger.error(`场景1失败: ${e}`);
        testResults.scenario1 = { error: String(e) };
    }
    
    try {
        testResults.scenario2 = await testScenario2_LargeScaleGraph();
    } catch (e) {
        logger.error(`场景2失败: ${e}`);
        testResults.scenario2 = { error: String(e) };
    }
    
    try {
        testResults.scenario3 = await testScenario3_ComplexQueries();
    } catch (e) {
        logger.error(`场景3失败: ${e}`);
        testResults.scenario3 = { error: String(e) };
    }
    
    try {
        testResults.scenario4 = await testScenario4_CacheStress();
    } catch (e) {
        logger.error(`场景4失败: ${e}`);
        testResults.scenario4 = { error: String(e) };
    }
    
    try {
        testResults.scenario5 = await testScenario5_MemoryLeakDetection();
    } catch (e) {
        logger.error(`场景5失败: ${e}`);
        testResults.scenario5 = { error: String(e) };
    }
    
    try {
        testResults.scenario6 = await testScenario6_ConcurrentQueryStress();
    } catch (e) {
        logger.error(`场景6失败: ${e}`);
        testResults.scenario6 = { error: String(e) };
    }
    
    logger.info('========== 综合压力测试完成 ==========');
    console.log(JSON.stringify(testResults, null, 2));
    
    return testResults;
}

runAllTests().catch(console.error);
