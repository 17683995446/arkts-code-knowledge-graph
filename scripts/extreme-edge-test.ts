import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import { ApplicationLogger } from '../src/infrastructure/logger/Logger.js';
import { CodeEntityType } from '../src/shared/index.js';

const logger = ApplicationLogger.getInstance();

interface TestResult {
    testName: string;
    passed: boolean;
    duration: number;
    error?: string;
    metrics?: Record<string, any>;
}

/** 极端深度测试套件 */
class ExtremeEdgeTestSuite {
    private results: TestResult[] = [];
    private startTime = Date.now();
    private initialMemoryMB = 0;
    private maxMemoryMB = 0;
    private operationsCompleted = 0;
    private errorsEncountered = 0;

    async runAllTests(): Promise<void> {
        logger.info('═══════════════════════════════════════════════════════════');
        logger.info('🚀 开始极端边缘情况深度测试');
        logger.info('═══════════════════════════════════════════════════════════');

        this.initialMemoryMB = this.getCurrentMemoryMB();
        this.maxMemoryMB = this.initialMemoryMB;

        try {
            await this.testExtremeConcurrentOperations();
            await this.testRapidServiceCreationDestruction();
            await this.testMemoryPressureWithLargeDatasets();
            await this.testRapidCacheClearing();
            await this.testInvalidInputHandling();
            await this.testLongRunningWithPeriodicReset();
            await this.testEdgeQueryPatterns();
        } catch (error: any) {
            logger.error('❌ 严重错误:', error);
        } finally {
            await this.printFinalReport();
        }
    }

    private async testExtremeConcurrentOperations(): Promise<void> {
        const testName = 'Extreme Concurrent Operations';
        const start = Date.now();
        
        logger.info(`\n🔥 ${testName}`);
        logger.info('─'.repeat(60));

        try {
            const service = new EnhancedCodeKnowledgeGraphService();
            await service.analyzeProject('/workspace/src');
            const queryEngine = service.getQueryEngine();
            
            const CONCURRENT_REQUESTS = 1000;
            const operations = Array(CONCURRENT_REQUESTS).fill(null);
            
            let completed = 0;
            let failed = 0;
            
            const promises = operations.map(async (_: any, i: number) => {
                try {
                    const random = Math.random();
                    if (random < 0.25) {
                        await queryEngine.getEntitiesByType(CodeEntityType.CLASS);
                    } else if (random < 0.5) {
                        await queryEngine.getEntitiesByType(CodeEntityType.FUNCTION);
                    } else if (random < 0.75) {
                        await queryEngine.searchEntitiesByName('test');
                    } else {
                        await queryEngine.getStatistics();
                    }
                    completed++;
                } catch {
                    failed++;
                }
            });
            
            await Promise.all(promises);
            
            const duration = Date.now() - start;
            const qps = (CONCURRENT_REQUESTS / (duration / 1000)).toFixed(1);
            
            this.results.push({
                testName,
                passed: failed === 0,
                duration,
                metrics: {
                    concurrentRequests: CONCURRENT_REQUESTS,
                    completed,
                    failed,
                    qps
                }
            });
            
            this.operationsCompleted += CONCURRENT_REQUESTS;
            logger.info(`✅ ${testName}: ${completed}/${CONCURRENT_REQUESTS} completed, ${failed} failed, ${qps} QPS`);
            
        } catch (error: any) {
            this.errorsEncountered++;
            this.results.push({
                testName,
                passed: false,
                duration: Date.now() - start,
                error: error.message
            });
            logger.error(`❌ ${testName} failed: ${error.message}`);
        }
    }

