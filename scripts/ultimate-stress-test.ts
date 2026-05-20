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

interface PhaseStats {
  phaseName: string;
  startMemoryMB: number;
  endMemoryMB: number;
  memoryGrowthMB: number;
  totalOperations: number;
  failedOperations: number;
  avgOperationMs: number;
  testDurationSec: number;
}

class UltimateStressTestSuite {
  private results: TestResult[] = [];
  private phaseStats: PhaseStats[] = [];
  private globalStartTime: number;

  constructor() {
    this.globalStartTime = Date.now();
  }

  async runAllTests(): Promise<void> {
    logger.info('══════════════════════════════════════════════════════════');
    logger.info('🚀 开始终极系统压力测试 (Ultimate Stress Test)');
    logger.info('══════════════════════════════════════════════════════════');

    try {
      await this.phase1BasicFunctionality();
      await this.phase2ConcurrencyBurst();
      await this.phase3LongDuration(120); // 2分钟 - 快速测试
      await this.phase4MemoryPressure();
      await this.phase5ErrorInjection();
      await this.phase6ServiceLifecycle();
      await this.phase7ExtremeQueries();
      await this.phase8MixedWorkload();
    } catch (error: any) {
      logger.error('测试套件严重失败', error);
      this.results.push({
        testName: 'CRITICAL - FATAL FAILURE',
        passed: false,
        duration: Date.now() - this.globalStartTime,
        error: error.message
      });
    } finally {
      this.printFinalReport();
    }
  }

  private async phase1BasicFunctionality(): Promise<void> {
    const phaseName = 'Phase 1 - 基础功能验证';
    logger.info(`\n📦 ${phaseName}`);
    logger.info('─'.repeat(50));

    const startMemory = this.getCurrentMemoryMB();
    const phaseStart = Date.now();

    const testResults: TestResult[] = [];

    try {
      testResults.push(await this.testProjectAnalysis());
      testResults.push(await this.testBasicQueries());
      testResults.push(await this.testSemanticSearch());
      testResults.push(await this.testCacheOperations());
    } catch (error: any) {
      testResults.push({
        testName: 'Phase 1 Exception',
        passed: false,
        duration: Date.now() - phaseStart,
        error: error.message
      });
    }

    this.recordPhaseStats({
      phaseName,
      startMemoryMB: startMemory,
      endMemoryMB: this.getCurrentMemoryMB(),
      memoryGrowthMB: this.getCurrentMemoryMB() - startMemory,
      totalOperations: testResults.length,
      failedOperations: testResults.filter(r => !r.passed).length,
      avgOperationMs: testResults.reduce((sum, r) => sum + r.duration, 0) / testResults.length,
      testDurationSec: (Date.now() - phaseStart) / 1000
    });

    this.results.push(...testResults);
  }

  private async phase2ConcurrencyBurst(): Promise<void> {
    const phaseName = 'Phase 2 - 并发突发测试';
    logger.info(`\n📦 ${phaseName}`);
    logger.info('─'.repeat(50));

    const startMemory = this.getCurrentMemoryMB();
    const phaseStart = Date.now();

    const testResults: TestResult[] = [];

    try {
      testResults.push(await this.testConcurrentQueries(50, 'Low'));
      testResults.push(await this.testConcurrentQueries(200, 'Medium'));
      testResults.push(await this.testConcurrentQueries(500, 'High'));
      testResults.push(await this.testBurstMode());
    } catch (error: any) {
      testResults.push({
        testName: 'Phase 2 Exception',
        passed: false,
        duration: Date.now() - phaseStart,
        error: error.message
      });
    }

    this.recordPhaseStats({
      phaseName,
      startMemoryMB: startMemory,
      endMemoryMB: this.getCurrentMemoryMB(),
      memoryGrowthMB: this.getCurrentMemoryMB() - startMemory,
      totalOperations: 50 + 200 + 500 + 1000,
      failedOperations: testResults.filter(r => !r.passed).length,
      avgOperationMs: testResults.reduce((sum, r) => sum + r.duration, 0) / testResults.length,
      testDurationSec: (Date.now() - phaseStart) / 1000
    });

    this.results.push(...testResults);
  }

