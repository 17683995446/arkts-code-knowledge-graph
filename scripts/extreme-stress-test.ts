import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService';
import { ApplicationLogger } from '../src/infrastructure/logger/Logger';
import { CodeEntityType } from '../src/shared';

const logger = ApplicationLogger.getInstance();

async function testExtremeScenario1_SimultaneousMultipleProjects() {
    logger.info('=== 极端场景1: 同时分析多个项目 ===');
    const services: EnhancedCodeKnowledgeGraphService[] = [];
    const paths = [
        '/workspace/src/core',
        '/workspace/src/services',
        '/workspace/src/infrastructure',
        '/workspace/tests',
        '/workspace/src/api'
    ];
    
    const start = Date.now();
    const promises = paths.map(async (path, index) => {
        logger.info(`启动分析 ${index + 1}: ${path}`);
        const service = new EnhancedCodeKnowledgeGraphService();
        services.push(service);
        return service.analyzeProject(path);
    });
    
    const results = await Promise.all(promises);
    const duration = Date.now() - start;
    
    const totalNodes = results.reduce((sum, r) => sum + r.knowledgeGraph.getStatistics().totalEntityCount, 0);
    const totalEdges = results.reduce((sum, r) => sum + r.knowledgeGraph.getStatistics().totalRelationCount, 0);
    
    logger.info(`并发分析完成: ${duration}ms`);
    logger.info(`总节点: ${totalNodes}, 总边: ${totalEdges}`);
    logger.info(`平均每个项目: ${(duration / paths.length).toFixed(2)}ms`);
    
    services.forEach((s, i) => {
        s.clearCache();
    });
    
    return { duration, totalNodes, totalEdges, projectCount: paths.length };
}

async function testExtremeScenario2_RepeatedAnalysis() {
    logger.info('=== 极端场景2: 重复分析测试 ===');
    const iterations = 15;
    const durations: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
        const service = new EnhancedCodeKnowledgeGraphService();
        const start = Date.now();
        await service.analyzeProject('/workspace/src');
        const duration = Date.now() - start;
        durations.push(duration);
        
        logger.info(`迭代 ${i + 1}/${iterations}: ${duration}ms`);
        
        if (i % 5 === 0) {
            service.clearCache();
            service.resetAll();
        }
    }
    
    const avgDuration = durations.reduce((a, b) => a + b, 0) / iterations;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    
    logger.info(`平均: ${avgDuration.toFixed(2)}ms, 最小: ${minDuration}ms, 最大: ${maxDuration}ms`);
    
    const stdDev = Math.sqrt(
        durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / iterations
    );
    logger.info(`标准差: ${stdDev.toFixed(2)}ms`);
    
    return { avgDuration, minDuration, maxDuration, stdDev, iterations };
}

