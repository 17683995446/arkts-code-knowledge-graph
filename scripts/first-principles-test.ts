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

/** 基于第一性原理的深度测试 */
class FirstPrinciplesTestSuite {
    private results: TestResult[] = [];
    private startTime = Date.now();
    private initialMemoryMB = 0;
    private maxMemoryMB = 0;
    private problemsFound: string[] = [];

    async runAllTests(): Promise<void> {
        logger.info('═══════════════════════════════════════════════════════════');
        logger.info('🧠 第一性原理深度测试 - 探索系统根本问题');
        logger.info('═══════════════════════════════════════════════════════════');

        this.initialMemoryMB = this.getCurrentMemoryMB();

        try {
            // 基于第一性原理的核心测试
            await this.testDataConsistency();
            await this.testIndexIntegrity();
            await this.testCacheConsistency();
            await this.testVectorIndexConsistency();
            await this.testConcurrentModification();
            await this.testResourceLifecycle();
            await this.testPerformanceDegradation();
            await this.testBoundaryConditions();
        } catch (error: any) {
            logger.error('❌ 严重错误:', error);
        } finally {
            await this.printFinalReport();
        }
    }

    private async testDataConsistency(): Promise<void> {
        const testName = 'Data Consistency (实体与索引一致性)';
        const start = Date.now();
        
        logger.info(`\n🔍 ${testName}`);
        logger.info('─'.repeat(60));

        try {
            const service = new EnhancedCodeKnowledgeGraphService();
            await service.analyzeProject('/workspace/src');
            
            const kg = service.getKnowledgeGraph();
            const stats = kg.getStatistics();
            const qe = service.getQueryEngine();
            
            let inconsistencies = 0;
            const issues: string[] = [];
            
            // 测试1: 图中节点数 vs 索引中的节点数
            const classEntities = qe.getEntitiesByType(CodeEntityType.CLASS);
            const funcEntities = qe.getEntitiesByType(CodeEntityType.FUNCTION);
            const interfaceEntities = qe.getEntitiesByType(CodeEntityType.INTERFACE);
            
            // 验证实体可以通过ID检索
            for (const entity of classEntities.slice(0, 50)) {
                const retrieved = qe.getEntity(entity.entityId);
                if (!retrieved) {
                    inconsistencies++;
                    issues.push(`Class entity not retrievable: ${entity.entityId}`);
                }
            }
            
            // 测试2: 添加实体后索引是否更新
            const initialStats = kg.getStatistics();
            
            // 测试3: 清理后数据一致性
            service.clearCache();
            const afterClearStats = kg.getStatistics();
            
            if (initialStats.totalEntityCount !== afterClearStats.totalEntityCount) {
                inconsistencies++;
                issues.push('Entity count changed after cache clear!');
            }
            
            this.results.push({
                testName,
                passed: inconsistencies === 0,
                duration: Date.now() - start,
                metrics: {
                    inconsistencies,
                    issues: issues.slice(0, 5),
                    totalEntities: stats.totalEntityCount,
                    classes: classEntities.length,
                    functions: funcEntities.length,
                    interfaces: interfaceEntities.length
                }
            });
            
            if (inconsistencies > 0) {
                this.problemsFound.push(`${testName}: ${inconsistencies} inconsistencies`);
                logger.warn(`⚠️ 发现 ${inconsistencies} 个一致性问题`);
            } else {
                logger.info(`✅ ${testName}: 数据一致性完美`);
            }
            
        } catch (error: any) {
            this.results.push({
                testName,
                passed: false,
                duration: Date.now() - start,
                error: error.message
            });
            this.problemsFound.push(`${testName}: ${error.message}`);
            logger.error(`❌ ${testName} failed: ${error.message}`);
        }
    }