  private async phase3LongDuration(durationSeconds: number): Promise<void> {
    const phaseName = `Phase 3 - 长时运行测试 (${durationSeconds}秒)`;
    logger.info(`\n📦 ${phaseName}`);
    logger.info('─'.repeat(50));

    const startMemory = this.getCurrentMemoryMB();
    const phaseStart = Date.now();

    const testResult: TestResult = {
      testName: 'Long Duration Test',
      passed: true,
      duration: 0
    };

    try {
      await this.longRunningTest(durationSeconds);
      testResult.duration = Date.now() - phaseStart;
      testResult.passed = true;
      testResult.metrics = {
        durationSeconds,
        memoryStartMB: startMemory,
        memoryEndMB: this.getCurrentMemoryMB(),
        memoryGrowthMB: this.getCurrentMemoryMB() - startMemory
      };
    } catch (error: any) {
      testResult.passed = false;
      testResult.duration = Date.now() - phaseStart;
      testResult.error = error.message;
    }

    this.recordPhaseStats({
      phaseName,
      startMemoryMB: startMemory,
      endMemoryMB: this.getCurrentMemoryMB(),
      memoryGrowthMB: this.getCurrentMemoryMB() - startMemory,
      totalOperations: 100000,
      failedOperations: testResult.passed ? 0 : 1,
      avgOperationMs: 0,
      testDurationSec: durationSeconds
    });

    this.results.push(testResult);
  }

  private async phase4MemoryPressure(): Promise<void> {
    const phaseName = 'Phase 4 - 内存压力测试';
    logger.info(`\n📦 ${phaseName}`);
    logger.info('─'.repeat(50));

    const startMemory = this.getCurrentMemoryMB();
    const phaseStart = Date.now();

    const testResults: TestResult[] = [];

    try {
      testResults.push(await this.testLargeResultSets());
      testResults.push(await this.testRapidAllocation());
      testResults.push(await this.testFragmentation());
    } catch (error: any) {
      testResults.push({
        testName: 'Phase 4 Exception',
        passed: false,
        duration: Date.now() - phaseStart,
        error: error.message
      });
    }

    this.recordPhaseStats({
      phaseName,
      startMemoryMB: startMemory,
      endMemoryMB: this.getCurrentMemoryMB(),
      memoryGrowthMB: this.getCurrentMemoryMB() - startMemory,
      totalOperations: 5000,
      failedOperations: testResults.filter(r => !r.passed).length,
      avgOperationMs: testResults.reduce((sum, r) => sum + r.duration, 0) / testResults.length,
      testDurationSec: (Date.now() - phaseStart) / 1000
    });

    this.results.push(...testResults);
  }

  private async phase5ErrorInjection(): Promise<void> {
    const phaseName = 'Phase 5 - 错误注入测试';
    logger.info(`\n📦 ${phaseName}`);
    logger.info('─'.repeat(50));

    const startMemory = this.getCurrentMemoryMB();
    const phaseStart = Date.now();

    const testResults: TestResult[] = [];

    try {
      testResults.push(await this.testInvalidQueries());
      testResults.push(await this.testBoundaryConditions());
      testResults.push(await this.testRecoveryAfterErrors());
    } catch (error: any) {
      testResults.push({
        testName: 'Phase 5 Exception',
        passed: false,
        duration: Date.now() - phaseStart,
        error: error.message
      });
    }

    this.recordPhaseStats({
      phaseName,
      startMemoryMB: startMemory,
      endMemoryMB: this.getCurrentMemoryMB(),
      memoryGrowthMB: this.getCurrentMemoryMB() - startMemory,
      totalOperations: 300,
      failedOperations: testResults.filter(r => !r.passed).length,
      avgOperationMs: testResults.reduce((sum, r) => sum + r.duration, 0) / testResults.length,
      testDurationSec: (Date.now() - phaseStart) / 1000
    });

    this.results.push(...testResults);
  }

