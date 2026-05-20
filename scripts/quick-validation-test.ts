import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService';
import { ApplicationLogger } from '../src/infrastructure/logger/Logger';
import { CodeEntityType } from '../src/shared';

const logger = ApplicationLogger.getInstance();

async function quickValidationTest() {
    logger.info('========== 快速验证测试 ==========');
    
    const results: any = {};
    
    // 测试1: 基本分析功能
    logger.info('测试1: 基本分析功能');
    try {
        const service = new EnhancedCodeKnowledgeGraphService();
        const start = Date.now();
        await service.analyzeProject('/workspace/src/core');
        const duration = Date.now() - start;
        
        const stats = service.getStatistics();
        results.basicAnalysis = {
            success: true,
            duration,
            nodeCount: stats.nodeCount,
            edgeCount: stats.edgeCount
        };
        logger.info(`基本分析成功: ${duration}ms, ${stats.nodeCount}节点`);
        
        // 清理
        service.clearCache();
        service.resetAll();
    } catch (e: any) {
        logger.error(`基本分析失败: ${e.message}`);
        results.basicAnalysis = { success: false, error: e.message };
    }
    
    // 测试2: 查询性能
    logger.info('测试2: 查询性能');
    try {
        const service = new EnhancedCodeKnowledgeGraphService();
        await service.analyzeProject('/workspace/src/core');
        const queryEngine = service.getQueryEngine();
        
        const queryStart = Date.now();
        const classes = queryEngine.getEntitiesByType(CodeEntityType.CLASS);
        const functions = queryEngine.getEntitiesByType(CodeEntityType.FUNCTION);
        const interfaces = queryEngine.getEntitiesByType(CodeEntityType.INTERFACE);
        const queryDuration = Date.now() - queryStart;
        
        results.queryPerformance = {
            success: true,
            duration: queryDuration,
            classesFound: classes.length,
            functionsFound: functions.length,
            interfacesFound: interfaces.length
        };
        logger.info(`查询成功: ${queryDuration}ms, ${classes.length}类, ${functions.length}函数`);
        
        service.clearCache();
        service.resetAll();
    } catch (e: any) {
        logger.error(`查询失败: ${e.message}`);
        results.queryPerformance = { success: false, error: e.message };
    }
    
    // 测试3: 语义搜索
    logger.info('测试3: 语义搜索');
    try {
        const service = new EnhancedCodeKnowledgeGraphService();
        await service.analyzeProject('/workspace/src/core');
        const semanticSearch = service.getSemanticSearch();
        
        const searchStart = Date.now();
        const searchResults = await semanticSearch.searchEntities('parser', 10);
        const searchDuration = Date.now() - searchStart;
        
        results.semanticSearch = {
            success: true,
            duration: searchDuration,
            resultsFound: searchResults.length
        };
        logger.info(`语义搜索成功: ${searchDuration}ms, ${searchResults.length}结果`);
        
        service.clearCache();
        service.resetAll();
    } catch (e: any) {
        logger.error(`语义搜索失败: ${e.message}`);
        results.semanticSearch = { success: false, error: e.message };
    }
    
    // 测试4: 并发查询
    logger.info('测试4: 并发查询');
    try {
        const service = new EnhancedCodeKnowledgeGraphService();
        await service.analyzeProject('/workspace/src/core');
        const queryEngine = service.getQueryEngine();
        
        const concurrentStart = Date.now();
        const promises = [
            queryEngine.getEntitiesByType(CodeEntityType.CLASS),
            queryEngine.getEntitiesByType(CodeEntityType.FUNCTION),
            queryEngine.getEntitiesByType(CodeEntityType.INTERFACE),
            queryEngine.searchEntitiesByName('Parser'),
            queryEngine.searchEntitiesByName('Service')
        ];
        
        await Promise.all(promises);
        const concurrentDuration = Date.now() - concurrentStart;
        
        results.concurrentQueries = {
            success: true,
            duration: concurrentDuration,
            concurrentCount: promises.length
        };
        logger.info(`并发查询成功: ${concurrentDuration}ms`);
        
        service.clearCache();
        service.resetAll();
    } catch (e: any) {
        logger.error(`并发查询失败: ${e.message}`);
        results.concurrentQueries = { success: false, error: e.message };
    }
    
    // 测试5: 缓存操作
    logger.info('测试5: 缓存操作');
    try {
        const service = new EnhancedCodeKnowledgeGraphService();
        await service.analyzeProject('/workspace/src/core');
        
        const statsBefore = service.getStatistics();
        
        service.clearCache();
        
        const statsAfterClear = service.getStatistics();
        
        service.resetAll();
        
        const statsAfterReset = service.getStatistics();
        
        results.cacheOperations = {
            success: true,
            nodesBefore: statsBefore.nodeCount,
            nodesAfterClear: statsAfterClear.nodeCount,
            nodesAfterReset: statsAfterReset.nodeCount,
            clearPreservesData: statsBefore.nodeCount === statsAfterClear.nodeCount,
            resetClearsData: statsAfterReset.nodeCount === 0
        };
        logger.info(`缓存操作成功: 清空保留${statsBefore.nodeCount === statsAfterClear.nodeCount}, 重置清空${statsAfterReset.nodeCount === 0}`);
    } catch (e: any) {
        logger.error(`缓存操作失败: ${e.message}`);
        results.cacheOperations = { success: false, error: e.message };
    }
    
    // 测试6: 边界输入处理
    logger.info('测试6: 边界输入处理');
    try {
        const service = new EnhancedCodeKnowledgeGraphService();
        await service.analyzeProject('/workspace/src/core');
        const queryEngine = service.getQueryEngine();
        const semanticSearch = service.getSemanticSearch();
        
        const edgeCases = [
            { name: '空字符串搜索', fn: () => queryEngine.searchEntitiesByName('') },
            { name: '空语义搜索', fn: async () => semanticSearch.searchEntities('', 5) },
            { name: '无效类型查询', fn: () => queryEngine.getEntitiesByType('invalid' as CodeEntityType) },
            { name: '空路径查询', fn: () => queryEngine.getEntitiesByFile('') }
        ];
        
        const edgeCaseResults: any = {};
        for (const tc of edgeCases) {
            try {
                const result = tc.fn();
                const value = result.then ? await result : result;
                edgeCaseResults[tc.name] = { success: true, result: Array.isArray(value) ? value.length : value };
                logger.info(`边界测试${tc.name}: 成功`);
            } catch (e: any) {
                edgeCaseResults[tc.name] = { success: false, error: e.message };
                logger.warn(`边界测试${tc.name}: 失败 - ${e.message}`);
            }
        }
        
        results.boundaryHandling = {
            success: true,
            testResults: edgeCaseResults
        };
    } catch (e: any) {
        logger.error(`边界测试失败: ${e.message}`);
        results.boundaryHandling = { success: false, error: e.message };
    }
    
    // 测试7: 调用链分析
    logger.info('测试7: 调用链分析');
    try {
        const service = new EnhancedCodeKnowledgeGraphService();
        await service.analyzeProject('/workspace/src/core');
        const queryEngine = service.getQueryEngine();
        
        const classes = queryEngine.getEntitiesByType(CodeEntityType.CLASS);
        
        if (classes.length > 0) {
            const callChainStart = Date.now();
            const callChain = queryEngine.getCallChain(classes[0].entityId, 3);
            const callChainDuration = Date.now() - callChainStart;
            
            results.callChainAnalysis = {
                success: true,
                duration: callChainDuration,
                chainLength: callChain.path.length
            };
            logger.info(`调用链分析成功: ${callChainDuration}ms, ${callChain.path.length}节点`);
        } else {
            results.callChainAnalysis = { success: true, skipped: true, reason: 'no classes found' };
            logger.info('调用链分析跳过: 未找到类');
        }
        
        service.clearCache();
        service.resetAll();
    } catch (e: any) {
        logger.error(`调用链分析失败: ${e.message}`);
        results.callChainAnalysis = { success: false, error: e.message };
    }
    
    // 测试8: 快速连续操作
    logger.info('测试8: 快速连续操作');
    try {
        const iterations = 5;
        const durations: number[] = [];
        
        for (let i = 0; i < iterations; i++) {
            const service = new EnhancedCodeKnowledgeGraphService();
            const start = Date.now();
            await service.analyzeProject('/workspace/src/core');
            const duration = Date.now() - start;
            durations.push(duration);
            
            service.clearCache();
            service.resetAll();
        }
        
        const avgDuration = durations.reduce((a, b) => a + b, 0) / iterations;
        const minDuration = Math.min(...durations);
        const maxDuration = Math.max(...durations);
        
        results.rapidOperations = {
            success: true,
            iterations,
            avgDuration,
            minDuration,
            maxDuration
        };
        logger.info(`快速操作: ${iterations}次迭代, 平均${avgDuration.toFixed(2)}ms`);
    } catch (e: any) {
        logger.error(`快速操作失败: ${e.message}`);
        results.rapidOperations = { success: false, error: e.message };
    }
    
    logger.info('========== 快速验证测试完成 ==========');
    console.log(JSON.stringify(results, null, 2));
    
    return results;
}

quickValidationTest().catch(console.error);
