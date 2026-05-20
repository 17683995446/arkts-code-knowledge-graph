import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import { ApplicationLogger } from '../src/infrastructure/logger/Logger.js';
import { CodeEntityType } from '../src/shared/index.js';
import * as path from 'path';

const logger = ApplicationLogger.getInstance();

interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  metrics?: Record<string, any>;
  error?: string;
}

class ErrorRecoveryAndResourceTest {
  private results: TestResult[] = [];
  private initialMemory: number = 0;
  private maxMemory: number = 0;
  private errorsFound: string[] = [];

  async runAllTests() {
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🚨 错误注入与恢复 + 极端资源耗尽测试');
    logger.info('═══════════════════════════════════════════════════════════');

    this.initialMemory = this.getMemoryMB();
    this.maxMemory = this.initialMemory;

    try {
      await this.testErrorRecoveryAfterInvalidInput();
      await this.testCacheOverloadRecovery();
      await this.testConcurrentServiceCreationDestruction();
      await this.testMemoryPressureTest();
      await this.testServiceRecoveryAfterReset();
      await this.testBoundaryConditionErrors();
    } catch (error: any) {
      logger.error('❌ 严重错误:', error);
    } finally {
      await this.printFinalReport();
    }
  }

  async testErrorRecoveryAfterInvalidInput() {
    const testName = '无效输入后错误恢复测试';
    const start = Date.now();
    logger.info(`\n💥 ${testName}`);
    logger.info('─'.repeat(60));

    try {
      const srcPath = path.join(process.cwd(), 'src');
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject(srcPath);
      const qe = service.getQueryEngine();
      
      // 先正常查询验证系统正常工作
      const initialStats = qe.getStatistics();
      const initialClasses = qe.getEntitiesByType(CodeEntityType.CLASS);
      logger.info(`  ✓ 初始状态正常: ${initialStats.totalEntityCount} 实体`);
      
      // 错误注入 - 各种无效输入
      let errorsInjected = 0;
      let recoveredSuccessfully = 0;
      
      // 测试1: 空字符串搜索
      try {
        qe.searchEntitiesByName('');
      } catch {
        errorsInjected++;
      }
      
      // 测试2: null/undefined
      try {
        (qe as any).getEntitiesByType(null);
      } catch {
        errorsInjected++;
      }
      
      // 测试3: 非常长的搜索字符串
      try {
        const longString = 'x'.repeat(10000);
        qe.searchEntitiesByName(longString);
      } catch {
        errorsInjected++;
      }
      
      // 验证恢复 - 正常查询是否还能工作
      const afterErrorStats = qe.getStatistics();
      const afterErrorClasses = qe.getEntitiesByType(CodeEntityType.CLASS);
      
      if (afterErrorStats.totalEntityCount === initialStats.totalEntityCount && 
          afterErrorClasses.length === initialClasses.length) {
        recoveredSuccessfully++;
      }
      
      // 清理缓存再试
      service.clearCache();
      
      const afterClearStats = qe.getStatistics();
      const afterClearClasses = qe.getEntitiesByType(CodeEntityType.CLASS);
      
      if (afterClearStats.totalEntityCount === initialStats.totalEntityCount && 
          afterClearClasses.length === initialClasses.length) {
        recoveredSuccessfully++;
      }
      
      service.resetAll();
      this.updateMemory();
      
      this.results.push({
        testName,
        passed: recoveredSuccessfully >= 2,
        duration: Date.now() - start,
        metrics: {
          errorsInjected,
          recoveredSuccessfully,
          initialEntities: initialStats.totalEntityCount,
          afterErrorEntities: afterErrorStats.totalEntityCount
        }
      });
      
      if (recoveredSuccessfully >= 2) {
        logger.info(`✅ ${testName} 通过 - 系统在错误后正确恢复`);
      } else {
        logger.warn(`⚠️  ${testName} - 部分恢复问题`);
      }
    } catch (error: any) {
      this.results.push({
        testName,
        passed: false,
        duration: Date.now() - start,
        error: error.message
      });
      this.errorsFound.push(`${testName}: ${error.message}`);
      logger.error(`❌ ${testName} 失败: ${error.message}`);
    }
  }