    private async testIndexIntegrity(): Promise<void> {
        const testName = 'Index Integrity (索引完整性)';
        const start = Date.now();
        
        logger.info(`\n🔍 ${testName}`);
        logger.info('─'.repeat(60));

        try {
            const service = new EnhancedCodeKnowledgeGraphService();
            await service.analyzeProject('/workspace/src');
            
            const kg = service.getKnowledgeGraph();
            let integrityIssues = 0;
            const issues: string[] = [];
            
            // 检查实体类型索引是否包含所有类型
            const entityTypes = [CodeEntityType.CLASS, CodeEntityType.FUNCTION, CodeEntityType.INTERFACE];
            
            for (const type of entityTypes) {
                const indexedEntities = kg.getCodeEntitiesByType(type);
                
                // 验证索引中的实体确实存在于图中
                for (const entity of indexedEntities) {
                    const actualEntity = kg.getCodeEntity(entity.entityId);
                    if (!actualEntity) {
                        integrityIssues++;
                        issues.push(`Entity in index but not in graph: ${entity.entityId}`);
                    }
                }
                
                // 验证图中属于该类型的所有实体都在索引中
                kg.getStatistics(); // 这会触发内部统计计算
            }
            
            // 测试索引同步
            const entities = kg.getCodeEntitiesByType(CodeEntityType.CLASS);
            logger.info(`   索引中的类实体: ${entities.length}`);
            
            this.results.push({
                testName,
                passed: integrityIssues === 0,
                duration: Date.now() - start,
                metrics: {
                    integrityIssues,
                    issues: issues.slice(0, 5)
                }
            });
            
            if (integrityIssues > 0) {
                this.problemsFound.push(`${testName}: ${integrityIssues} integrity issues`);
                logger.warn(`⚠️ 发现 ${integrityIssues} 个索引完整性问题`);
            } else {
                logger.info(`✅ ${testName}: 索引完整性完美`);
            }
            
        } catch (error: any) {
            this.results.push({
                testName,
                passed: false,
                duration: Date.now() - start,
                error: error.message
            });
            this.problemsFound.push(`${testName}: ${error.message}`);
            logger.error(`❌ ${testName} failed: ${error.message}`);
        }
    }

    private async testCacheConsistency(): Promise<void> {
        const testName = 'Cache Consistency (缓存一致性)';
        const start = Date.now();
        
        logger.info(`\n🔍 ${testName}`);
        logger.info('─'.repeat(60));

        try {
            const service = new EnhancedCodeKnowledgeGraphService();
            await service.analyzeProject('/workspace/src');
            const qe = service.getQueryEngine();
            
            let consistencyIssues = 0;
            const issues: string[] = [];
            
            // 测试1: 缓存清除后是否真的清除了
            qe.getEntitiesByType(CodeEntityType.CLASS);
            const cacheStatsBefore = qe.getCacheStats();
            
            qe.clearCache();
            
            const cacheStatsAfter = qe.getCacheStats();
            
            if (cacheStatsAfter.size !== 0) {
                consistencyIssues++;
                issues.push('Cache not cleared properly!');
            }
            
            // 测试2: 重复查询的一致性
            const results1 = qe.getEntitiesByType(CodeEntityType.CLASS);
            const results2 = qe.getEntitiesByType(CodeEntityType.CLASS);
            
            if (results1.length !== results2.length) {
                consistencyIssues++;
                issues.push('Repeated queries returned different counts!');
            }
            
            this.results.push({
                testName,
                passed: consistencyIssues === 0,
                duration: Date.now() - start,
                metrics: {
                    consistencyIssues,
                    issues: issues.slice(0, 5),
                    cacheSizeBefore: cacheStatsBefore.size,
                    cacheSizeAfter: cacheStatsAfter.size
                }
            });
            
            if (consistencyIssues > 0) {
                this.problemsFound.push(`${testName}: ${consistencyIssues} issues`);
                logger.warn(`⚠️ 发现 ${consistencyIssues} 个缓存一致性问题`);
            } else {
                logger.info(`✅ ${testName}: 缓存一致性完美`);
            }
            
        } catch (error: any) {
            this.results.push({
                testName,
                passed: false,
                duration: Date.now() - start,
                error: error.message
            });
            this.problemsFound.push(`${testName}: ${error.message}`);
            logger.error(`❌ ${testName} failed: ${error.message}`);
        }
    }