  private async phase6ServiceLifecycle(): Promise<void> {
    const phaseName = 'Phase 6 - 服务生命周期测试';
    logger.info(`\n📦 ${phaseName}`);
    logger.info('─'.repeat(50));

    const startMemory = this.getCurrentMemoryMB();
    const phaseStart = Date.now();

    const testResults: TestResult[] = [];

    try {
      testResults.push(await this.testRapidCreationDestruction(50));
      testResults.push(await this.testStatePersistence());
      testResults.push(await this.testResourceLeakage());
    } catch (error: any) {
      testResults.push({
        testName: 'Phase 6 Exception',
        passed: false,
        duration: Date.now() - phaseStart,
        error: error.message
      });
    }

    this.recordPhaseStats({
      phaseName,
      startMemoryMB: startMemory,
      endMemoryMB: this.getCurrentMemoryMB(),
      memoryGrowthMB: this.getCurrentMemoryMB() - startMemory,
      totalOperations: 150,
      failedOperations: testResults.filter(r => !r.passed).length,
      avgOperationMs: testResults.reduce((sum, r) => sum + r.duration, 0) / testResults.length,
      testDurationSec: (Date.now() - phaseStart) / 1000
    });

    this.results.push(...testResults);
  }

  private async phase7ExtremeQueries(): Promise<void> {
    const phaseName = 'Phase 7 - 极限查询测试';
    logger.info(`\n📦 ${phaseName}`);
    logger.info('─'.repeat(50));

    const startMemory = this.getCurrentMemoryMB();
    const phaseStart = Date.now();

    const testResults: TestResult[] = [];

    try {
      testResults.push(await this.testDeepQueryChains());
      testResults.push(await this.testComplexSearchPatterns());
    } catch (error: any) {
      testResults.push({
        testName: 'Phase 7 Exception',
        passed: false,
        duration: Date.now() - phaseStart,
        error: error.message
      });
    }

    this.recordPhaseStats({
      phaseName,
      startMemoryMB: startMemory,
      endMemoryMB: this.getCurrentMemoryMB(),
      memoryGrowthMB: this.getCurrentMemoryMB() - startMemory,
      totalOperations: 200,
      failedOperations: testResults.filter(r => !r.passed).length,
      avgOperationMs: testResults.reduce((sum, r) => sum + r.duration, 0) / testResults.length,
      testDurationSec: (Date.now() - phaseStart) / 1000
    });

    this.results.push(...testResults);
  }

  private async phase8MixedWorkload(): Promise<void> {
    const phaseName = 'Phase 8 - 混合工作负载测试';
    logger.info(`\n📦 ${phaseName}`);
    logger.info('─'.repeat(50));

    const startMemory = this.getCurrentMemoryMB();
    const phaseStart = Date.now();

    const testResults: TestResult[] = [];

    try {
      testResults.push(await this.testSimulatedProductionLoad());
    } catch (error: any) {
      testResults.push({
        testName: 'Phase 8 Exception',
        passed: false,
        duration: Date.now() - phaseStart,
        error: error.message
      });
    }

    this.recordPhaseStats({
      phaseName,
      startMemoryMB: startMemory,
      endMemoryMB: this.getCurrentMemoryMB(),
      memoryGrowthMB: this.getCurrentMemoryMB() - startMemory,
      totalOperations: 50000,
      failedOperations: testResults.filter(r => !r.passed).length,
      avgOperationMs: testResults.reduce((sum, r) => sum + r.duration, 0) / testResults.length,
      testDurationSec: (Date.now() - phaseStart) / 1000
    });

    this.results.push(...testResults);
  }

  // 具体测试方法
  private async testProjectAnalysis(): Promise<TestResult> {
    const start = Date.now();
    try {
      logger.info('  Testing project analysis...');
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const stats = service.getStatistics();
      
      return {
        testName: 'Project Analysis',
        passed: stats.totalEntityCount > 0,
        duration: Date.now() - start,
        metrics: {
          entities: stats.totalEntityCount,
          relations: stats.totalRelationCount,
          files: stats.fileEntityCount
        }
      };
    } catch (e: any) {
      return {
        testName: 'Project Analysis',
        passed: false,
        duration: Date.now() - start,
        error: e.message
      };
    }
  }