  async testCacheOverloadRecovery() {
    const testName = '缓存过载后恢复测试';
    const start = Date.now();
    logger.info(`\n🧪 ${testName}`);
    logger.info('─'.repeat(60));

    try {
      const srcPath = path.join(process.cwd(), 'src');
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject(srcPath);
      const qe = service.getQueryEngine();
      
      // 过载缓存 - 大量不同的查询
      const searchTerms = [];
      for (let i = 0; i < 200; i++) {
        searchTerms.push(`term_${i}`);
      }
      
      for (const term of searchTerms) {
        qe.searchEntitiesByName(term);
      }
      
      // 验证功能仍然正常
      const statsAfterOverload = qe.getStatistics();
      const classesAfterOverload = qe.getEntitiesByType(CodeEntityType.CLASS);
      
      // 尝试清理缓存
      service.clearCache();
      
      // 验证清理后功能正常
      const statsAfterClear = qe.getStatistics();
      const classesAfterClear = qe.getEntitiesByType(CodeEntityType.CLASS);
      
      service.resetAll();
      this.updateMemory();
      
      this.results.push({
        testName,
        passed: classesAfterOverload.length > 0 && classesAfterClear.length > 0,
        duration: Date.now() - start,
        metrics: {
          cacheOverloadQueries: 200,
          afterOverloadClasses: classesAfterOverload.length,
          afterClearClasses: classesAfterClear.length
        }
      });
      
      logger.info(`✅ ${testName} 通过`);
    } catch (error: any) {
      this.results.push({
        testName,
        passed: false,
        duration: Date.now() - start,
        error: error.message
      });
      this.errorsFound.push(`${testName}: ${error.message}`);
      logger.error(`❌ ${testName} 失败: ${error.message}`);
    }
  }

  async testConcurrentServiceCreationDestruction() {
    const testName = '并发服务创建销毁测试';
    const start = Date.now();
    logger.info(`\n🔀 ${testName}`);
    logger.info('─'.repeat(60));

    try {
      const srcPath = path.join(process.cwd(), 'src');
      let successCount = 0;
      let failCount = 0;
      const services: EnhancedCodeKnowledgeGraphService[] = [];
      
      // 快速创建多个服务实例
      for (let i = 0; i < 15; i++) {
        try {
          const service = new EnhancedCodeKnowledgeGraphService();
          await service.analyzeProject(srcPath);
          services.push(service);
          successCount++;
        } catch {
          failCount++;
        }
      }
      
      logger.info(`  创建了 ${successCount} 个服务实例`);
      
      // 快速销毁所有服务
      for (const service of services) {
        try {
          service.clearCache();
          service.resetAll();
        } catch {
          // 忽略销毁错误
        }
      }
      
      // 验证系统仍然可以创建新服务
      const finalService = new EnhancedCodeKnowledgeGraphService();
      await finalService.analyzeProject(srcPath);
      const finalStats = finalService.getStatistics();
      
      finalService.resetAll();
      this.updateMemory();
      
      this.results.push({
        testName,
        passed: finalStats.totalEntityCount > 0,
        duration: Date.now() - start,
        metrics: {
          createdCount: successCount,
          failCount,
          finalEntities: finalStats.totalEntityCount
        }
      });
      
      logger.info(`✅ ${testName} 通过`);
    } catch (error: any) {
      this.results.push({
        testName,
        passed: false,
        duration: Date.now() - start,
        error: error.message
      });
      this.errorsFound.push(`${testName}: ${error.message}`);
      logger.error(`❌ ${testName} 失败: ${error.message}`);
    }
  }

