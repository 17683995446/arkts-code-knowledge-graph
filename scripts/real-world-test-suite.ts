import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import { ApplicationLogger } from '../src/infrastructure/logger/Logger.js';
import { CodeEntityType } from '../src/shared/index.js';

const logger = ApplicationLogger.getInstance();

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  errors?: string[];
  metrics?: Record<string, any>;
}

class RealWorldTestSuite {
  private results: TestResult[] = [];
  private startTime: number = 0;

  async runAllTests(): Promise<void> {
    logger.info('🚀 Starting Real-World Long-Running Test Suite');
    this.startTime = Date.now();

    try {
      // Phase 1: Basic Functionality & Edge Cases
      logger.info('\n===== PHASE 1: Basic Functionality & Edge Cases =====');
      await this.testBasicFunctionality();
      await this.testEdgeCases();
      await this.testErrorHandling();

      // Phase 2: Concurrent & Stress Testing
      logger.info('\n===== PHASE 2: Concurrent & Stress Testing =====');
      await this.testConcurrentOperations();
      await this.testMemoryLeakDetection();
      await this.testCacheBehavior();

      // Phase 3: Extended Long-Running Test
      logger.info('\n===== PHASE 3: Extended Long-Running Test =====');
      await this.testExtendedOperation();

      // Phase 4: Integration & Complex Scenarios
      logger.info('\n===== PHASE 4: Integration & Complex Scenarios =====');
      await this.testComplexQueries();
      await this.testFullWorkflow();

    } catch (error: any) {
      logger.error(`Fatal error in test suite: ${error.message}`, error);
    }

    this.printSummary();
  }

  private async testBasicFunctionality(): Promise<void> {
    const testName = 'Basic Functionality';
    const start = Date.now();
    const errors: string[] = [];

    try {
      logger.info('Testing basic knowledge graph construction...');
      
      const service = new EnhancedCodeKnowledgeGraphService();
      
      // Test project analysis
      await service.analyzeProject('/workspace/src');
      
      const stats = service.getStatistics();
      if (!stats.totalEntityCount || stats.totalEntityCount < 100) {
        errors.push(`Low entity count: ${stats.totalEntityCount}`);
      }
      
      if (!stats.totalRelationCount || stats.totalRelationCount < 100) {
        errors.push(`Low relation count: ${stats.totalRelationCount}`);
      }

      // Test basic queries
      const queryEngine = service.getQueryEngine();
      
      const classes = queryEngine.getEntitiesByType(CodeEntityType.CLASS);
      if (!classes.length) {
        errors.push('No classes found');
      }
      
      const functions = queryEngine.getEntitiesByType(CodeEntityType.FUNCTION);
      if (!functions.length) {
        errors.push('No functions found');
      }

      this.results.push({
        testName,
        success: errors.length === 0,
        duration: Date.now() - start,
        errors: errors.length > 0 ? errors : undefined,
        metrics: {
          entities: stats.totalEntityCount,
          relations: stats.totalRelationCount,
          classes: classes.length,
          functions: functions.length
        }
      });

    } catch (error: any) {
      errors.push(error.message);
      this.results.push({
        testName,
        success: false,
        duration: Date.now() - start,
        errors
      });
    }

    logger.info(`${testName}: ${errors.length === 0 ? '✅ PASSED' : '❌ FAILED'}`);
  }