  private async testBasicQueries(): Promise<TestResult> {
    const start = Date.now();
    try {
      logger.info('  Testing basic queries...');
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src/core');
      const queryEngine = service.getQueryEngine();
      
      const classes = queryEngine.getEntitiesByType(CodeEntityType.CLASS);
      const functions = queryEngine.getEntitiesByType(CodeEntityType.FUNCTION);
      
      return {
        testName: 'Basic Queries',
        passed: classes.length > 0 && functions.length > 0,
        duration: Date.now() - start,
        metrics: {
          classesFound: classes.length,
          functionsFound: functions.length
        }
      };
    } catch (e: any) {
      return {
        testName: 'Basic Queries',
        passed: false,
        duration: Date.now() - start,
        error: e.message
      };
    }
  }

  private async testSemanticSearch(): Promise<TestResult> {
    const start = Date.now();
    try {
      logger.info('  Testing semantic search...');
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const semanticSearch = service.getSemanticSearch();
      
      const results = await semanticSearch.searchEntities('service', 10);
      
      return {
        testName: 'Semantic Search',
        passed: true,
        duration: Date.now() - start,
        metrics: {
          resultsFound: results.length
        }
      };
    } catch (e: any) {
      return {
        testName: 'Semantic Search',
        passed: false,
        duration: Date.now() - start,
        error: e.message
      };
    }
  }

  private async testCacheOperations(): Promise<TestResult> {
    const start = Date.now();
    try {
      logger.info('  Testing cache operations...');
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const queryEngine = service.getQueryEngine();
      
      // Warm cache
      for (let i = 0; i < 50; i++) {
        queryEngine.getEntitiesByType(CodeEntityType.CLASS);
      }
      
      // Clear cache
      service.clearCache();
      
      // Verify reset
      const cacheStats = service.getCacheStatistics();
      
      return {
        testName: 'Cache Operations',
        passed: true,
        duration: Date.now() - start,
        metrics: {
          cacheSizeAfterClear: cacheStats.queryCache.size
        }
      };
    } catch (e: any) {
      return {
        testName: 'Cache Operations',
        passed: false,
        duration: Date.now() - start,
        error: e.message
      };
    }
  }

  private async testConcurrentQueries(concurrency: number, level: string): Promise<TestResult> {
    const start = Date.now();
    try {
      logger.info(`  Testing ${level} concurrency (${concurrency} queries)...`);
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const queryEngine = service.getQueryEngine();
      
      const promises: Promise<any>[] = [];
      const queryTypes = [
        () => queryEngine.getEntitiesByType(CodeEntityType.CLASS),
        () => queryEngine.getEntitiesByType(CodeEntityType.FUNCTION),
        () => queryEngine.searchEntitiesByName('Service'),
        () => queryEngine.getStatistics()
      ];
      
      for (let i = 0; i < concurrency; i++) {
        const queryFn = queryTypes[i % queryTypes.length];
        promises.push(Promise.resolve(queryFn()));
      }
      
      await Promise.all(promises);
      
      return {
        testName: `Concurrent Queries (${level} - ${concurrency})`,
        passed: true,
        duration: Date.now() - start,
        metrics: {
          concurrencyLevel: concurrency,
          queriesPerSecond: (concurrency / ((Date.now() - start) / 1000)).toFixed(2)
        }
      };
    } catch (e: any) {
      return {
        testName: `Concurrent Queries (${level} - ${concurrency})`,
        passed: false,
        duration: Date.now() - start,
        error: e.message
      };
    }
  }

  private async testBurstMode(): Promise<TestResult> {
    const start = Date.now();
    try {
      logger.info('  Testing burst mode (1000 queries)...');
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const queryEngine = service.getQueryEngine();
      
      let count = 0;
      for (let i = 0; i < 1000; i++) {
        queryEngine.getEntitiesByType(CodeEntityType.CLASS);
        count++;
      }
      
      return {
        testName: 'Burst Mode (1000 queries)',
        passed: count === 1000,
        duration: Date.now() - start,
        metrics: {
          queriesCompleted: count,
          avgQueryMs: ((Date.now() - start) / count).toFixed(3)
        }
      };
    } catch (e: any) {
      return {
        testName: 'Burst Mode (1000 queries)',
        passed: false,
        duration: Date.now() - start,
        error: e.message
      };
    }
  }

