import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import { ApplicationLogger } from '../src/infrastructure/logger/Logger.js';
import { CodeEntityType } from '../src/shared/index.js';

const logger = ApplicationLogger.getInstance();

async function testMemoryOptimizations() {
    logger.info('=== 开始内存优化验证测试 ===');
    
    const results: {
        test: string;
        success: boolean;
        duration?: number;
        metrics?: any;
        error?: string;
    }[] = [];
    
    // 测试1: 基础分析
    const test1Result = await testBasicAnalysis();
    results.push(test1Result);
    
    // 测试2: 中等并发
    const test2Result = await testMediumConcurrency();
    results.push(test2Result);
    
    // 测试3: 内存管理
    const test3Result = await testMemoryManagement();
    results.push(test3Result);
    
    // 输出结果
    logger.info('\n=== 测试结果总结 ===');
    const passed = results.filter(r => r.success).length;
    logger.info(`总测试: ${results.length}, 通过: ${passed}`);
    
    for (const result of results) {
        const status = result.success ? '✅' : '❌';
        logger.info(`${status} ${result.test}: ${result.success ? '通过' : '失败 - ' + result.error}`);
        if (result.metrics) {
            logger.info(`  指标:`, result.metrics);
        }
    }
    
    return results;
}

async function testBasicAnalysis() {
    logger.info('\n--- 测试1: 基础分析 ---');
    const start = Date.now();
    
    try {
        const service = new EnhancedCodeKnowledgeGraphService();
        await service.analyzeProject('/workspace/src');
        const stats = service.getStatistics();
        
        const duration = Date.now() - start;
        
        logger.info(`分析完成: ${duration}ms, 实体: ${stats.totalEntityCount}, 关系: ${stats.totalRelationCount}`);
        
        // 验证实体数量合理
        const success = stats.totalEntityCount > 100;
        
        return {
            test: '基础分析',
            success,
            duration,
            metrics: {
                entities: stats.totalEntityCount,
                relations: stats.totalRelationCount,
                files: stats.fileEntityCount
            }
        };
    } catch (e: any) {
        return {
            test: '基础分析',
            success: false,
            error: e.message
        };
    }
}

async function testMediumConcurrency() {
    logger.info('\n--- 测试2: 中等并发 (100请求) ---');
    const start = Date.now();
    
    try {
        const service = new EnhancedCodeKnowledgeGraphService();
        await service.analyzeProject('/workspace/src/core');
        const queryEngine = service.getQueryEngine();
        
        const promises: Promise<any>[] = [];
        
        for (let i = 0; i < 100; i++) {
            const queryType = i % 4;
            switch (queryType) {
                case 0:
                    promises.push(queryEngine.getEntitiesByType(CodeEntityType.CLASS));
                    break;
                case 1:
                    promises.push(queryEngine.getEntitiesByType(CodeEntityType.FUNCTION));
                    break;
                case 2:
                    promises.push(queryEngine.searchEntitiesByName('Service'));
                    break;
                case 3:
                    promises.push(queryEngine.getStatistics());
                    break;
            }
        }
        
        await Promise.all(promises);
        
        const duration = Date.now() - start;
        
        logger.info(`并发测试完成: ${duration}ms, 查询/秒: ${(100 / duration * 1000).toFixed(1)}`);
        
        // 检查缓存统计
        const cacheStats = service.getCacheStatistics();
        logger.info(`缓存状态: ${cacheStats.queryCache.size}/${cacheStats.queryCache.maxSize}`);
        
        return {
            test: '中等并发',
            success: true,
            duration,
            metrics: {
                queries: 100,
                qps: (100 / duration * 1000).toFixed(1),
                cacheSize: cacheStats.queryCache.size
            }
        };
    } catch (e: any) {
        return {
            test: '中等并发',
            success: false,
            error: e.message
        };
    }
}

async function testMemoryManagement() {
    logger.info('\n--- 测试3: 内存管理 ---');
    const start = Date.now();
    
    try {
        const service = new EnhancedCodeKnowledgeGraphService();
        await service.analyzeProject('/workspace/src/core');
        
        // 获取初始内存
        const initialMem = service.getMemoryUsage();
        logger.info(`初始内存: ${(initialMem.heapUsed / 1024 / 1024).toFixed(2)}MB`);
        
        // 执行一些操作
        const queryEngine = service.getQueryEngine();
        for (let i = 0; i < 50; i++) {
            queryEngine.getEntitiesByType(CodeEntityType.CLASS);
            if (i % 10 === 0) {
                service.clearCache();
            }
        }
        
        // 获取最终内存
        const finalMem = service.getMemoryUsage();
        logger.info(`最终内存: ${(finalMem.heapUsed / 1024 / 1024).toFixed(2)}MB`);
        
        const duration = Date.now() - start;
        const memGrowth = finalMem.heapUsed - initialMem.heapUsed;
        const memGrowthPercent = (memGrowth / initialMem.heapUsed) * 100;
        
        logger.info(`内存增长: ${(memGrowth / 1024 / 1024).toFixed(2)}MB (${memGrowthPercent.toFixed(2)}%)`);
        
        // 内存增长不超过30%认为合理
        const success = memGrowthPercent < 30;
        
        return {
            test: '内存管理',
            success,
            duration,
            metrics: {
                initialHeapMB: (initialMem.heapUsed / 1024 / 1024).toFixed(2),
                finalHeapMB: (finalMem.heapUsed / 1024 / 1024).toFixed(2),
                growthMB: (memGrowth / 1024 / 1024).toFixed(2),
                growthPercent: memGrowthPercent.toFixed(2)
            }
        };
    } catch (e: any) {
        return {
            test: '内存管理',
            success: false,
            error: e.message
        };
    }
}

// 运行测试
testMemoryOptimizations().catch(console.error);