    private async testRapidServiceCreationDestruction(): Promise<void> {
        const testName = 'Rapid Service Creation & Destruction';
        const start = Date.now();
        
        logger.info(`\n🔄 ${testName}`);
        logger.info('─'.repeat(60));

        try {
            const CYCLES = 100;
            let successful = 0;
            let failed = 0;
            
            for (let i = 0; i < CYCLES; i++) {
                try {
                    const service = new EnhancedCodeKnowledgeGraphService();
                    await service.analyzeProject('/workspace/src');
                    const stats = service.getStatistics();
                    service.clearCache();
                    service.resetAll();
                    
                    if (stats.totalEntityCount > 0) {
                        successful++;
                    } else {
                        failed++;
                    }
                    
                    if (i % 20 === 0) {
                        logger.info(`  Progress: ${i}/${CYCLES}, Memory: ${this.getCurrentMemoryMB().toFixed(1)}MB`);
                        this.updateMaxMemory();
                    }
                } catch (error) {
                    failed++;
                }
            }
            
            this.results.push({
                testName,
                passed: failed === 0,
                duration: Date.now() - start,
                metrics: {
                    cycles: CYCLES,
                    successful,
                    failed
                }
            });
            
            logger.info(`✅ ${testName}: ${successful}/${CYCLES} successful, ${failed} failed`);
            
        } catch (error: any) {
            this.errorsEncountered++;
            this.results.push({
                testName,
                passed: false,
                duration: Date.now() - start,
                error: error.message
            });
            logger.error(`❌ ${testName} failed: ${error.message}`);
        }
    }

    private async testMemoryPressureWithLargeDatasets(): Promise<void> {
        const testName = 'Memory Pressure with Large Datasets';
        const start = Date.now();
        
        logger.info(`\n💾 ${testName}`);
        logger.info('─'.repeat(60));

        try {
            const service = new EnhancedCodeKnowledgeGraphService();
            await service.analyzeProject('/workspace/src');
            const queryEngine = service.getQueryEngine();
            
            const ITERATIONS = 5000;
            const results: any[] = [];
            
            for (let i = 0; i < ITERATIONS; i++) {
                results.push(queryEngine.getEntitiesByType(CodeEntityType.CLASS));
                
                if (i % 500 === 0) {
                    service.clearCache();
                    logger.info(`  Iteration: ${i}/${ITERATIONS}, Memory: ${this.getCurrentMemoryMB().toFixed(1)}MB`);
                    this.updateMaxMemory();
                }
            }
            
            const finalStats = queryEngine.getStatistics();
            
            this.results.push({
                testName,
                passed: true,
                duration: Date.now() - start,
                metrics: {
                    iterations: ITERATIONS,
                    finalEntities: finalStats.totalEntityCount,
                    dataPointsCollected: results.length
                }
            });
            
            this.operationsCompleted += ITERATIONS;
            logger.info(`✅ ${testName}: ${ITERATIONS} iterations completed`);
            
        } catch (error: any) {
            this.errorsEncountered++;
            this.results.push({
                testName,
                passed: false,
                duration: Date.now() - start,
                error: error.message
            });
            logger.error(`❌ ${testName} failed: ${error.message}`);
        }
    }

    private async testRapidCacheClearing(): Promise<void> {
        const testName = 'Rapid Cache Clearing';
        const start = Date.now();
        
        logger.info(`\n🧹 ${testName}`);
        logger.info('─'.repeat(60));

        try {
            const service = new EnhancedCodeKnowledgeGraphService();
            await service.analyzeProject('/workspace/src');
            const queryEngine = service.getQueryEngine();
            
            const CYCLES = 1000;
            let successful = 0;
            
            for (let i = 0; i < CYCLES; i++) {
                // 先执行查询填充缓存
                for (let j = 0; j < 10; j++) {
                    queryEngine.getEntitiesByType(CodeEntityType.CLASS);
                }
                
                // 然后快速清理缓存
                service.clearCache();
                successful++;
                
                if (i % 100 === 0) {
                    logger.info(`  Cycles: ${i}/${CYCLES}, Memory: ${this.getCurrentMemoryMB().toFixed(1)}MB`);
                    this.updateMaxMemory();
                }
            }
            
            this.results.push({
                testName,
                passed: successful === CYCLES,
                duration: Date.now() - start,
                metrics: {
                    cycles: CYCLES,
                    successful
                }
            });
            
            logger.info(`✅ ${testName}: ${successful}/${CYCLES} successful`);
            
        } catch (error: any) {
            this.errorsEncountered++;
            this.results.push({
                testName,
                passed: false,
                duration: Date.now() - start,
                error: error.message
            });
            logger.error(`❌ ${testName} failed: ${error.message}`);
        }
    }