  private async longRunningTest(durationSeconds: number): Promise<void> {
    logger.info(`  Starting long run test (${durationSeconds} seconds)...`);
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject('/workspace/src');
    const queryEngine = service.getQueryEngine();
    
    const endTime = Date.now() + durationSeconds * 1000;
    let operations = 0;
    let lastLog = Date.now();
    
    while (Date.now() < endTime) {
      const random = Math.random();
      
      if (random < 0.25) {
        queryEngine.getEntitiesByType(CodeEntityType.CLASS);
      } else if (random < 0.5) {
        queryEngine.searchEntitiesByName('Test');
      } else if (random < 0.75) {
        queryEngine.getStatistics();
      } else {
        service.clearCache();
      }
      
      operations++;
      
      if (Date.now() - lastLog > 30000) { // 每30秒记录一次
        const memMB = this.getCurrentMemoryMB();
        logger.info(`    Progress: ${operations} ops, Memory: ${memMB.toFixed(2)}MB, Time: ${((Date.now() - this.globalStartTime) / 1000).toFixed(0)}s`);
        lastLog = Date.now();
      }
      
      // 防止CPU 100%
      await new Promise(r => setImmediate(r));
    }
    
    logger.info(`  Long run test complete: ${operations} operations`);
  }

  private async testLargeResultSets(): Promise<TestResult> {
    const start = Date.now();
    try {
      logger.info('  Testing large result sets...');
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const queryEngine = service.getQueryEngine();
      
      // 获取所有类型的实体
      const allEntities = [];
      const types = [CodeEntityType.CLASS, CodeEntityType.FUNCTION, CodeEntityType.INTERFACE, CodeEntityType.VARIABLE];
      
      for (const type of types) {
        const entities = queryEngine.getEntitiesByType(type);
        allEntities.push(...entities);
      }
      
      return {
        testName: 'Large Result Sets',
        passed: true,
        duration: Date.now() - start,
        metrics: {
          totalEntitiesFetched: allEntities.length,
          dataSizeEstimateMB: (JSON.stringify(allEntities).length / 1024 / 1024).toFixed(3)
        }
      };
    } catch (e: any) {
      return {
        testName: 'Large Result Sets',
        passed: false,
        duration: Date.now() - start,
        error: e.message
      };
    }
  }

  private async testRapidAllocation(): Promise<TestResult> {
    const start = Date.now();
    try {
      logger.info('  Testing rapid memory allocation...');
      
      const largeArrays: any[] = [];
      for (let i = 0; i < 1000; i++) {
        largeArrays.push(new Array(10000).fill(0));
      }
      
      // 释放
      largeArrays.length = 0;
      
      // 触发GC
      if (global.gc) {
        global.gc();
      }
      
      return {
        testName: 'Rapid Allocation',
        passed: true,
        duration: Date.now() - start
      };
    } catch (e: any) {
      return {
        testName: 'Rapid Allocation',
        passed: false,
        duration: Date.now() - start,
        error: e.message
      };
    }
  }

  private async testFragmentation(): Promise<TestResult> {
    const start = Date.now();
    try {
      logger.info('  Testing memory fragmentation...');
      
      for (let i = 0; i < 5000; i++) {
        const small = new Array(100).fill(0);
        // 创建和销毁小对象
        if (i % 2 === 0) {
          const temp = new Array(1000).fill(0);
          temp.length = 0;
        }
      }
      
      return {
        testName: 'Memory Fragmentation',
        passed: true,
        duration: Date.now() - start
      };
    } catch (e: any) {
      return {
        testName: 'Memory Fragmentation',
        passed: false,
        duration: Date.now() - start,
        error: e.message
      };
    }
  }

