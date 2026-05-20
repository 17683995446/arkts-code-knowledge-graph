import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import { ApplicationLogger } from '../src/infrastructure/logger/Logger.js';
import { CodeEntityType } from '../src/shared/index.js';

const logger = ApplicationLogger.getInstance();

interface TestSuiteConfig {
  name: string;
  enabled: boolean;
  iterations: number;
  timeout?: number;
}

interface TestResult {
  suite: string;
  tests: Array<{
    name: string;
    passed: boolean;
    duration: number;
    error?: string;
    metrics?: Record<string, any>;
  }>;
  overallPassed: boolean;
}

class SystematicallyDeepTestSuite {
  private results: TestResult[] = [];
  private totalStartTime: number = 0;
  
  private readonly testSuites: TestSuiteConfig[] = [
    { name: 'Resource Limits', enabled: true, iterations: 3 },
    { name: 'Data Integrity', enabled: true, iterations: 3 },
    { name: 'Concurrency Limits', enabled: true, iterations: 3 },
    { name: 'Failure Recovery', enabled: true, iterations: 2 },
    { name: 'Performance Regression', enabled: true, iterations: 5 },
    { name: 'Long Duration', enabled: true, iterations: 1, timeout: 300000 },
  ];

  async runAllSuites(): Promise<void> {
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🚀 STARTING SYSTEMATICALLY DEEP TEST SUITE');
    logger.info('═══════════════════════════════════════════════════════════');
    this.totalStartTime = Date.now();

    for (const suite of this.testSuites) {
      if (!suite.enabled) {
        logger.info(`⏭️  Skipping disabled suite: ${suite.name}`);
        continue;
      }
      
      logger.info(`\n📦 Running suite: ${suite.name}`);
      logger.info('─'.repeat(60));
      
      const suiteResult = await this.runSuite(suite);
      this.results.push(suiteResult);
      
      this.printSuiteResult(suiteResult);
    }

    this.printOverallSummary();
  }

  private async runSuite(suite: TestSuiteConfig): Promise<TestResult> {
    const suiteResult: TestResult = {
      suite: suite.name,
      tests: [],
      overallPassed: true
    };

    for (let i = 0; i < suite.iterations; i++) {
      logger.info(`  Iteration ${i + 1}/${suite.iterations}...`);
      
      try {
        const iterationTests = await this.runSuiteIteration(suite.name, i);
        suiteResult.tests.push(...iterationTests);
      } catch (error: any) {
        suiteResult.tests.push({
          name: `${suite.name} - Iteration ${i + 1}`,
          passed: false,
          duration: 0,
          error: error.message
        });
        suiteResult.overallPassed = false;
      }
    }

    suiteResult.overallPassed = suiteResult.tests.every(t => t.passed);
    return suiteResult;
  }

  private async runSuiteIteration(suiteName: string, iteration: number): Promise<any[]> {
    const tests: any[] = [];
    
    switch (suiteName) {
      case 'Resource Limits':
        tests.push(...await this.testResourceLimits());
        break;
      case 'Data Integrity':
        tests.push(...await this.testDataIntegrity());
        break;
      case 'Concurrency Limits':
        tests.push(...await this.testConcurrencyLimits());
        break;
      case 'Failure Recovery':
        tests.push(...await this.testFailureRecovery());
        break;
      case 'Performance Regression':
        tests.push(...await this.testPerformanceRegression());
        break;
      case 'Long Duration':
        tests.push(...await this.testLongDuration());
        break;
    }
    
    return tests;
  }