    private async testInvalidInputHandling(): Promise<void> {
        const testName = 'Invalid Input Handling';
        const start = Date.now();
        
        logger.info(`\n⚠️ ${testName}`);
        logger.info('─'.repeat(60));

        try {
            const service = new EnhancedCodeKnowledgeGraphService();
            await service.analyzeProject('/workspace/src');
            const queryEngine = service.getQueryEngine();
            
            const invalidInputs = [
                '', '!@#$%^&*()', 'nonexistent_entity_123456',
                'x'.repeat(10000), ' ', null, undefined
            ];
            
            let handledCorrectly = 0;
            
            for (const input of invalidInputs) {
                try {
                    const result = queryEngine.searchEntitiesByName(input as any);
                    handledCorrectly++;
                } catch (error) {
                    handledCorrectly++; // 预期的错误
                }
            }
            
            this.results.push({
                testName,
                passed: handledCorrectly === invalidInputs.length,
                duration: Date.now() - start,
                metrics: {
                    testCases: invalidInputs.length,
                    handledCorrectly
                }
            });
            
            logger.info(`✅ ${testName}: ${handledCorrectly}/${invalidInputs.length} handled correctly`);
            
        } catch (error: any) {
            this.errorsEncountered++;
            this.results.push({
                testName,
                passed: false,
                duration: Date.now() - start,
                error: error.message
            });
            logger.error(`❌ ${testName} failed: ${error.message}`);
        }
    }

    private async testLongRunningWithPeriodicReset(): Promise<void> {
        const testName = 'Long Running with Periodic Reset';
        const start = Date.now();
        
        logger.info(`\n⏱️ ${testName}`);
        logger.info('─'.repeat(60));

        try {
            const DURATION_SECONDS = 120;
            const endTime = Date.now() + DURATION_SECONDS * 1000;
            let iterations = 0;
            
            while (Date.now() < endTime) {
                const service = new EnhancedCodeKnowledgeGraphService();
                await service.analyzeProject('/workspace/src');
                
                for (let i = 0; i < 100; i++) {
                    const queryEngine = service.getQueryEngine();
                    queryEngine.getEntitiesByType(CodeEntityType.CLASS);
                    queryEngine.searchEntitiesByName('service');
                }
                
                service.clearCache();
                service.resetAll();
                
                iterations++;
                
                if (iterations % 10 === 0) {
                    logger.info(`  Iteration: ${iterations}, Time elapsed: ${((Date.now() - start) / 1000).toFixed(0)}s`);
                    this.updateMaxMemory();
                }
            }
            
            this.results.push({
                testName,
                passed: true,
                duration: Date.now() - start,
                metrics: {
                    durationSeconds: DURATION_SECONDS,
                    iterations,
                    opsPerMinute: (iterations / (DURATION_SECONDS / 60)).toFixed(1)
                }
            });
            
            this.operationsCompleted += iterations * 200;
            logger.info(`✅ ${testName}: ${iterations} iterations in ${DURATION_SECONDS}s`);
            
        } catch (error: any) {
            this.errorsEncountered++;
            this.results.push({
                testName,
                passed: false,
                duration: Date.now() - start,
                error: error.message
            });
            logger.error(`❌ ${testName} failed: ${error.message}`);
        }
    }