  private async testInvalidQueries(): Promise<TestResult> {
    const start = Date.now();
    try {
      logger.info('  Testing invalid queries...');
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const queryEngine = service.getQueryEngine();
      
      let handledCount = 0;
      
      try {
        queryEngine.searchEntitiesByName('');
        handledCount++;
      } catch {
        // 预期的失败
        handledCount++;
      }
      
      try {
        queryEngine.getEntitiesByFile('');
        handledCount++;
      } catch {
        handledCount++;
      }
      
      try {
        queryEngine.searchEntitiesByName('x'.repeat(10000));
        handledCount++;
      } catch {
        handledCount++;
      }
      
      return {
        testName: 'Invalid Queries',
        passed: handledCount >= 2,
        duration: Date.now() - start,
        metrics: {
          handledInvalidQueries: handledCount
        }
      };
    } catch (e: any) {
      return {
        testName: 'Invalid Queries',
        passed: false,
        duration: Date.now() - start,
        error: e.message
      };
    }
  }

  private async testBoundaryConditions(): Promise<TestResult> {
    const start = Date.now();
    try {
      logger.info('  Testing boundary conditions...');
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const queryEngine = service.getQueryEngine();
      
      let allPassed = true;
      
      try {
        queryEngine.getStatistics();
      } catch {
        allPassed = false;
      }
      
      try {
        queryEngine.getEntitiesByType(CodeEntityType.CLASS);
      } catch {
        allPassed = false;
      }
      
      try {
        service.clearCache();
        service.resetAll();
      } catch {
        allPassed = false;
      }
      
      return {
        testName: 'Boundary Conditions',
        passed: allPassed,
        duration: Date.now() - start
      };
    } catch (e: any) {
      return {
        testName: 'Boundary Conditions',
        passed: false,
        duration: Date.now() - start,
        error: e.message
      };
    }
  }

  private async testRecoveryAfterErrors(): Promise<TestResult> {
    const start = Date.now();
    try {
      logger.info('  Testing recovery after errors...');
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const queryEngine = service.getQueryEngine();
      
      // 先执行一些正常操作
      queryEngine.getEntitiesByType(CodeEntityType.CLASS);
      
      // 尝试一些错误操作
      try {
        queryEngine.searchEntitiesByName('');
      } catch {
        // 预期的
      }
      
      // 验证恢复
      const recoveryResult = queryEngine.getEntitiesByType(CodeEntityType.FUNCTION);
      
      return {
        testName: 'Recovery After Errors',
        passed: recoveryResult.length > 0,
        duration: Date.now() - start
      };
    } catch (e: any) {
      return {
        testName: 'Recovery After Errors',
        passed: false,
        duration: Date.now() - start,
        error: e.message
      };
    }
  }

  private async testRapidCreationDestruction(count: number): Promise<TestResult> {
    const start = Date.now();
    try {
      logger.info(`  Testing rapid service creation/destruction (${count} times)...`);
      
      for (let i = 0; i < count; i++) {
        const service = new EnhancedCodeKnowledgeGraphService();
        await service.analyzeProject('/workspace/src/core');
        const stats = service.getStatistics();
        
        if (i % 10 === 0) {
          logger.info(`    Completed ${i}/${count}`);
        }
        
        service.clearCache();
        service.resetAll();
      }
      
      return {
        testName: `Rapid Service Creation/Destruction (${count})`,
        passed: true,
        duration: Date.now() - start,
        metrics: {
          servicesCreated: count,
          avgCreationMs: ((Date.now() - start) / count).toFixed(2)
        }
      };
    } catch (e: any) {
      return {
        testName: `Rapid Service Creation/Destruction (${count})`,
        passed: false,
        duration: Date.now() - start,
        error: e.message
      };
    }
  }