  private async testEdgeCases(): Promise<void> {
    const testName = 'Edge Cases';
    const start = Date.now();
    const errors: string[] = [];

    try {
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const queryEngine = service.getQueryEngine();

      // Test 1: Empty string searches
      logger.info('Testing empty string searches...');
      const emptySearch = queryEngine.searchEntitiesByName('');
      if (!Array.isArray(emptySearch)) {
        errors.push('Empty search should return array');
      }

      // Test 2: Very long search queries
      logger.info('Testing very long search queries...');
      const longQuery = 'a'.repeat(10000);
      const longSearch = queryEngine.searchEntitiesByName(longQuery);
      if (!Array.isArray(longSearch)) {
        errors.push('Long search should return array');
      }

      // Test 3: Special character searches
      logger.info('Testing special character searches...');
      const specialSearch = queryEngine.searchEntitiesByName('@#$%^&*()_+-=[]{}|;:,.<>?');
      if (!Array.isArray(specialSearch)) {
        errors.push('Special character search should return array');
      }

      // Test 4: Non-existent entity types
      logger.info('Testing non-existent entity types...');
      try {
        const invalidTypeResults = queryEngine.getEntitiesByType('INVALID_TYPE' as CodeEntityType);
        if (!Array.isArray(invalidTypeResults)) {
          errors.push('Invalid type query should return array');
        }
      } catch (e: any) {
        errors.push(`Invalid type query threw error: ${e.message}`);
      }

      this.results.push({
        testName,
        success: errors.length === 0,
        duration: Date.now() - start,
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (error: any) {
      errors.push(error.message);
      this.results.push({
        testName,
        success: false,
        duration: Date.now() - start,
        errors
      });
    }

    logger.info(`${testName}: ${errors.length === 0 ? '✅ PASSED' : '❌ FAILED'}`);
  }

  private async testErrorHandling(): Promise<void> {
    const testName = 'Error Handling';
    const start = Date.now();
    const errors: string[] = [];

    try {
      // Test 1: Invalid project path
      logger.info('Testing invalid project path...');
      const service1 = new EnhancedCodeKnowledgeGraphService();
      try {
        await service1.analyzeProject('/nonexistent/path/that/never/exists');
        // Should handle gracefully, not crash
      } catch (e: any) {
        logger.info(`Expected error handling: ${e.message}`);
      }

      // Test 2: Invalid file path query
      logger.info('Testing invalid file path query...');
      const service2 = new EnhancedCodeKnowledgeGraphService();
      await service2.analyzeProject('/workspace/src');
      const queryEngine = service2.getQueryEngine();
      
      const fileResults = queryEngine.getEntitiesByFile('/nonexistent/file.ts');
      if (!Array.isArray(fileResults)) {
        errors.push('File path query should return array');
      }

      this.results.push({
        testName,
        success: errors.length === 0,
        duration: Date.now() - start,
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (error: any) {
      errors.push(error.message);
      this.results.push({
        testName,
        success: false,
        duration: Date.now() - start,
        errors
      });
    }

    logger.info(`${testName}: ${errors.length === 0 ? '✅ PASSED' : '❌ FAILED'}`);
  }

  private async testConcurrentOperations(): Promise<void> {
    const testName = 'Concurrent Operations';
    const start = Date.now();
    const errors: string[] = [];

    try {
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const queryEngine = service.getQueryEngine();

      // Test concurrent queries
      logger.info('Testing concurrent queries (200 requests)...');
      const promises: Promise<any>[] = [];
      const queryTypes = [
        () => queryEngine.getEntitiesByType(CodeEntityType.CLASS),
        () => queryEngine.getEntitiesByType(CodeEntityType.FUNCTION),
        () => queryEngine.searchEntitiesByName('Service'),
        () => queryEngine.getStatistics(),
        () => queryEngine.getEntitiesByType(CodeEntityType.INTERFACE)
      ];

      for (let i = 0; i < 200; i++) {
        const queryFn = queryTypes[i % queryTypes.length];
        promises.push(queryFn());
      }

      await Promise.all(promises);

      this.results.push({
        testName,
        success: errors.length === 0,
        duration: Date.now() - start,
        errors: errors.length > 0 ? errors : undefined,
        metrics: {
          concurrentRequests: 200,
          totalDuration: Date.now() - start
        }
      });

    } catch (error: any) {
      errors.push(error.message);
      this.results.push({
        testName,
        success: false,
        duration: Date.now() - start,
        errors
      });
    }

    logger.info(`${testName}: ${errors.length === 0 ? '✅ PASSED' : '❌ FAILED'}`);
  }

  private async testMemoryLeakDetection(): Promise<void> {
    const testName = 'Memory Leak Detection';
    const start = Date.now();
    const errors: string[] = [];
    const memorySnapshots: number[] = [];

    try {
      logger.info('Testing memory usage over repeated operations...');
      
      const initialMem = process.memoryUsage().heapUsed;
      memorySnapshots.push(initialMem);

      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const queryEngine = service.getQueryEngine();

      // Run operations multiple times
      for (let iteration = 0; iteration < 50; iteration++) {
        // Perform various operations
        for (let i = 0; i < 100; i++) {
          queryEngine.getEntitiesByType(CodeEntityType.CLASS);
          queryEngine.searchEntitiesByName('Test');
        }

        // Clear cache periodically
        if (iteration % 10 === 0) {
          service.clearCache();
        }

        // Take memory snapshot
        const currentMem = process.memoryUsage().heapUsed;
        memorySnapshots.push(currentMem);

        if (iteration % 10 === 0) {
          logger.info(`Iteration ${iteration}: ${(currentMem / 1024 / 1024).toFixed(2)}MB`);
        }
      }

      const finalMem = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMem - initialMem;
      const growthPercent = (memoryGrowth / initialMem) * 100;

      // Check for memory leaks (growth > 50% considered suspicious)
      if (growthPercent > 50) {
        errors.push(`Possible memory leak: ${growthPercent.toFixed(2)}% growth`);
      }

      this.results.push({
        testName,
        success: errors.length === 0,
        duration: Date.now() - start,
        errors: errors.length > 0 ? errors : undefined,
        metrics: {
          initialMemoryMB: (initialMem / 1024 / 1024).toFixed(2),
          finalMemoryMB: (finalMem / 1024 / 1024).toFixed(2),
          growthMB: (memoryGrowth / 1024 / 1024).toFixed(2),
          growthPercent: growthPercent.toFixed(2),
          iterations: 50
        }
      });

    } catch (error: any) {
      errors.push(error.message);
      this.results.push({
        testName,
        success: false,
        duration: Date.now() - start,
        errors
      });
    }

    logger.info(`${testName}: ${errors.length === 0 ? '✅ PASSED' : '❌ FAILED'}`);
  }

  private async testCacheBehavior(): Promise<void> {
    const testName = 'Cache Behavior';
    const start = Date.now();
    const errors: string[] = [];

    try {
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const queryEngine = service.getQueryEngine();

      // Test initial cache state
      const initialCacheStats = service.getCacheStatistics();
      
      // Warm up cache
      logger.info('Warming up cache...');
      for (let i = 0; i < 50; i++) {
        queryEngine.getEntitiesByType(CodeEntityType.CLASS);
        queryEngine.searchEntitiesByName('Service');
      }

      const warmedCacheStats = service.getCacheStatistics();
      
      // Test cache clearing
      service.clearCache();
      const clearedCacheStats = service.getCacheStatistics();

      this.results.push({
        testName,
        success: errors.length === 0,
        duration: Date.now() - start,
        errors: errors.length > 0 ? errors : undefined,
        metrics: {
          initialCacheSize: initialCacheStats.queryCache.size,
          warmedCacheSize: warmedCacheStats.queryCache.size,
          clearedCacheSize: clearedCacheStats.queryCache.size
        }
      });

    } catch (error: any) {
      errors.push(error.message);
      this.results.push({
        testName,
        success: false,
        duration: Date.now() - start,
        errors
      });
    }

    logger.info(`${testName}: ${errors.length === 0 ? '✅ PASSED' : '❌ FAILED'}`);
  }

  private async testExtendedOperation(): Promise<void> {
    const testName = 'Extended Operation';
    const start = Date.now();
    const errors: string[] = [];
    const DURATION_MINUTES = 2; // 2 minutes for demo, adjust as needed
    const endTime = Date.now() + (DURATION_MINUTES * 60 * 1000);

    try {
      logger.info(`Running extended test for ${DURATION_MINUTES} minutes...`);
      
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const queryEngine = service.getQueryEngine();

      let requestCount = 0;
      let lastLog = Date.now();
      
      while (Date.now() < endTime) {
        // Simulate real-world traffic
        const random = Math.random();
        if (random < 0.3) {
          queryEngine.getEntitiesByType(CodeEntityType.CLASS);
        } else if (random < 0.5) {
          queryEngine.searchEntitiesByName('Service');
        } else if (random < 0.7) {
          queryEngine.getStatistics();
        } else if (random < 0.9) {
          queryEngine.getEntitiesByType(CodeEntityType.FUNCTION);
        } else {
          // Occasional cache clear
          service.clearCache();
        }

        requestCount++;

        // Log every 10 seconds
        if (Date.now() - lastLog > 10000) {
          const memUsage = process.memoryUsage();
          logger.info(`Running... Requests: ${requestCount}, Memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
          lastLog = Date.now();
        }

        // Small delay to simulate real network
        await new Promise(r => setTimeout(r, 1));
      }

      this.results.push({
        testName,
        success: errors.length === 0,
        duration: Date.now() - start,
        errors: errors.length > 0 ? errors : undefined,
        metrics: {
          totalRequests: requestCount,
          durationMinutes: DURATION_MINUTES,
          requestsPerSecond: (requestCount / ((Date.now() - start) / 1000)).toFixed(2)
        }
      });

    } catch (error: any) {
      errors.push(error.message);
      this.results.push({
        testName,
        success: false,
        duration: Date.now() - start,
        errors
      });
    }

    logger.info(`${testName}: ${errors.length === 0 ? '✅ PASSED' : '❌ FAILED'}`);
  }

  private async testComplexQueries(): Promise<void> {
    const testName = 'Complex Queries';
    const start = Date.now();
    const errors: string[] = [];

    try {
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      const queryEngine = service.getQueryEngine();

      // Get all classes
      const classes = queryEngine.getEntitiesByType(CodeEntityType.CLASS);

      // Get call chains for each class
      logger.info(`Testing call chain analysis for ${Math.min(classes.length, 20)} classes...`);
      
      for (const cls of classes.slice(0, 20)) {
        try {
          const callChain = queryEngine.getCallChain(cls.entityId, 3);
          if (!callChain || !Array.isArray(callChain.path)) {
            errors.push(`Invalid call chain for ${cls.entityId}`);
          }
        } catch (e: any) {
          errors.push(`Call chain error for ${cls.entityId}: ${e.message}`);
        }
      }

      this.results.push({
        testName,
        success: errors.length === 0,
        duration: Date.now() - start,
        errors: errors.length > 0 ? errors : undefined,
        metrics: {
          classesAnalyzed: Math.min(classes.length, 20),
          errorsFound: errors.length
        }
      });

    } catch (error: any) {
      errors.push(error.message);
      this.results.push({
        testName,
        success: false,
        duration: Date.now() - start,
        errors
      });
    }

    logger.info(`${testName}: ${errors.length === 0 ? '✅ PASSED' : '❌ FAILED'}`);
  }

  private async testFullWorkflow(): Promise<void> {
    const testName = 'Full Workflow';
    const start = Date.now();
    const errors: string[] = [];

    try {
      logger.info('Testing complete user workflow...');

      // Step 1: Create service and analyze project
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');

      // Step 2: Get statistics
      const stats = service.getStatistics();

      // Step 3: Search for entities
      const queryEngine = service.getQueryEngine();
      const searchResults = queryEngine.searchEntitiesByName('Service');

      // Step 4: Get entities by type
      const classes = queryEngine.getEntitiesByType(CodeEntityType.CLASS);

      // Step 5: Use semantic search
      const semanticSearch = service.getSemanticSearch();
      const semanticResults = await semanticSearch.searchEntities('code parsing', 5);

      // Step 6: Clear cache and repeat queries
      service.clearCache();

      const classes2 = queryEngine.getEntitiesByType(CodeEntityType.CLASS);
      const stats2 = service.getStatistics();

      // Verify consistency
      if (classes2.length !== classes.length) {
        errors.push('Inconsistent results after cache clear');
      }

      this.results.push({
        testName,
        success: errors.length === 0,
        duration: Date.now() - start,
        errors: errors.length > 0 ? errors : undefined,
        metrics: {
          entities: stats.totalEntityCount,
          searchResults: searchResults.length,
          semanticResults: semanticResults.length,
          consistencyCheck: errors.length === 0
        }
      });

    } catch (error: any) {
      errors.push(error.message);
      this.results.push({
        testName,
        success: false,
        duration: Date.now() - start,
        errors
      });
    }

    logger.info(`${testName}: ${errors.length === 0 ? '✅ PASSED' : '❌ FAILED'}`);
  }

  private printSummary(): void {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;
    const failed = total - passed;

    logger.info('\n' + '='.repeat(70));
    logger.info('📊 REAL-WORLD TEST SUITE SUMMARY');
    logger.info('='.repeat(70));
    logger.info(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    logger.info(`Total Tests: ${total}`);
    logger.info(`✅ Passed: ${passed}`);
    logger.info(`❌ Failed: ${failed}`);
    logger.info('='.repeat(70));

    // Print detailed results
    for (const result of this.results) {
      const status = result.success ? '✅' : '❌';
      logger.info(`${status} ${result.testName} (${result.duration}ms)`);
      
      if (result.errors && result.errors.length > 0) {
        for (const err of result.errors) {
          logger.info(`   Error: ${err}`);
        }
      }
      
      if (result.metrics) {
        for (const [key, value] of Object.entries(result.metrics)) {
          logger.info(`   ${key}: ${value}`);
        }
      }
    }

    logger.info('='.repeat(70));
    logger.info(`Overall Result: ${failed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  }
}

// Run the test suite
(async () => {
  const testSuite = new RealWorldTestSuite();
  await testSuite.runAllTests();
})().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