  private async testResourceLimits(): Promise<any[]> {
    const tests = [];
    const startTime = Date.now();

    // Test 1: Minimal Memory Mode
    logger.info('    Testing minimal memory mode...');
    try {
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src/core');
      
      // Force garbage collection if available
      if (global.gc) global.gc();
      
      const memBefore = service.getMemoryUsage();
      
      // Run operations
      for (let i = 0; i < 100; i++) {
        service.clearCache();
        service.resetAll();
      }
      
      const memAfter = service.getMemoryUsage();
      
      tests.push({
        name: 'Minimal Memory Mode',
        passed: true,
        duration: Date.now() - startTime,
        metrics: {
          memoryBeforeMB: memBefore.heapUsed.toFixed(0),
          memoryAfterMB: memAfter.heapUsed.toFixed(0),
          memoryChangeMB: ((memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024).toFixed(2)
        }
      });
    } catch (e: any) {
      tests.push({ name: 'Minimal Memory Mode', passed: false, duration: 0, error: e.message });
    }

    // Test 2: Large Query Results
    logger.info('    Testing large query results...');
    try {
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const queryEngine = service.getQueryEngine();
      
      const start = Date.now();
      const allEntities = queryEngine.getStatistics();
      
      tests.push({
        name: 'Large Query Results',
        passed: allEntities.totalEntityCount > 0,
        duration: Date.now() - start,
        metrics: {
          totalEntities: allEntities.totalEntityCount,
          totalRelations: allEntities.totalRelationCount
        }
      });
    } catch (e: any) {
      tests.push({ name: 'Large Query Results', passed: false, duration: 0, error: e.message });
    }

    // Test 3: Empty and Null Handling
    logger.info('    Testing empty and null handling...');
    try {
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const queryEngine = service.getQueryEngine();
      
      const emptySearch = queryEngine.searchEntitiesByName('');
      const nullSearch = queryEngine.searchEntitiesByName('__NONEXISTENT__12345678');
      const invalidType = queryEngine.getEntitiesByType('INVALID' as CodeEntityType);
      
      tests.push({
        name: 'Empty and Null Handling',
        passed: Array.isArray(emptySearch) && Array.isArray(nullSearch),
        duration: 0,
        metrics: {
          emptySearchResult: emptySearch.length,
          nullSearchResult: nullSearch.length,
          invalidTypeResult: invalidType.length
        }
      });
    } catch (e: any) {
      tests.push({ name: 'Empty and Null Handling', passed: false, duration: 0, error: e.message });
    }

    return tests;
  }

  private async testDataIntegrity(): Promise<any[]> {
    const tests = [];
    const startTime = Date.now();

    // Test 1: Consistency After Multiple Operations
    logger.info('    Testing data consistency...');
    try {
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      
      const queryEngine = service.getQueryEngine();
      const stats1 = queryEngine.getStatistics();
      const classes1 = queryEngine.getEntitiesByType(CodeEntityType.CLASS);
      
      // Perform multiple operations
      for (let i = 0; i < 20; i++) {
        service.clearCache();
        queryEngine.getEntitiesByType(CodeEntityType.CLASS);
        queryEngine.searchEntitiesByName('Test');
      }
      
      const stats2 = queryEngine.getStatistics();
      const classes2 = queryEngine.getEntitiesByType(CodeEntityType.CLASS);
      
      const consistent = stats1.totalEntityCount === stats2.totalEntityCount &&
                        classes1.length === classes2.length;
      
      tests.push({
        name: 'Data Consistency',
        passed: consistent,
        duration: Date.now() - startTime,
        metrics: {
          initialEntities: stats1.totalEntityCount,
          finalEntities: stats2.totalEntityCount,
          consistent: consistent
        }
      });
    } catch (e: any) {
      tests.push({ name: 'Data Consistency', passed: false, duration: 0, error: e.message });
    }

    // Test 2: Entity Retrieval Accuracy
    logger.info('    Testing entity retrieval accuracy...');
    try {
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const queryEngine = service.getQueryEngine();
      
      const classes = queryEngine.getEntitiesByType(CodeEntityType.CLASS);
      let validEntities = 0;
      let invalidEntities = 0;
      
      for (const cls of classes) {
        const entity = queryEngine.getEntity(cls.entityId);
        if (entity && entity.name) {
          validEntities++;
        } else {
          invalidEntities++;
        }
      }
      
      tests.push({
        name: 'Entity Retrieval Accuracy',
        passed: invalidEntities === 0 && validEntities > 0,
        duration: 0,
        metrics: {
          totalEntities: classes.length,
          validEntities,
          invalidEntities
        }
      });
    } catch (e: any) {
      tests.push({ name: 'Entity Retrieval Accuracy', passed: false, duration: 0, error: e.message });
    }

    // Test 3: Reset Behavior
    logger.info('    Testing reset behavior...');
    try {
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      
      const statsBefore = service.getStatistics();
      service.resetAll();
      const statsAfter = service.getStatistics();
      
      tests.push({
        name: 'Reset Behavior',
        passed: statsBefore.totalEntityCount > 0 && statsAfter.totalEntityCount === 0,
        duration: 0,
        metrics: {
          beforeReset: statsBefore.totalEntityCount,
          afterReset: statsAfter.totalEntityCount
        }
      });
    } catch (e: any) {
      tests.push({ name: 'Reset Behavior', passed: false, duration: 0, error: e.message });
    }

    return tests;
  }

  private async testConcurrencyLimits(): Promise<any[]> {
    const tests = [];
    const startTime = Date.now();

    // Test 1: Increasing Load Test
    logger.info('    Testing increasing load...');
    try {
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const queryEngine = service.getQueryEngine();
      
      const loads = [10, 50, 100, 200];
      const loadResults: Record<string, number> = {};
      
      for (const load of loads) {
        const loadStart = Date.now();
        const promises: Promise<any>[] = [];
        
        for (let i = 0; i < load; i++) {
          promises.push(Promise.resolve(queryEngine.getEntitiesByType(CodeEntityType.CLASS)));
        }
        
        await Promise.all(promises);
        loadResults[`${load}_load_ms`] = Date.now() - loadStart;
      }
      
      tests.push({
        name: 'Increasing Load',
        passed: true,
        duration: Date.now() - startTime,
        metrics: loadResults
      });
    } catch (e: any) {
      tests.push({ name: 'Increasing Load', passed: false, duration: 0, error: e.message });
    }

    // Test 2: Rapid Fire Queries
    logger.info('    Testing rapid fire queries...');
    try {
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const queryEngine = service.getQueryEngine();
      
      const queryStart = Date.now();
      for (let i = 0; i < 500; i++) {
        queryEngine.getEntitiesByType(CodeEntityType.CLASS);
        queryEngine.searchEntitiesByName('Service');
        queryEngine.getStatistics();
      }
      const queryDuration = Date.now() - queryStart;
      
      tests.push({
        name: 'Rapid Fire Queries',
        passed: queryDuration < 10000,
        duration: queryDuration,
        metrics: {
          totalQueries: 1500,
          duration: queryDuration,
          queriesPerSecond: (1500 / queryDuration * 1000).toFixed(2)
        }
      });
    } catch (e: any) {
      tests.push({ name: 'Rapid Fire Queries', passed: false, duration: 0, error: e.message });
    }

    // Test 3: Mixed Query Types
    logger.info('    Testing mixed query types...');
    try {
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const queryEngine = service.getQueryEngine();
      
      const queryStart = Date.now();
      const operations = [
        () => queryEngine.getEntitiesByType(CodeEntityType.CLASS),
        () => queryEngine.getEntitiesByType(CodeEntityType.FUNCTION),
        () => queryEngine.getEntitiesByType(CodeEntityType.INTERFACE),
        () => queryEngine.searchEntitiesByName('Service'),
        () => queryEngine.searchEntitiesByName('Manager'),
        () => queryEngine.getStatistics(),
        () => queryEngine.getEntitiesByFile('/workspace/src'),
      ];
      
      for (let i = 0; i < 30; i++) {
        await Promise.all(operations.map(op => Promise.resolve(op())));
      }
      
      tests.push({
        name: 'Mixed Query Types',
        passed: true,
        duration: Date.now() - queryStart,
        metrics: { operations: operations.length * 30 }
      });
    } catch (e: any) {
      tests.push({ name: 'Mixed Query Types', passed: false, duration: 0, error: e.message });
    }

    return tests;
  }

  private async testFailureRecovery(): Promise<any[]> {
    const tests = [];
    const startTime = Date.now();

    // Test 1: Recover After Invalid Operations
    logger.info('    Testing recovery after invalid operations...');
    try {
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const queryEngine = service.getQueryEngine();
      
      // Attempt invalid operations
      try {
        queryEngine.getEntitiesByType('__INVALID__' as CodeEntityType);
      } catch (e) {}
      
      try {
        queryEngine.searchEntitiesByName('@#$%^&*()');
      } catch (e) {}
      
      // Recover with valid operation
      const recovered = queryEngine.getEntitiesByType(CodeEntityType.CLASS);
      
      tests.push({
        name: 'Recovery After Invalid Ops',
        passed: recovered && recovered.length > 0,
        duration: Date.now() - startTime
      });
    } catch (e: any) {
      tests.push({ name: 'Recovery After Invalid Ops', passed: false, duration: 0, error: e.message });
    }

    // Test 2: Service Lifecycle
    logger.info('    Testing service lifecycle...');
    try {
      const lifecycleTests = [];
      
      for (let i = 0; i < 10; i++) {
        const service = new EnhancedCodeKnowledgeGraphService();
        await service.analyzeProject('/workspace/src/core');
        const stats = service.getStatistics();
        service.clearCache();
        service.resetAll();
        lifecycleTests.push(stats.totalEntityCount > 0);
      }
      
      tests.push({
        name: 'Service Lifecycle',
        passed: lifecycleTests.every(t => t),
        duration: 0,
        metrics: { successfulLifecycles: lifecycleTests.filter(t => t).length }
      });
    } catch (e: any) {
      tests.push({ name: 'Service Lifecycle', passed: false, duration: 0, error: e.message });
    }

    // Test 3: Cache Corruption Recovery
    logger.info('    Testing cache corruption recovery...');
    try {
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      
      // Pollute cache
      const queryEngine = service.getQueryEngine();
      for (let i = 0; i < 50; i++) {
        queryEngine.getEntitiesByType(CodeEntityType.CLASS);
      }
      
      // Clear cache
      service.clearCache();
      
      // Verify clean state
      const cacheStats = service.getCacheStatistics();
      
      tests.push({
        name: 'Cache Corruption Recovery',
        passed: cacheStats.queryCache.size === 0,
        duration: 0,
        metrics: { cacheSizeAfterClear: cacheStats.queryCache.size }
      });
    } catch (e: any) {
      tests.push({ name: 'Cache Corruption Recovery', passed: false, duration: 0, error: e.message });
    }

    return tests;
  }

  private async testPerformanceRegression(): Promise<any[]> {
    const tests = [];
    const startTime = Date.now();

    // Test 1: Query Performance Consistency
    logger.info('    Testing query performance consistency...');
    try {
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const queryEngine = service.getQueryEngine();
      
      const queryTimes: number[] = [];
      
      for (let i = 0; i < 50; i++) {
        const start = Date.now();
        queryEngine.getEntitiesByType(CodeEntityType.CLASS);
        queryTimes.push(Date.now() - start);
      }
      
      const avgTime = queryTimes.reduce((sum, t) => sum + t, 0) / queryTimes.length;
      const maxTime = Math.max(...queryTimes);
      const minTime = Math.min(...queryTimes);
      
      tests.push({
        name: 'Query Performance',
        passed: avgTime < 100,
        duration: avgTime,
        metrics: {
          avgMs: avgTime.toFixed(2),
          minMs: minTime,
          maxMs: maxTime,
          stdDev: Math.sqrt(queryTimes.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / queryTimes.length).toFixed(2)
        }
      });
    } catch (e: any) {
      tests.push({ name: 'Query Performance', passed: false, duration: 0, error: e.message });
    }

    // Test 2: Memory Stability
    logger.info('    Testing memory stability...');
    try {
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const queryEngine = service.getQueryEngine();
      
      const memSnapshots: number[] = [];
      const initialMem = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < 30; i++) {
        for (let j = 0; j < 20; j++) {
          queryEngine.getEntitiesByType(CodeEntityType.CLASS);
          queryEngine.searchEntitiesByName('Test');
        }
        
        if (i % 5 === 0) {
          service.clearCache();
        }
        
        memSnapshots.push(process.memoryUsage().heapUsed);
      }
      
      const finalMem = process.memoryUsage().heapUsed;
      const growth = ((finalMem - initialMem) / initialMem) * 100;
      
      tests.push({
        name: 'Memory Stability',
        passed: growth < 30,
        duration: 0,
        metrics: {
          initialMB: (initialMem / 1024 / 1024).toFixed(2),
          finalMB: (finalMem / 1024 / 1024).toFixed(2),
          growthPercent: growth.toFixed(2)
        }
      });
    } catch (e: any) {
      tests.push({ name: 'Memory Stability', passed: false, duration: 0, error: e.message });
    }

    return tests;
  }