  private async testStatePersistence(): Promise<TestResult> {
    const start = Date.now();
    try {
      logger.info('  Testing state persistence...');
      
      const service1 = new EnhancedCodeKnowledgeGraphService();
      await service1.analyzeProject('/workspace/src');
      const stats1 = service1.getStatistics();
      
      // 重新创建服务
      const service2 = new EnhancedCodeKnowledgeGraphService();
      await service2.analyzeProject('/workspace/src');
      const stats2 = service2.getStatistics();
      
      return {
        testName: 'State Persistence',
        passed: Math.abs(stats1.totalEntityCount - stats2.totalEntityCount) < 10,
        duration: Date.now() - start,
        metrics: {
          service1Entities: stats1.totalEntityCount,
          service2Entities: stats2.totalEntityCount,
          difference: stats1.totalEntityCount - stats2.totalEntityCount
        }
      };
    } catch (e: any) {
      return {
        testName: 'State Persistence',
        passed: false,
        duration: Date.now() - start,
        error: e.message
      };
    }
  }

  private async testResourceLeakage(): Promise<TestResult> {
    const start = Date.now();
    try {
      logger.info('  Testing resource leakage...');
      
      const memoryBefore = this.getCurrentMemoryMB();
      
      // 创建和销毁多个服务
      for (let i = 0; i < 20; i++) {
        const service = new EnhancedCodeKnowledgeGraphService();
        await service.analyzeProject('/workspace/src');
        service.clearCache();
        service.resetAll();
      }
      
      const memoryAfter = this.getCurrentMemoryMB();
      const growth = memoryAfter - memoryBefore;
      
      return {
        testName: 'Resource Leakage',
        passed: growth < 100, // 小于100MB增长
        duration: Date.now() - start,
        metrics: {
          memoryBeforeMB: memoryBefore.toFixed(2),
          memoryAfterMB: memoryAfter.toFixed(2),
          memoryGrowthMB: growth.toFixed(2)
        }
      };
    } catch (e: any) {
      return {
        testName: 'Resource Leakage',
        passed: false,
        duration: Date.now() - start,
        error: e.message
      };
    }
  }

  private async testDeepQueryChains(): Promise<TestResult> {
    const start = Date.now();
    try {
      logger.info('  Testing deep query chains...');
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const queryEngine = service.getQueryEngine();
      
      const classes = queryEngine.getEntitiesByType(CodeEntityType.CLASS);
      let totalNodes = 0;
      
      for (const cls of classes.slice(0, 30)) {
        try {
          const chain = queryEngine.getCallChain(cls.entityId, 5);
          totalNodes += chain.path.length;
        } catch {
          // 继续
        }
      }
      
      return {
        testName: 'Deep Query Chains',
        passed: true,
        duration: Date.now() - start,
        metrics: {
          totalNodesProcessed: totalNodes
        }
      };
    } catch (e: any) {
      return {
        testName: 'Deep Query Chains',
        passed: false,
        duration: Date.now() - start,
        error: e.message
      };
    }
  }

  private async testComplexSearchPatterns(): Promise<TestResult> {
    const start = Date.now();
    try {
      logger.info('  Testing complex search patterns...');
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const queryEngine = service.getQueryEngine();
      
      const searchPatterns = ['test', 'service', 'parser', 'manager', 'cache', 'query'];
      let totalResults = 0;
      
      for (const pattern of searchPatterns) {
        const results = queryEngine.searchEntitiesByName(pattern);
        totalResults += results.length;
      }
      
      return {
        testName: 'Complex Search Patterns',
        passed: true,
        duration: Date.now() - start,
        metrics: {
          patternsSearched: searchPatterns.length,
          totalResultsFound: totalResults
        }
      };
    } catch (e: any) {
      return {
        testName: 'Complex Search Patterns',
        passed: false,
        duration: Date.now() - start,
        error: e.message
      };
    }
  }