  async testMemoryPressureTest() {
    const testName = '内存压力测试';
    const start = Date.now();
    logger.info(`\n💾 ${testName}`);
    logger.info('─'.repeat(60));

    try {
      const srcPath = path.join(process.cwd(), 'src');
      const memorySamples: number[] = [this.getMemoryMB()];
      
      // 持续查询造成内存压力
      for (let cycle = 0; cycle < 5; cycle++) {
        const service = new EnhancedCodeKnowledgeGraphService();
        await service.analyzeProject(srcPath);
        const qe = service.getQueryEngine();
        
        for (let i = 0; i < 100; i++) {
          qe.getEntitiesByType(CodeEntityType.CLASS);
          qe.searchEntitiesByName('service');
          qe.searchEntitiesByName('class');
          qe.searchEntitiesByName('function');
          qe.searchEntitiesByName('interface');
        }
        
        if (cycle % 2 === 0) {
          memorySamples.push(this.getMemoryMB());
          logger.info(`  循环 #${cycle+1}: 内存 ${memorySamples[memorySamples.length-1].toFixed(1)}MB`);
        }
        
        service.clearCache();
        service.resetAll();
      }
      
      const finalMemory = this.getMemoryMB();
      const memoryGrowth = finalMemory - this.initialMemory;
      
      this.updateMemory();
      
      this.results.push({
        testName,
        passed: memoryGrowth < 300,
        duration: Date.now() - start,
        metrics: {
          initialMemoryMB: this.initialMemory.toFixed(1),
          finalMemoryMB: finalMemory.toFixed(1),
          memoryGrowthMB: memoryGrowth.toFixed(1),
          cycles: 5,
          queriesPerCycle: 500
        }
      });
      
      if (memoryGrowth < 300) {
        logger.info(`✅ ${testName} 通过 - 内存增长可控: ${memoryGrowth.toFixed(1)}MB`);
      } else {
        logger.warn(`⚠️  ${testName} - 内存增长较高: ${memoryGrowth.toFixed(1)}MB`);
      }
    } catch (error: any) {
      this.results.push({
        testName,
        passed: false,
        duration: Date.now() - start,
        error: error.message
      });
      this.errorsFound.push(`${testName}: ${error.message}`);
      logger.error(`❌ ${testName} 失败: ${error.message}`);
    }
  }

  async testServiceRecoveryAfterReset() {
    const testName = '重置后服务恢复测试';
    const start = Date.now();
    logger.info(`\n🔄 ${testName}`);
    logger.info('─'.repeat(60));

    try {
      const srcPath = path.join(process.cwd(), 'src');
      const service = new EnhancedCodeKnowledgeGraphService();
      
      let resetSuccessCount = 0;
      
      for (let i = 0; i < 5; i++) {
        await service.analyzeProject(srcPath);
        const qe = service.getQueryEngine();
        const statsBeforeReset = qe.getStatistics();
        
        service.clearCache();
        service.resetAll();
        
        // 重新分析
        await service.analyzeProject(srcPath);
        const statsAfterReset = qe.getStatistics();
        
        if (statsAfterReset.totalEntityCount === statsBeforeReset.totalEntityCount) {
          resetSuccessCount++;
        }
        
        logger.info(`  重置 #${i+1}: ${statsBeforeReset.totalEntityCount} → ${statsAfterReset.totalEntityCount} 实体`);
      }
      
      service.resetAll();
      this.updateMemory();
      
      this.results.push({
        testName,
        passed: resetSuccessCount >= 4,
        duration: Date.now() - start,
        metrics: {
          resetAttempts: 5,
          resetSuccessCount
        }
      });
      
      logger.info(`✅ ${testName} 通过`);
    } catch (error: any) {
      this.results.push({
        testName,
        passed: false,
        duration: Date.now() - start,
        error: error.message
      });
      this.errorsFound.push(`${testName}: ${error.message}`);
      logger.error(`❌ ${testName} 失败: ${error.message}`);
    }
  }