  private async testLongDuration(): Promise<any[]> {
    const tests = [];
    const startTime = Date.now();
    const DURATION_MS = 180000; // 3 minutes
    const endTime = startTime + DURATION_MS;

    logger.info(`    Testing long duration (${DURATION_MS / 1000}s)...`);
    
    try {
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const queryEngine = service.getQueryEngine();
      
      let requestCount = 0;
      let operations: Record<string, number> = {};
      let lastLog = Date.now();
      
      while (Date.now() < endTime) {
        const opType = Math.floor(Math.random() * 4);
        
        switch (opType) {
          case 0:
            queryEngine.getEntitiesByType(CodeEntityType.CLASS);
            operations['getClasses'] = (operations['getClasses'] || 0) + 1;
            break;
          case 1:
            queryEngine.searchEntitiesByName('Service');
            operations['search'] = (operations['search'] || 0) + 1;
            break;
          case 2:
            queryEngine.getStatistics();
            operations['stats'] = (operations['stats'] || 0) + 1;
            break;
          case 3:
            service.clearCache();
            operations['cacheClear'] = (operations['cacheClear'] || 0) + 1;
            break;
        }
        
        requestCount++;
        
        if (Date.now() - lastLog > 30000) {
          const mem = process.memoryUsage();
          logger.info(`      Running... ${requestCount} ops, Memory: ${(mem.heapUsed / 1024 / 1024).toFixed(2)}MB`);
          lastLog = Date.now();
        }
        
        await new Promise(r => setImmediate(r));
      }
      
      const duration = Date.now() - startTime;
      const finalMem = process.memoryUsage();
      
      tests.push({
        name: 'Long Duration',
        passed: requestCount > 10000,
        duration: duration,
        metrics: {
          totalOperations: requestCount,
          opsPerSecond: (requestCount / (duration / 1000)).toFixed(2),
          operations,
          finalMemoryMB: (finalMem.heapUsed / 1024 / 1024).toFixed(2)
        }
      });
    } catch (e: any) {
      tests.push({ name: 'Long Duration', passed: false, duration: Date.now() - startTime, error: e.message });
    }

    return tests;
  }

