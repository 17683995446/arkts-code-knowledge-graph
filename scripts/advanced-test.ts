import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService';
import { ApplicationLogger } from '../src/infrastructure/logger/Logger';

const logger = ApplicationLogger.getInstance();

async function testSemanticSearch() {
    logger.info('=== 语义搜索压力测试 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.buildKnowledgeGraph('/workspace/src');
    
    const queries = [
        'data parsing and processing',
        'file handling utilities',
        'knowledge graph operations',
        'error handling and logging',
        'cache management',
        'API endpoint handling',
        'configuration management',
        'type definitions and interfaces'
    ];
    
    logger.info(`执行${queries.length}个语义查询...`);
    
    for (const query of queries) {
        const start = Date.now();
        try {
            const results = await service.semanticSearch(query, 5);
            const duration = Date.now() - start;
            logger.info(`查询"${query}": ${results.length}结果, ${duration}ms`);
        } catch (e) {
            logger.error(`查询失败: ${query} - ${e}`);
        }
    }
    
    const concurrentStart = Date.now();
    const concurrentResults = await Promise.all(
        queries.map(q => service.semanticSearch(q, 5))
    );
    const concurrentDuration = Date.now() - concurrentStart;
    
    logger.info(`并发语义搜索: ${concurrentDuration}ms`);
    
    return { queries: queries.length, concurrentTime: concurrentDuration };
}

async function testGraphTraversal() {
    logger.info('=== 图遍历性能测试 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.buildKnowledgeGraph('/workspace/src');
    
    const stats = service.getStatistics();
    logger.info(`图统计: ${stats.nodeCount}节点, ${stats.edgeCount}边`);
    
    const traversalTests = [
        { name: '全查询', query: {} },
        { name: '类查询', query: { type: 'class' } },
        { name: '函数查询', query: { type: 'function' } },
        { name: '接口查询', query: { type: 'interface' } },
        { name: '导出查询', query: { type: 'export' } }
    ];
    
    for (const test of traversalTests) {
        const start = Date.now();
        const results = service.queryEntities(test.query);
        const duration = Date.now() - start;
        logger.info(`遍历${test.name}: ${results.length}结果, ${duration}ms`);
    }
    
    return { nodeCount: stats.nodeCount, edgeCount: stats.edgeCount };
}

async function testDataConsistency() {
    logger.info('=== 数据一致性测试 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.buildKnowledgeGraph('/workspace/src');
    
    const iterations = 10;
    const results: number[][] = [];
    
    for (let i = 0; i < iterations; i++) {
        const r = service.queryEntities({ type: 'class' });
        results.push(r.map((e: any) => e.id));
    }
    
    const first = results[0];
    let allConsistent = true;
    
    for (let i = 1; i < results.length; i++) {
        const isSame = JSON.stringify(first) === JSON.stringify(results[i]);
        if (!isSame) {
            allConsistent = false;
            logger.error(`第${i}次结果与首次不一致!`);
        }
    }
    
    logger.info(`数据一致性: ${allConsistent ? '通过' : '失败'}`);
    
    return { consistent: allConsistent, iterations };
}

async function testPerformanceOverTime() {
    logger.info('=== 性能衰减测试 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.buildKnowledgeGraph('/workspace/src');
    
    const measurements: number[] = [];
    
    for (let i = 0; i < 5; i++) {
        const start = Date.now();
        service.queryEntities({ type: 'class' });
        const duration = Date.now() - start;
        measurements.push(duration);
        logger.info(`第${i+1}次查询: ${duration}ms`);
        
        if (i < 4) {
            await service.buildKnowledgeGraph('/workspace/src');
        }
    }
    
    const avgFirst = (measurements[0] + measurements[1]) / 2;
    const avgLast = (measurements[3] + measurements[4]) / 2;
    const degradation = ((avgLast - avgFirst) / avgFirst * 100).toFixed(2);
    
    logger.info(`性能衰减: ${degradation}%`);
    
    return { measurements, degradation: `${degradation}%` };
}

async function testResetOperations() {
    logger.info('=== 重置操作测试 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    
    await service.buildKnowledgeGraph('/workspace/src');
    let stats = service.getStatistics();
    logger.info(`构建后: ${stats.nodeCount}节点`);
    
    service.clearCache();
    stats = service.getStatistics();
    logger.info(`清空缓存后: ${stats.nodeCount}节点`);
    
    service.resetAll();
    stats = service.getStatistics();
    logger.info(`重置后: ${stats.nodeCount}节点`);
    
    return { 
        afterBuild: stats.nodeCount,
        afterClearCache: stats.nodeCount,
        afterReset: stats.nodeCount
    };
}

async function runAdvancedTests() {
    logger.info('========== 开始高级测试 ==========');
    
    const results: any = {};
    
    try {
        results.semantic = await testSemanticSearch();
    } catch (e) {
        logger.error(`语义搜索测试失败: ${e}`);
        results.semantic = { error: String(e) };
    }
    
    try {
        results.traversal = await testGraphTraversal();
    } catch (e) {
        logger.error(`图遍历测试失败: ${e}`);
        results.traversal = { error: String(e) };
    }
    
    try {
        results.consistency = await testDataConsistency();
    } catch (e) {
        logger.error(`一致性测试失败: ${e}`);
        results.consistency = { error: String(e) };
    }
    
    try {
        results.performance = await testPerformanceOverTime();
    } catch (e) {
        logger.error(`性能测试失败: ${e}`);
        results.performance = { error: String(e) };
    }
    
    try {
        results.reset = await testResetOperations();
    } catch (e) {
        logger.error(`重置测试失败: ${e}`);
        results.reset = { error: String(e) };
    }
    
    logger.info('========== 高级测试完成 ==========');
    console.log(JSON.stringify(results, null, 2));
    
    return results;
}

runAdvancedTests().catch(console.error);