async function testExtremeScenario3_ConcurrentQueries() {
    logger.info('=== 极端场景3: 极限并发查询 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject('/workspace/src');
    
    const queryEngine = service.getQueryEngine();
    const queryTypes = [
        () => queryEngine.getEntitiesByType(CodeEntityType.CLASS),
        () => queryEngine.getEntitiesByType(CodeEntityType.FUNCTION),
        () => queryEngine.getEntitiesByType(CodeEntityType.INTERFACE),
        () => queryEngine.getEntitiesByType(CodeEntityType.VARIABLE),
        () => queryEngine.searchEntitiesByName('Parser'),
        () => queryEngine.searchEntitiesByName('Service'),
        () => queryEngine.searchEntitiesByName('Manager'),
        () => queryEngine.getEntitiesByFile('/workspace/src/core')
    ];
    
    const concurrencyLevels = [10, 50, 100, 200];
    const results: any = {};
    
    for (const level of concurrencyLevels) {
        const start = Date.now();
        const promises: any[] = [];
        
        for (let i = 0; i < level; i++) {
            const query = queryTypes[i % queryTypes.length];
            promises.push(query());
        }
        
        await Promise.all(promises);
        const duration = Date.now() - start;
        
        results[level] = {
            duration,
            avgPerQuery: duration / level,
            queriesPerSecond: (level / duration) * 1000
        };
        
        logger.info(`并发度 ${level}: ${duration}ms, 平均 ${(duration / level).toFixed(2)}ms/query, ${((level / duration) * 1000).toFixed(2)} queries/s`);
    }
    
    return results;
}

async function testExtremeScenario4_MassiveQueryBurst() {
    logger.info('=== 极端场景4: 大量查询爆发 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject('/workspace/src');
    
    const queryEngine = service.getQueryEngine();
    const queryCount = 1000;
    
    const start = Date.now();
    for (let i = 0; i < queryCount; i++) {
        queryEngine.getEntitiesByType(CodeEntityType.CLASS);
        if (i % 100 === 0) {
            service.clearCache();
        }
    }
    const duration = Date.now() - start;
    
    logger.info(`执行 ${queryCount} 次查询: ${duration}ms, 平均 ${(duration / queryCount).toFixed(2)}ms/query`);
    
    return { queryCount, totalDuration: duration, avgDuration: duration / queryCount };
}

async function testExtremeScenario5_InvalidInputs() {
    logger.info('=== 极端场景5: 无效输入处理 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject('/workspace/src');
    
    const queryEngine = service.getQueryEngine();
    const semanticSearch = service.getSemanticSearch();
    
    const testCases = [
        { name: '空字符串搜索', test: () => queryEngine.searchEntitiesByName('') },
        { name: '超长名称搜索', test: () => queryEngine.searchEntitiesByName('a'.repeat(10000)) },
        { name: '特殊字符搜索', test: () => queryEngine.searchEntitiesByName('<>\'\"\\') },
        { name: 'Unicode搜索', test: () => queryEngine.searchEntitiesByName('测试函数名') },
        { name: '空语义搜索', test: async () => semanticSearch.searchEntities('', 10) },
        { name: '超长语义搜索', test: async () => semanticSearch.searchEntities('a'.repeat(10000), 10) },
        { name: '非法类型查询', test: () => queryEngine.getEntitiesByType('invalid' as CodeEntityType) },
        { name: '空文件路径查询', test: () => queryEngine.getEntitiesByFile('') }
    ];
    
    const results: any = {};
    for (const tc of testCases) {
        try {
            const start = Date.now();
            let result;
            const testFn = tc.test as any;
            if (testFn.then) {
                result = await testFn();
            } else {
                result = testFn();
            }
            const duration = Date.now() - start;
            
            results[tc.name] = {
                success: true,
                duration,
                resultCount: Array.isArray(result) ? result.length : result
            };
            logger.info(`${tc.name}: 成功 (${duration}ms)`);
        } catch (error: any) {
            results[tc.name] = {
                success: false,
                error: error.message
            };
            logger.error(`${tc.name}: 失败 - ${error.message}`);
        }
    }
    
    return results;
}

async function testExtremeScenario6_MemoryPressure() {
    logger.info('=== 极端场景6: 内存压力测试 ===');
    
    if (!global.gc) {
        logger.warn('GC not exposed, skipping memory test');
        return { skipped: true };
    }
    
    global.gc();
    const initialMemory = process.memoryUsage();
    logger.info(`初始内存: heap=${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    
    const services: EnhancedCodeKnowledgeGraphService[] = [];
    const memorySnapshots: number[] = [];
    
    for (let i = 0; i < 20; i++) {
        const service = new EnhancedCodeKnowledgeGraphService();
        await service.analyzeProject('/workspace/src');
        services.push(service);
        
        const mem = process.memoryUsage();
        memorySnapshots.push(mem.heapUsed / 1024 / 1024);
        
        if (i % 5 === 0) {
            logger.info(`创建 ${i + 1} 个服务实例: heap=${(mem.heapUsed / 1024 / 1024).toFixed(2)}MB`);
        }
    }
    
    services.forEach(s => s.clearCache());
    services.length = 0;
    
    global.gc();
    const finalMemory = process.memoryUsage();
    
    const memoryGrowth = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
    const avgMemory = memorySnapshots.reduce((a, b) => a + b, 0) / memorySnapshots.length;
    const maxMemory = Math.max(...memorySnapshots);
    const minMemory = Math.min(...memorySnapshots);
    
    logger.info(`最终内存: heap=${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    logger.info(`内存增长: ${memoryGrowth.toFixed(2)}MB`);
    logger.info(`平均内存: ${avgMemory.toFixed(2)}MB, 最大: ${maxMemory.toFixed(2)}MB, 最小: ${minMemory.toFixed(2)}MB`);
    
    return {
        initialMemory: initialMemory.heapUsed / 1024 / 1024,
        finalMemory: finalMemory.heapUsed / 1024 / 1024,
        memoryGrowth,
        avgMemory,
        maxMemory,
        minMemory
    };
}

async function testExtremeScenario7_DeepNestingTraversal() {
    logger.info('=== 极端场景7: 深层嵌套遍历 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject('/workspace/src');
    
    const queryEngine = service.getQueryEngine();
    
    const testClasses = queryEngine.getEntitiesByType(CodeEntityType.CLASS).slice(0, 10);
    
    for (const cls of testClasses) {
        const start = Date.now();
        const callChain = queryEngine.getCallChain(cls.entityId, 5);
        const duration = Date.now() - start;
        
        logger.info(`类 ${cls.entityId}: ${callChain.path.length} 节点, ${duration}ms`);
    }
    
    const largeChain = queryEngine.getCallChain(testClasses[0].entityId, 10);
    logger.info(`最大调用链: ${largeChain.path.length} 节点`);
    
    return { classesTested: testClasses.length, maxChainLength: largeChain.path.length };
}

async function testExtremeScenario8_ServiceLifecycleStress() {
    logger.info('=== 极端场景8: 服务生命周期压力测试 ===');
    const operations: any[] = [];
    
    for (let i = 0; i < 30; i++) {
        const service = new EnhancedCodeKnowledgeGraphService();
        const start = Date.now();
        await service.analyzeProject('/workspace/src');
        const analysisTime = Date.now() - start;
        
        const queryStart = Date.now();
        service.getQueryEngine().getEntitiesByType(CodeEntityType.CLASS);
        const queryTime = Date.now() - queryStart;
        
        const cacheStart = Date.now();
        service.clearCache();
        service.resetAll();
        const cacheTime = Date.now() - cacheStart;
        
        operations.push({
            iteration: i + 1,
            analysisTime,
            queryTime,
            cacheTime
        });
        
        if (i % 10 === 0) {
            logger.info(`迭代 ${i + 1}: 分析=${analysisTime}ms, 查询=${queryTime}ms, 清理=${cacheTime}ms`);
        }
    }
    
    const avgAnalysis = operations.reduce((sum, op) => sum + op.analysisTime, 0) / operations.length;
    const avgQuery = operations.reduce((sum, op) => sum + op.queryTime, 0) / operations.length;
    const avgCache = operations.reduce((sum, op) => sum + op.cacheTime, 0) / operations.length;
    
    logger.info(`平均: 分析=${avgAnalysis.toFixed(2)}ms, 查询=${avgQuery.toFixed(2)}ms, 清理=${avgCache.toFixed(2)}ms`);
    
    return { operations, avgAnalysis, avgQuery, avgCache };
}

async function runExtremeTests() {
    logger.info('========== 开始极端压力测试 ==========');
    
    const results: any = {};
    
    try {
        results.scenario1 = await testExtremeScenario1_SimultaneousMultipleProjects();
    } catch (e: any) {
        logger.error(`场景1失败: ${e.message}`);
        results.scenario1 = { error: e.message };
    }
    
    try {
        results.scenario2 = await testExtremeScenario2_RepeatedAnalysis();
    } catch (e: any) {
        logger.error(`场景2失败: ${e.message}`);
        results.scenario2 = { error: e.message };
    }
    
    try {
        results.scenario3 = await testExtremeScenario3_ConcurrentQueries();
    } catch (e: any) {
        logger.error(`场景3失败: ${e.message}`);
        results.scenario3 = { error: e.message };
    }
    
    try {
        results.scenario4 = await testExtremeScenario4_MassiveQueryBurst();
    } catch (e: any) {
        logger.error(`场景4失败: ${e.message}`);
        results.scenario4 = { error: e.message };
    }
    
    try {
        results.scenario5 = await testExtremeScenario5_InvalidInputs();
    } catch (e: any) {
        logger.error(`场景5失败: ${e.message}`);
        results.scenario5 = { error: e.message };
    }
    
    try {
        results.scenario6 = await testExtremeScenario6_MemoryPressure();
    } catch (e: any) {
        logger.error(`场景6失败: ${e.message}`);
        results.scenario6 = { error: e.message };
    }
    
    try {
        results.scenario7 = await testExtremeScenario7_DeepNestingTraversal();
    } catch (e: any) {
        logger.error(`场景7失败: ${e.message}`);
        results.scenario7 = { error: e.message };
    }
    
    try {
        results.scenario8 = await testExtremeScenario8_ServiceLifecycleStress();
    } catch (e: any) {
        logger.error(`场景8失败: ${e.message}`);
        results.scenario8 = { error: e.message };
    }
    
    logger.info('========== 极端压力测试完成 ==========');
    console.log(JSON.stringify(results, null, 2));
    
    return results;
}

runExtremeTests().catch(console.error);
