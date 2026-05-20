import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService';
import { ApplicationLogger } from '../src/infrastructure/logger/Logger';
import { CodeEntity } from '../src/shared';

const logger = ApplicationLogger.getInstance();

async function testScenario1_ProjectAnalysis() {
    logger.info('=== 场景1: 完整项目分析 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    
    const start = Date.now();
    const result = await service.analyzeProject('/workspace/src');
    const duration = Date.now() - start;
    
    const graph = service.getKnowledgeGraph();
    const nodeCount = graph.getNodes().length;
    const edgeCount = graph.getEdges().length;
    
    logger.info(`分析完成: ${duration}ms, ${nodeCount}节点, ${edgeCount}边`);
    
    return { duration, nodeCount, edgeCount };
}

async function testScenario2_QueryPerformance() {
    logger.info('=== 场景2: 查询性能测试 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject('/workspace/src');
    
    const queries = [
        { type: 'class' },
        { type: 'function' },
        { type: 'interface' },
        { type: 'export' },
        { name: 'Parser' },
        { filePath: '/workspace/src/core' }
    ];
    
    const results: any = {};
    for (const query of queries) {
        const start = Date.now();
        const found = service.getQueryEngine().query(query);
        const duration = Date.now() - start;
        results[JSON.stringify(query)] = { count: found.length, time: duration };
        logger.info(`查询${JSON.stringify(query)}: ${found.length}结果, ${duration}ms`);
    }
    
    return results;
}

async function testScenario3_SemanticSearch() {
    logger.info('=== 场景3: 语义搜索测试 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject('/workspace/src');
    
    const queries = [
        'code parsing',
        'knowledge graph',
        'file handling',
        'error handling'
    ];
    
    for (const query of queries) {
        const start = Date.now();
        const results = await service.getSemanticSearch().search(query, 5);
        const duration = Date.now() - start;
        logger.info(`语义搜索"${query}": ${results.length}结果, ${duration}ms`);
    }
    
    return { queries: queries.length };
}

async function testScenario4_CacheOperations() {
    logger.info('=== 场景4: 缓存操作测试 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject('/workspace/src');
    
    const iterations = 30;
    
    for (let i = 0; i < iterations; i++) {
        service.getQueryEngine().query({ type: 'class' });
        if (i % 10 === 0) {
            service.clearCache();
            logger.info(`清空缓存 (迭代${i})`);
        }
    }
    
    service.resetAll();
    const stats = service.getKnowledgeGraph();
    logger.info(`重置后图谱: ${stats.getNodes().length}节点`);
    
    return { iterations };
}

async function testScenario5_ConcurrentAnalysis() {
    logger.info('=== 场景5: 并发项目分析 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    
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
    
    const totalNodes = results.reduce((sum, r) => sum + r.knowledgeGraph.getNodes().length, 0);
    
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
    
    const iterations = 20;
    const firstResults = service.getQueryEngine().query({ type: 'class' });
    const firstIds = firstResults.map((e: CodeEntity) => e.id);
    
    let inconsistent = false;
    for (let i = 1; i < iterations; i++) {
        const results = service.getQueryEngine().query({ type: 'class' });
        const ids = results.map((e: CodeEntity) => e.id);
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
    
    const tests = [
        { name: '空查询', query: {} },
        { name: '无效类型', query: { type: 'nonExistent' } },
        { name: '超长名称', query: { name: 'a'.repeat(1000) } }
    ];
    
    for (const test of tests) {
        try {
            const results = service.getQueryEngine().query(test.query);
            logger.info(`${test.name}: ${results.length}结果`);
        } catch (e) {
            logger.error(`${test.name}失败: ${e}`);
        }
    }
    
    return { tests: tests.length };
}

async function runComprehensiveTests() {
    logger.info('========== 开始综合测试 ==========');
    
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
    
    logger.info('========== 综合测试完成 ==========');
    console.log(JSON.stringify(results, null, 2));
    
    return results;
}

runComprehensiveTests().catch(console.error);