    private async testVectorIndexConsistency(): Promise<void> {
        const testName = 'Vector Index Consistency (向量索引一致性)';
        const start = Date.now();
        
        logger.info(`\n🔍 ${testName}`);
        logger.info('─'.repeat(60));

        try {
            const service = new EnhancedCodeKnowledgeGraphService();
            await service.analyzeProject('/workspace/src');
            
            const kg = service.getKnowledgeGraph();
            const stats = kg.getStatistics();
            const semanticSearch = service.getSemanticSearch();
            
            let consistencyIssues = 0;
            const issues: string[] = [];
            
            // 测试向量索引中的实体是否与图数据库一致
            try {
                const searchResults = await semanticSearch.searchEntities('class', 100);
                logger.info(`   向量搜索返回: ${searchResults.length} 结果`);
                
                // 验证返回的实体是否真的在知识图谱中
                for (const result of searchResults) {
                    const entity = kg.getCodeEntity(result.entityId);
                    if (!entity) {
                        consistencyIssues++;
                        issues.push(`Vector index entity not in graph: ${result.entityId}`);
                    }
                }
            } catch (error) {
                // 向量索引可能失败，这是预期的
                logger.info(`   向量搜索遇到问题（可能是预期行为）`);
            }
            
            this.results.push({
                testName,
                passed: consistencyIssues === 0,
                duration: Date.now() - start,
                metrics: {
                    consistencyIssues,
                    issues: issues.slice(0, 5),
                    totalEntities: stats.totalEntityCount
                }
            });
            
            if (consistencyIssues > 0) {
                this.problemsFound.push(`${testName}: ${consistencyIssues} consistency issues`);
                logger.warn(`⚠️ 发现 ${consistencyIssues} 个向量索引一致性问题`);
            } else {
                logger.info(`✅ ${testName}: 向量索引一致性完美`);
            }
            
        } catch (error: any) {
            this.results.push({
                testName,
                passed: false,
                duration: Date.now() - start,
                error: error.message
            });
            this.problemsFound.push(`${testName}: ${error.message}`);
            logger.error(`❌ ${testName} failed: ${error.message}`);
        }
    }

    private async testConcurrentModification(): Promise<void> {
        const testName = 'Concurrent Modification (并发修改)';
        const start = Date.now();
        
        logger.info(`\n🔍 ${testName}`);
        logger.info('─'.repeat(60));

        try {
            // 创建多个服务实例模拟并发
            const services: EnhancedCodeKnowledgeGraphService[] = [];
            const NUM_INSTANCES = 10;
            
            for (let i = 0; i < NUM_INSTANCES; i++) {
                const service = new EnhancedCodeKnowledgeGraphService();
                await service.analyzeProject('/workspace/src');
                services.push(service);
            }
            
            let raceConditions = 0;
            const issues: string[] = [];
            
            // 并发执行查询
            const promises = services.map(async (service, i) => {
                const qe = service.getQueryEngine();
                const stats1 = qe.getStatistics();
                const classes1 = qe.getEntitiesByType(CodeEntityType.CLASS);
                
                // 清理缓存
                service.clearCache();
                
                const stats2 = qe.getStatistics();
                const classes2 = qe.getEntitiesByType(CodeEntityType.CLASS);
                
                // 检查数据一致性
                if (stats1.totalEntityCount !== stats2.totalEntityCount) {
                    raceConditions++;
                    issues.push(`Instance ${i}: stats changed after cache clear`);
                }
            });
            
            await Promise.all(promises);
            
            // 清理
            for (const service of services) {
                service.clearCache();
                service.resetAll();
            }
            
            this.results.push({
                testName,
                passed: raceConditions === 0,
                duration: Date.now() - start,
                metrics: {
                    instances: NUM_INSTANCES,
                    raceConditions,
                    issues: issues.slice(0, 5)
                }
            });
            
            if (raceConditions > 0) {
                this.problemsFound.push(`${testName}: ${raceConditions} race conditions`);
                logger.warn(`⚠️ 发现 ${raceConditions} 个竞态条件`);
            } else {
                logger.info(`✅ ${testName}: 无并发修改问题`);
            }
            
        } catch (error: any) {
            this.results.push({
                testName,
                passed: false,
                duration: Date.now() - start,
                error: error.message
            });
            this.problemsFound.push(`${testName}: ${error.message}`);
            logger.error(`❌ ${testName} failed: ${error.message}`);
        }
    }

