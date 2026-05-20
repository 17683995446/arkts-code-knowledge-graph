import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService';
import { ApplicationLogger } from '../src/infrastructure/logger/Logger';
import { CodeEntityType } from '../src/shared';

const logger = ApplicationLogger.getInstance();

async function testScenario1_ProjectAnalysis() {
    logger.info('=== 场景1: 完整项目分析 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    
    const start = Date.now();
    const result = await service.analyzeProject('/workspace/src');
    const duration = Date.now() - start;
    
    const stats = service.getQueryEngine().getStatistics();
    
    logger.info(`分析完成: ${duration}ms, ${stats.nodeCount}节点, ${stats.edgeCount}边`);
    
    return { duration, nodeCount: stats.nodeCount, edgeCount: stats.edgeCount };
}

async function testScenario2_QueryPerformance() {
    logger.info('=== 场景2: 查询性能测试 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject('/workspace/src');
    
    const queryEngine = service.getQueryEngine();
    const queries = [
        { name: 'class查询', method: () => queryEngine.getEntitiesByType(CodeEntityType.CLASS) },
        { name: 'function查询', method: () => queryEngine.getEntitiesByType(CodeEntityType.FUNCTION) },
        { name: 'interface查询', method: () => queryEngine.getEntitiesByType(CodeEntityType.INTERFACE) },
        { name: 'variable查询', method: () => queryEngine.getEntitiesByType(CodeEntityType.VARIABLE) },
        { name: '名称搜索Parser', method: () => queryEngine.searchEntitiesByName('Parser') },
        { name: '名称搜索Service', method: () => queryEngine.searchEntitiesByName('Service') }
    ];
    
    const results: any = {};
    for (const query of queries) {
        const start = Date.now();
        const found = query.method();
        const duration = Date.now() - start;
        results[query.name] = { count: found.length, time: duration };
        logger.info(`${query.name}: ${found.length}结果, ${duration}ms`);
    }
    
    return results;
}

async function testScenario3_SemanticSearch() {
    logger.info('=== 场景3: 语义搜索测试 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject('/workspace/src');
    
    const semanticSearch = service.getSemanticSearch();
    const queries = [
        'code parsing',
        'knowledge graph',
        'file handling',
        'error handling',
        'service management'
    ];
    
    const results: any = {};
    for (const query of queries) {
        const start = Date.now();
        const searchResults = await semanticSearch.searchEntities(query, 5);
        const duration = Date.now() - start;
        results[query] = { count: searchResults.length, time: duration };
        logger.info(`语义搜索"${query}": ${searchResults.length}结果, ${duration}ms`);
    }
    
    const concurrentStart = Date.now();
    const concurrentResults = await Promise.all(
        queries.map(q => semanticSearch.searchEntities(q, 5))
    );
    const concurrentDuration = Date.now() - concurrentStart;
    
    logger.info(`并发语义搜索: ${concurrentDuration}ms`);
    results.concurrentTime = concurrentDuration;
    
    return results;
}

async function testScenario4_CacheOperations() {
    logger.info('=== 场景4: 缓存操作测试 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject('/workspace/src');
    
    const queryEngine = service.getQueryEngine();
    const iterations = 30;
    
    for (let i = 0; i < iterations; i++) {
        queryEngine.getEntitiesByType(CodeEntityType.CLASS);
        if (i % 10 === 0) {
            service.clearCache();
            logger.info(`清空缓存 (迭代${i})`);
        }
    }
    
    service.resetAll();
    const stats = service.getQueryEngine().getStatistics();
    logger.info(`重置后图谱: ${stats.nodeCount}节点`);
    
    return { iterations, finalNodes: stats.nodeCount };
}

async function testScenario5_ConcurrentAnalysis() {
    logger.info('=== 场景5: 并发项目分析 ===');
    
    const paths = [
        '/workspace/src/core',
        '/workspace/src/services',
        '/workspace/src/infrastructure',
        '/workspace/tests'
    ];
    
    const start = Date.now();
    const results = await Promise.all(
        paths.map(async (p) => {
            const s = new EnhancedCodeKnowledgeGraphService();
            return s.analyzeProject(p);
        })
    );
    const duration = Date.now() - start;
    
    const totalNodes = results.reduce((sum, r) => {
        const stats = r.knowledgeGraph.getStatistics();
        return sum + stats.nodeCount;
    }, 0);
    
    logger.info(`并发分析: ${duration}ms, ${totalNodes}总节点`);
    
    return { duration, totalNodes };
}

async function testScenario6_MemoryStress() {
    logger.info('=== 场景6: 内存压力测试 ===');
    
    const initialMemory = process.memoryUsage();
    logger.info(`初始: heap=${(initialMemory.heapUsed/1024/1024).toFixed(2)}MB`);
    
    for (let i = 0; i < 10; i++) {
        const service = new EnhancedCodeKnowledgeGraphService();
        await service.analyzeProject('/workspace/src');
        service.clearCache();
        if (i % 3 === 0) {
            const mem = process.memoryUsage();
            logger.info(`迭代${i}: heap=${(mem.heapUsed/1024/1024).toFixed(2)}MB`);
        }
    }
    
    if (global.gc) global.gc();
    
    const finalMemory = process.memoryUsage();
    const increase = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
    
    logger.info(`最终: heap=${(finalMemory.heapUsed/1024/1024).toFixed(2)}MB, 增长=${increase.toFixed(2)}MB`);
    
    return { increase: increase.toFixed(2) };
}

async function testScenario7_DataConsistency() {
    logger.info('=== 场景7: 数据一致性测试 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject('/workspace/src');
    
    const queryEngine = service.getQueryEngine();
    const iterations = 20;
    
    const firstResults = queryEngine.getEntitiesByType(CodeEntityType.CLASS);
    const firstIds = firstResults.map(e => e.entityId);
    
    let inconsistent = false;
    for (let i = 1; i < iterations; i++) {
        const results = queryEngine.getEntitiesByType(CodeEntityType.CLASS);
        const ids = results.map(e => e.entityId);
        if (JSON.stringify(firstIds) !== JSON.stringify(ids)) {
            inconsistent = true;
            logger.error(`第${i}次结果不一致!`);
        }
    }
    
    logger.info(`一致性测试: ${inconsistent ? '失败' : '通过'}`);
    
    return { consistent: !inconsistent };
}

async function testScenario8_EdgeCases() {
    logger.info('=== 场景8: 边界情况测试 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject('/workspace/src');
    
    const queryEngine = service.getQueryEngine();
    const semanticSearch = service.getSemanticSearch();
    
    const tests = [
        { name: '无效类型查询', method: () => queryEngine.getEntitiesByType('invalid' as CodeEntityType) },
        { name: '空名称搜索', method: () => queryEngine.searchEntitiesByName('') },
        { name: '超长名称搜索', method: () => queryEngine.searchEntitiesByName('a'.repeat(1000)) },
        { name: '空语义搜索', method: async () => semanticSearch.searchEntities('', 5) },
        { name: '无效实体ID', method: () => queryEngine.getEntity('non-existent-id') }
    ];
    
    const results: any = {};
    for (const test of tests) {
        try {
            let result;
            if (test.method().then) {
                result = await test.method();
            } else {
                result = test.method();
            }
            results[test.name] = { success: true, result: Array.isArray(result) ? result.length : result };
            logger.info(`${test.name}: 成功`);
        } catch (e: any) {
            results[test.name] = { success: false, error: e.message };
            logger.error(`${test.name}失败: ${e.message}`);
        }
    }
    
    return results;
}

async function testScenario9_PerformanceDegradation() {
    logger.info('=== 场景9: 性能衰减测试 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject('/workspace/src');
    
    const queryEngine = service.getQueryEngine();
    const measurements: number[] = [];
    
    for (let i = 0; i < 10; i++) {
        const start = Date.now();
        queryEngine.getEntitiesByType(CodeEntityType.CLASS);
        const duration = Date.now() - start;
        measurements.push(duration);
        logger.info(`第${i+1}次查询: ${duration}ms`);
        
        if (i % 3 === 0 && i > 0) {
            await service.analyzeProject('/workspace/src');
        }
    }
    
    const avgFirst = measurements.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const avgLast = measurements.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const degradation = ((avgLast - avgFirst) / avgFirst * 100).toFixed(2);
    
    logger.info(`性能衰减: ${degradation}%`);
    
    return { measurements, degradation: `${degradation}%` };
}

async function testScenario10_CallChainAnalysis() {
    logger.info('=== 场景10: 调用链分析测试 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject('/workspace/src');
    
    const queryEngine = service.getQueryEngine();
    const classes = queryEngine.getEntitiesByType(CodeEntityType.CLASS);
    
    if (classes.length > 0) {
        const firstClass = classes[0];
        logger.info(`分析类${firstClass.entityId}的调用链`);
        
        const start = Date.now();
        const callChain = queryEngine.getCallChain(firstClass.entityId, 3);
        const duration = Date.now() - start;
        
        logger.info(`调用链分析: ${callChain.path.length}节点, ${duration}ms`);
        
        return { nodes: callChain.path.length, duration };
    }
    
    return { nodes: 0, duration: 0 };
}

async function runComprehensiveTests() {
    logger.info('========== 开始综合压力测试 ==========');
    
    const results: any = {};
    
    try {
        results.scenario1 = await testScenario1_ProjectAnalysis();
    } catch (e: any) {
        logger.error(`场景1失败: ${e.message}`);
        results.scenario1 = { error: e.message };
    }
    
    try {
        results.scenario2 = await testScenario2_QueryPerformance();
    } catch (e: any) {
        logger.error(`场景2失败: ${e.message}`);
        results.scenario2 = { error: e.message };
    }
    
    try {
        results.scenario3 = await testScenario3_SemanticSearch();
    } catch (e: any) {
        logger.error(`场景3失败: ${e.message}`);
        results.scenario3 = { error: e.message };
    }
    
    try {
        results.scenario4 = await testScenario4_CacheOperations();
    } catch (e: any) {
        logger.error(`场景4失败: ${e.message}`);
        results.scenario4 = { error: e.message };
    }
    
    try {
        results.scenario5 = await testScenario5_ConcurrentAnalysis();
    } catch (e: any) {
        logger.error(`场景5失败: ${e.message}`);
        results.scenario5 = { error: e.message };
    }
    
    try {
        results.scenario6 = await testScenario6_MemoryStress();
    } catch (e: any) {
        logger.error(`场景6失败: ${e.message}`);
        results.scenario6 = { error: e.message };
    }
    
    try {
        results.scenario7 = await testScenario7_DataConsistency();
    } catch (e: any) {
        logger.error(`场景7失败: ${e.message}`);
        results.scenario7 = { error: e.message };
    }
    
    try {
        results.scenario8 = await testScenario8_EdgeCases();
    } catch (e: any) {
        logger.error(`场景8失败: ${e.message}`);
        results.scenario8 = { error: e.message };
    }
    
    try {
        results.scenario9 = await testScenario9_PerformanceDegradation();
    } catch (e: any) {
        logger.error(`场景9失败: ${e.message}`);
        results.scenario9 = { error: e.message };
    }
    
    try {
        results.scenario10 = await testScenario10_CallChainAnalysis();
    } catch (e: any) {
        logger.error(`场景10失败: ${e.message}`);
        results.scenario10 = { error: e.message };
    }
    
    logger.info('========== 综合测试完成 ==========');
    console.log(JSON.stringify(results, null, 2));
    
    return results;
}

runComprehensiveTests().catch(console.error);