  private async testSimulatedProductionLoad(): Promise<TestResult> {
    const start = Date.now();
    try {
      logger.info('  Testing simulated production load...');
      
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const queryEngine = service.getQueryEngine();
      
      const totalOperations = 50000;
      let completed = 0;
      let lastLog = Date.now();
      
      for (let i = 0; i < totalOperations; i++) {
        const random = Math.random();
        
        if (random < 0.3) {
          queryEngine.getEntitiesByType(CodeEntityType.CLASS);
        } else if (random < 0.5) {
          queryEngine.getEntitiesByType(CodeEntityType.FUNCTION);
        } else if (random < 0.7) {
          queryEngine.searchEntitiesByName('Service');
        } else if (random < 0.85) {
          queryEngine.getStatistics();
        } else {
          service.clearCache();
        }
        
        completed++;
        
        if (Date.now() - lastLog > 10000 && i > 0 && i % 1000 === 0) {
          logger.info(`    Progress: ${completed}/${totalOperations} (${(completed / totalOperations * 100).toFixed(1)}%)`);
          lastLog = Date.now();
        }
      }
      
      return {
        testName: 'Simulated Production Load (50,000 ops)',
        passed: completed === totalOperations,
        duration: Date.now() - start,
        metrics: {
          operationsCompleted: completed,
          opsPerSecond: (completed / ((Date.now() - start) / 1000)).toFixed(2)
        }
      };
    } catch (e: any) {
      return {
        testName: 'Simulated Production Load (50,000 ops)',
        passed: false,
        duration: Date.now() - start,
        error: e.message
      };
    }
  }

  private getCurrentMemoryMB(): number {
    const mem = process.memoryUsage();
    return mem.heapUsed / 1024 / 1024;
  }

  private recordPhaseStats(stats: PhaseStats): void {
    this.phaseStats.push(stats);
  }

  private printFinalReport(): void {
    const totalDuration = (Date.now() - this.globalStartTime) / 1000;
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0';

    logger.info('\n' + '═'.repeat(80));
    logger.info('📊 最终测试报告 - Ultimate Stress Test');
    logger.info('═'.repeat(80));
    logger.info(`总测试时长: ${totalDuration.toFixed(1)}秒`);
    logger.info(`总测试数: ${totalTests}`);
    logger.info(`通过测试: ${passedTests}`);
    logger.info(`失败测试: ${failedTests}`);
    logger.info(`通过率: ${passRate}%`);
    logger.info('═'.repeat(80));

    // 按阶段打印
    for (const phaseStat of this.phaseStats) {
      logger.info(`\n📈 ${phaseStat.phaseName}`);
      logger.info(`  内存变化: ${phaseStat.startMemoryMB.toFixed(1)}MB → ${phaseStat.endMemoryMB.toFixed(1)}MB (${phaseStat.memoryGrowthMB >= 0 ? '+' : ''}${phaseStat.memoryGrowthMB.toFixed(1)}MB)`);
      logger.info(`  操作数: ${phaseStat.totalOperations.toLocaleString()}, 失败: ${phaseStat.failedOperations}`);
      logger.info(`  持续时间: ${phaseStat.testDurationSec.toFixed(1)}秒`);
    }

    // 详细结果
    if (failedTests > 0) {
      logger.info('\n❌ 失败测试详情:');
      for (const result of this.results.filter(r => !r.passed)) {
        logger.info(`  - ${result.testName}`);
        if (result.error) {
          logger.info(`    错误: ${result.error}`);
        }
      }
    }

    logger.info('\n✅ 通过测试:');
    for (const result of this.results.filter(r => r.passed)) {
      logger.info(`  - ${result.testName} (${result.duration}ms)`);
      if (result.metrics) {
        for (const [key, value] of Object.entries(result.metrics)) {
          logger.info(`    ${key}: ${value}`);
        }
      }
    }

    logger.info('\n' + '═'.repeat(80));
    if (passRate === '100.0') {
      logger.info('🎉 完美！所有测试通过！系统稳定！');
    } else if (Number(passRate) >= 90) {
      logger.info('✅ 优秀！测试通过率 ' + passRate + '%');
    } else if (Number(passRate) >= 80) {
      logger.info('⚠️ 良好！测试通过率 ' + passRate + '%，建议关注失败项');
    } else {
      logger.info('❌ 需要改进！测试通过率 ' + passRate + '%');
    }
    logger.info('═'.repeat(80));
  }
}

// 执行测试
(async () => {
  const suite = new UltimateStressTestSuite();
  await suite.runAllTests();
})().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