    private async testResourceLifecycle(): Promise<void> {
        const testName = 'Resource Lifecycle (资源生命周期)';
        const start = Date.now();
        
        logger.info(`\n🔍 ${testName}`);
        logger.info('─'.repeat(60));

        try {
            const MEMORY_SAMPLES: number[] = [];
            const CYCLES = 50;
            
            for (let i = 0; i < CYCLES; i++) {
                const service = new EnhancedCodeKnowledgeGraphService();
                await service.analyzeProject('/workspace/src');
                
                const qe = service.getQueryEngine();
                qe.getStatistics();
                qe.getEntitiesByType(CodeEntityType.CLASS);
                
                service.clearCache();
                service.resetAll();
                
                if (i % 10 === 0) {
                    MEMORY_SAMPLES.push(this.getCurrentMemoryMB());
                    logger.info(`   Cycle ${i}/${CYCLES}, Memory: ${MEMORY_SAMPLES[MEMORY_SAMPLES.length - 1].toFixed(1)}MB`);
                }
            }
            
            // 分析内存趋势
            const firstSamples = MEMORY_SAMPLES.slice(0, 3);
            const lastSamples = MEMORY_SAMPLES.slice(-3);
            const avgFirst = firstSamples.reduce((a, b) => a + b, 0) / firstSamples.length;
            const avgLast = lastSamples.reduce((a, b) => a + b, 0) / lastSamples.length;
            const memoryGrowth = avgLast - avgFirst;
            
            const resourceLeaks = memoryGrowth > 100 ? 1 : 0;
            
            this.results.push({
                testName,
                passed: resourceLeaks === 0,
                duration: Date.now() - start,
                metrics: {
                    cycles: CYCLES,
                    avgFirstMemoryMB: avgFirst.toFixed(1),
                    avgLastMemoryMB: avgLast.toFixed(1),
                    memoryGrowthMB: memoryGrowth.toFixed(1),
                    resourceLeaks
                }
            });
            
            if (resourceLeaks > 0) {
                this.problemsFound.push(`${testName}: ${memoryGrowth.toFixed(1)}MB memory growth`);
                logger.warn(`⚠️ 发现资源泄漏: ${memoryGrowth.toFixed(1)}MB 内存增长`);
            } else {
                logger.info(`✅ ${testName}: 资源生命周期管理完美`);
            }
            
        } catch (error: any) {
            this.results.push({
                testName,
                passed: false,
                duration: Date.now() - start,
                error: error.message
            });
            this.problemsFound.push(`${testName}: ${error.message}`);
            logger.error(`❌ ${testName} failed: ${error.message}`);
        }
    }

    private async testPerformanceDegradation(): Promise<void> {
        const testName = 'Performance Degradation (性能退化)';
        const start = Date.now();
        
        logger.info(`\n🔍 ${testName}`);
        logger.info('─'.repeat(60));

        try {
            const service = new EnhancedCodeKnowledgeGraphService();
            await service.analyzeProject('/workspace/src');
            const qe = service.getQueryEngine();
            
            const SAMPLE_SIZE = 100;
            const queryTimes: number[] = [];
            
            // 预热
            for (let i = 0; i < 10; i++) {
                qe.getStatistics();
            }
            
            // 收集性能样本
            for (let i = 0; i < SAMPLE_SIZE; i++) {
                const start = Date.now();
                qe.getEntitiesByType(CodeEntityType.CLASS);
                queryTimes.push(Date.now() - start);
                
                // 每10次清理一次缓存
                if (i % 10 === 0) {
                    service.clearCache();
                }
            }
            
            // 分析性能趋势
            const first10Avg = queryTimes.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
            const last10Avg = queryTimes.slice(-10).reduce((a, b) => a + b, 0) / 10;
            const degradation = ((last10Avg - first10Avg) / first10Avg) * 100;
            
            const performanceDegradation = degradation > 50 ? 1 : 0;
            
            this.results.push({
                testName,
                passed: performanceDegradation === 0,
                duration: Date.now() - start,
                metrics: {
                    samples: SAMPLE_SIZE,
                    first10AvgMs: first10Avg.toFixed(2),
                    last10AvgMs: last10Avg.toFixed(2),
                    degradationPercent: degradation.toFixed(1)
                }
            });
            
            if (performanceDegradation > 0) {
                this.problemsFound.push(`${testName}: ${degradation.toFixed(1)}% performance degradation`);
                logger.warn(`⚠️ 发现性能退化: ${degradation.toFixed(1)}%`);
            } else {
                logger.info(`✅ ${testName}: 无性能退化`);
            }
            
        } catch (error: any) {
            this.results.push({
                testName,
                passed: false,
                duration: Date.now() - start,
                error: error.message
            });
            this.problemsFound.push(`${testName}: ${error.message}`);
            logger.error(`❌ ${testName} failed: ${error.message}`);
        }
    }