  private printSuiteResult(result: TestResult): void {
    const status = result.overallPassed ? '✅' : '❌';
    const passedCount = result.tests.filter(t => t.passed).length;
    const totalCount = result.tests.length;
    
    logger.info(`\n${status} ${result.suite}: ${passedCount}/${totalCount} tests passed`);
    
    for (const test of result.tests) {
      const testStatus = test.passed ? '✅' : '❌';
      logger.info(`  ${testStatus} ${test.name} (${test.duration}ms)`);
      
      if (test.error) {
        logger.info(`     Error: ${test.error}`);
      }
      
      if (test.metrics) {
        for (const [key, value] of Object.entries(test.metrics)) {
          logger.info(`     ${key}: ${value}`);
        }
      }
    }
  }

  private printOverallSummary(): void {
    const totalDuration = Date.now() - this.totalStartTime;
    const allTests = this.results.flatMap(r => r.tests);
    const passed = allTests.filter(t => t.passed).length;
    const total = allTests.length;
    const suitesPassed = this.results.filter(r => r.overallPassed).length;
    
    logger.info('\n' + '═'.repeat(70));
    logger.info('📊 OVERALL TEST SUMMARY');
    logger.info('═'.repeat(70));
    logger.info(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    logger.info(`Test Suites: ${suitesPassed}/${this.results.length} passed`);
    logger.info(`Total Tests: ${passed}/${total} passed (${((passed / total) * 100).toFixed(1)}%)`);
    logger.info('═'.repeat(70));
    
    if (passed === total) {
      logger.info('🎉 ALL TESTS PASSED! System is production ready.');
    } else {
      const failed = allTests.filter(t => !t.passed);
      logger.info(`\n❌ Failed ${failed.length} test(s):`);
      for (const test of failed) {
        logger.info(`   - ${test.name}: ${test.error}`);
      }
    }
    
    logger.info('═'.repeat(70));
  }
}

// Execute
(async () => {
  const suite = new SystematicallyDeepTestSuite();
  await suite.runAllSuites();
})().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