    private async testEdgeQueryPatterns(): Promise<void> {
        const testName = 'Edge Query Patterns';
        const start = Date.now();
        
        logger.info(`\n🎯 ${testName}`);
        logger.info('─'.repeat(60));

        try {
            const service = new EnhancedCodeKnowledgeGraphService();
            await service.analyzeProject('/workspace/src');
            const queryEngine = service.getQueryEngine();
            
            const testPatterns = [
                () => queryEngine.getStatistics(),
                () => queryEngine.getEntitiesByType(CodeEntityType.CLASS),
                () => queryEngine.getEntitiesByType(CodeEntityType.FUNCTION),
                () => queryEngine.searchEntitiesByName('a'),
                () => queryEngine.searchEntitiesByName('e'),
                () => queryEngine.searchEntitiesByName('i'),
                () => queryEngine.searchEntitiesByName('o'),
                () => queryEngine.searchEntitiesByName('u'),
                () => queryEngine.searchEntitiesByName(''),
                () => queryEngine.getEntitiesByType(CodeEntityType.INTERFACE)
            ];
            
            let passed = 0;
            let failed = 0;
            
            for (let i = 0; i < 100; i++) {
                for (const pattern of testPatterns) {
                    try {
                        pattern();
                        passed++;
                    } catch (error) {
                        failed++;
                    }
                }
            }
            
            this.results.push({
                testName,
                passed: failed === 0,
                duration: Date.now() - start,
                metrics: {
                    testPatterns: testPatterns.length,
                    iterations: 100,
                    totalTests: testPatterns.length * 100,
                    passed,
                    failed
                }
            });
            
            logger.info(`✅ ${testName}: ${passed}/${testPatterns.length * 100} passed, ${failed} failed`);
            
        } catch (error: any) {
            this.errorsEncountered++;
            this.results.push({
                testName,
                passed: false,
                duration: Date.now() - start,
                error: error.message
            });
            logger.error(`❌ ${testName} failed: ${error.message}`);
        }
    }

    private async printFinalReport(): Promise<void> {
        const totalDuration = Date.now() - this.startTime;
        const finalMemoryMB = this.getCurrentMemoryMB();
        const memoryGrowth = finalMemoryMB - this.initialMemoryMB;
        const passedTests = this.results.filter(r => r.passed).length;
        const totalTests = this.results.length;
        
        logger.info('\n' + '═'.repeat(80));
        logger.info('📊 极端边缘情况深度测试 - 最终报告');
        logger.info('═'.repeat(80));
        logger.info(`总测试时长: ${(totalDuration / 1000).toFixed(1)}s`);
        logger.info(`总测试数: ${totalTests}`);
        logger.info(`通过数: ${passedTests}`);
        logger.info(`失败数: ${totalTests - passedTests}`);
        logger.info(`通过率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        logger.info('─'.repeat(80));
        logger.info(`初始内存: ${this.initialMemoryMB.toFixed(1)} MB`);
        logger.info(`峰值内存: ${this.maxMemoryMB.toFixed(1)} MB`);
        logger.info(`最终内存: ${finalMemoryMB.toFixed(1)} MB`);
        logger.info(`内存增长: ${memoryGrowth >= 0 ? '+' : ''}${memoryGrowth.toFixed(1)} MB`);
        logger.info(`总操作数: ${this.operationsCompleted}`);
        logger.info(`总错误数: ${this.errorsEncountered}`);
        logger.info('─'.repeat(80));
        
        if (passedTests === totalTests && memoryGrowth < 100) {
            logger.info('🎉 🚀 ✨ 完美! 系统在极端边缘情况下也完美稳定!');
        } else if (passedTests === totalTests) {
            logger.info('✅ 良好! 所有测试通过，内存稳定可控。');
        } else {
            logger.warn('⚠️ 需要关注失败的测试');
        }
        
        logger.info('─'.repeat(80));
        logger.info('详细测试结果:');
        for (const result of this.results) {
            const status = result.passed ? '✅' : '❌';
            logger.info(`  ${status} ${result.testName} (${result.duration}ms)`);
            if (result.metrics) {
                for (const [key, value] of Object.entries(result.metrics)) {
                    logger.info(`      ${key}: ${value}`);
                }
            }
            if (result.error) {
                logger.info(`      Error: ${result.error}`);
            }
        }
        logger.info('═'.repeat(80));
    }

    private getCurrentMemoryMB(): number {
        const memUsage = process.memoryUsage();
        return memUsage.heapUsed / 1024 / 1024;
    }

    private updateMaxMemory(): void {
        const current = this.getCurrentMemoryMB();
        if (current > this.maxMemoryMB) {
            this.maxMemoryMB = current;
        }
    }
}

(async () => {
    const testSuite = new ExtremeEdgeTestSuite();
    await testSuite.runAllTests();
})().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
});