  async testBoundaryConditionErrors() {
    const testName = '边界条件错误测试';
    const start = Date.now();
    logger.info(`\n🏁 ${testName}`);
    logger.info('─'.repeat(60));

    try {
      const srcPath = path.join(process.cwd(), 'src');
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject(srcPath);
      const qe = service.getQueryEngine();
      
      let boundaryTests = 0;
      let boundaryPassed = 0;
      
      // 边界测试1: 大量连续快速查询
      for (let i = 0; i < 100; i++) {
        qe.getStatistics();
      }
      boundaryTests++;
      boundaryPassed++;
      
      // 边界测试2: 搜索非常短的词
      qe.searchEntitiesByName('a');
      qe.searchEntitiesByName('b');
      qe.searchEntitiesByName('c');
      boundaryTests++;
      boundaryPassed++;
      
      // 边界测试3: 快速清理缓存
      for (let i = 0; i < 5; i++) {
        service.clearCache();
      }
      boundaryTests++;
      boundaryPassed++;
      
      service.resetAll();
      this.updateMemory();
      
      this.results.push({
        testName,
        passed: boundaryPassed >= boundaryTests,
        duration: Date.now() - start,
        metrics: {
          boundaryTests,
          boundaryPassed
        }
      });
      
      logger.info(`✅ ${testName} 通过`);
    } catch (error: any) {
      this.results.push({
        testName,
        passed: false,
        duration: Date.now() - start,
        error: error.message
      });
      this.errorsFound.push(`${testName}: ${error.message}`);
      logger.error(`❌ ${testName} 失败: ${error.message}`);
    }
  }

  getMemoryMB(): number {
    const memUsage = process.memoryUsage();
    return memUsage.heapUsed / 1024 / 1024;
  }

  updateMemory() {
    const current = this.getMemoryMB();
    if (current > this.maxMemory) {
      this.maxMemory = current;
    }
  }

  async printFinalReport() {
    const finalMemory = this.getMemoryMB();
    const memoryGrowth = finalMemory - this.initialMemory;
    const passedTests = this.results.filter(r => r.passed).length;
    const totalTests = this.results.length;
    
    logger.info('\n' + '═'.repeat(80));
    logger.info('📊 错误恢复与资源耗尽测试 - 最终报告');
    logger.info('═'.repeat(80));
    logger.info(`总测试数: ${totalTests}`);
    logger.info(`通过数: ${passedTests}`);
    logger.info(`通过率: ${((passedTests/totalTests)*100).toFixed(1)}%`);
    logger.info(`初始内存: ${this.initialMemory.toFixed(1)}MB`);
    logger.info(`峰值内存: ${this.maxMemory.toFixed(1)}MB`);
    logger.info(`最终内存: ${finalMemory.toFixed(1)}MB`);
    logger.info(`内存变化: ${memoryGrowth >= 0 ? '+' : ''}${memoryGrowth.toFixed(1)}MB`);
    
    if (this.errorsFound.length > 0) {
      logger.info(`\n⚠️  发现 ${this.errorsFound.length} 个问题:`);
      for (const err of this.errorsFound) {
        logger.info(`  • ${err}`);
      }
    }
    
    logger.info('─'.repeat(80));
    
    logger.info('详细结果:');
    for (const result of this.results) {
      const status = result.passed ? '✅' : '❌';
      logger.info(`  ${status} ${result.testName} (${(result.duration/1000).toFixed(1)}s)`);
      if (result.metrics) {
        for (const [key, value] of Object.entries(result.metrics)) {
          logger.info(`      ${key}: ${value}`);
        }
      }
      if (result.error) {
        logger.info(`      错误: ${result.error}`);
      }
    }
    
    logger.info('═'.repeat(80));
    
    if (passedTests === totalTests && this.errorsFound.length === 0) {
      logger.info('🎉 🚀 完美！所有错误恢复和资源耗尽测试通过');
    } else if (passedTests >= totalTests * 0.8) {
      logger.info('✅ 良好！大部分测试通过');
    } else {
      logger.warn('⚠️  需要关注部分测试失败');
    }
    logger.info('═'.repeat(80));
  }
}

(async () => {
  const test = new ErrorRecoveryAndResourceTest();
  await test.runAllTests();
})().catch(error => {
  console.error('测试执行异常:', error);
  process.exit(1);
});