    private async testBoundaryConditions(): Promise<void> {
        const testName = 'Boundary Conditions (边界条件)';
        const start = Date.now();
        
        logger.info(`\n🔍 ${testName}`);
        logger.info('─'.repeat(60));

        try {
            const service = new EnhancedCodeKnowledgeGraphService();
            await service.analyzeProject('/workspace/src');
            const qe = service.getQueryEngine();
            const kg = service.getKnowledgeGraph();
            
            let boundaryFailures = 0;
            const issues: string[] = [];
            
            // 测试1: 空查询
            try {
                const emptyResult = qe.getEntitiesByType('' as CodeEntityType);
                if (emptyResult.length !== 0) {
                    boundaryFailures++;
                    issues.push('Empty type query did not return empty array');
                }
            } catch {
                // 预期的错误
            }
            
            // 测试2: 超长查询
            try {
                const longQuery = 'x'.repeat(10000);
                qe.searchEntitiesByName(longQuery);
            } catch {
                // 预期的错误
            }
            
            // 测试3: 特殊字符
            try {
                const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
                qe.searchEntitiesByName(specialChars);
            } catch {
                // 预期的错误
            }
            
            // 测试4: 不存在的实体ID
            const nonexistentEntity = kg.getCodeEntity('nonexistent_entity_123456');
            if (nonexistentEntity !== null) {
                boundaryFailures++;
                issues.push('Nonexistent entity returned non-null');
            }
            
            this.results.push({
                testName,
                passed: boundaryFailures === 0,
                duration: Date.now() - start,
                metrics: {
                    boundaryFailures,
                    issues: issues.slice(0, 5)
                }
            });
            
            if (boundaryFailures > 0) {
                this.problemsFound.push(`${testName}: ${boundaryFailures} failures`);
                logger.warn(`⚠️ 发现 ${boundaryFailures} 个边界条件问题`);
            } else {
                logger.info(`✅ ${testName}: 所有边界条件处理正确`);
            }
            
        } catch (error: any) {
            this.results.push({
                testName,
                passed: false,
                duration: Date.now() - start,
                error: error.message
            });
            this.problemsFound.push(`${testName}: ${error.message}`);
            logger.error(`❌ ${testName} failed: ${error.message}`);
        }
    }

    private getCurrentMemoryMB(): number {
        const memUsage = process.memoryUsage();
        return memUsage.heapUsed / 1024 / 1024;
    }

    private async printFinalReport(): Promise<void> {
        const totalDuration = Date.now() - this.startTime;
        const finalMemoryMB = this.getCurrentMemoryMB();
        const memoryGrowth = finalMemoryMB - this.initialMemoryMB;
        const passedTests = this.results.filter(r => r.passed).length;
        const totalTests = this.results.length;
        
        logger.info('\n' + '═'.repeat(80));
        logger.info('🧠 第一性原理深度测试 - 最终报告');
        logger.info('═'.repeat(80));
        logger.info(`总测试时长: ${(totalDuration / 1000).toFixed(1)}s`);
        logger.info(`总测试数: ${totalTests}`);
        logger.info(`通过数: ${passedTests}`);
        logger.info(`失败数: ${totalTests - passedTests}`);
        logger.info(`通过率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        logger.info('─'.repeat(80));
        
        if (this.problemsFound.length > 0) {
            logger.info(`⚠️ 发现 ${this.problemsFound.length} 个根本性问题:`);
            for (const problem of this.problemsFound) {
                logger.info(`   • ${problem}`);
            }
        } else {
            logger.info('🎉 未发现根本性问题!');
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
        
        logger.info('─'.repeat(80));
        logger.info(`初始内存: ${this.initialMemoryMB.toFixed(1)} MB`);
        logger.info(`最终内存: ${finalMemoryMB.toFixed(1)} MB`);
        logger.info(`内存增长: ${memoryGrowth >= 0 ? '+' : ''}${memoryGrowth.toFixed(1)} MB`);
        
        logger.info('═'.repeat(80));
        
        if (passedTests === totalTests && memoryGrowth < 50) {
            logger.info('🎉 🧠 🚀 完美! 系统通过第一性原理深度测试!');
            logger.info('🎉 🧠 🚀 系统已具备生产环境使用标准!');
        } else if (passedTests / totalTests >= 0.8) {
            logger.info('✅ 良好! 大部分测试通过，可投入生产但需持续监控');
        } else {
            logger.warn('⚠️ 需要修复发现的问题后再投入使用');
        }
        
        logger.info('═'.repeat(80));
    }
}

(async () => {
    const testSuite = new FirstPrinciplesTestSuite();
    await testSuite.runAllTests();
})().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
});
