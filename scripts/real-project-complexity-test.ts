import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import { ApplicationLogger } from '../src/infrastructure/logger/Logger.js';
import { CodeEntityType } from '../src/shared/index.js';
import { promises as fs } from 'fs';
import * as path from 'path';

const logger = ApplicationLogger.getInstance();

interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  metrics?: Record<string, any>;
  error?: string;
}

class RealProjectComplexityTest {
  private results: TestResult[] = [];
  private initialMemory: number = 0;
  private maxMemory: number = 0;
  private currentMemory: number = 0;

  async runAllTests() {
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🚀 真实大项目复杂测试 - 真实高难度场景');
    logger.info('═══════════════════════════════════════════════════════════');

    this.initialMemory = this.getMemoryMB();
    this.maxMemory = this.initialMemory;

    try {
      await this.testNestJsProjectAnalysis();
      await this.testVueCoreProjectAnalysis();
      await this.testMixedProjectAnalysis();
      await this.testIncrementalAnalysis();
      await this.testResourceManagement();
    } catch (error: any) {
      logger.error('❌ 严重错误:', error);
      this.results.push({
        testName: 'Overall Test',
        passed: false,
        duration: Date.now() - (this.results.length > 0 ? Date.now() : 0),
        error: error.message
      });
    } finally {
      await this.printFinalReport();
    }
  }

  async testNestJsProjectAnalysis() {
    const testName = 'Nest.js 大项目分析';
    const start = Date.now();
    logger.info(`\n🏗️ ${testName}`);
    logger.info('─'.repeat(60));

    try {
      const nestJsPath = path.join(process.cwd(), 'nest.js');
      const service = new EnhancedCodeKnowledgeGraphService();
      
      const analyzeStart = Date.now();
      await service.analyzeProject(nestJsPath);
      const analyzeTime = Date.now() - analyzeStart;
      
      const qe = service.getQueryEngine();
      const stats = qe.getStatistics();
      
      const classes = qe.getEntitiesByType(CodeEntityType.CLASS);
      const functions = qe.getEntitiesByType(CodeEntityType.FUNCTION);
      
      logger.info(`  ✅ 分析完成，耗时: ${(analyzeTime/1000).toFixed(1)}s`);
      logger.info(`  📊 总实体数: ${stats.totalEntityCount}`);
      logger.info(`  🏷️  类: ${classes.length}, 函数: ${functions.length}`);
      
      // 测试各种查询
      const queryTimes: number[] = [];
      for (let i = 0; i < 20; i++) {
        const qStart = Date.now();
        qe.searchEntitiesByName('Module');
        qe.searchEntitiesByName('Service');
        qe.searchEntitiesByName('Controller');
        queryTimes.push(Date.now() - qStart);
      }
      
      const avgQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
      logger.info(`  🔍 平均查询时间: ${avgQueryTime.toFixed(2)}ms`);
      
      // 缓存和清理
      service.clearCache();
      service.resetAll();
      
      this.updateMemory();
      
      this.results.push({
        testName,
        passed: true,
        duration: Date.now() - start,
        metrics: {
          analyzeTimeMs: analyzeTime,
          totalEntities: stats.totalEntityCount,
          classes: classes.length,
          functions: functions.length,
          avgQueryTimeMs: avgQueryTime
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
      logger.error(`❌ ${testName} 失败: ${error.message}`);
    }
  }

  async testVueCoreProjectAnalysis() {
    const testName = 'Vue.js Core 大项目分析';
    const start = Date.now();
    logger.info(`\n🎯 ${testName}`);
    logger.info('─'.repeat(60));

    try {
      const vueCorePath = path.join(process.cwd(), 'vue-core');
      const service = new EnhancedCodeKnowledgeGraphService();
      
      const analyzeStart = Date.now();
      await service.analyzeProject(vueCorePath);
      const analyzeTime = Date.now() - analyzeStart;
      
      const qe = service.getQueryEngine();
      const stats = qe.getStatistics();
      
      const classes = qe.getEntitiesByType(CodeEntityType.CLASS);
      const functions = qe.getEntitiesByType(CodeEntityType.FUNCTION);
      
      logger.info(`  ✅ 分析完成，耗时: ${(analyzeTime/1000).toFixed(1)}s`);
      logger.info(`  📊 总实体数: ${stats.totalEntityCount}`);
      logger.info(`  🏷️  类: ${classes.length}, 函数: ${functions.length}`);
      
      // 测试复杂查询
      const complexQueryTimes: number[] = [];
      const searchTerms = ['ref', 'reactive', 'computed', 'watch', 'effect', 'setup', 'onMounted', 'provide', 'inject'];
      
      for (let i = 0; i < 10; i++) {
        const qStart = Date.now();
        for (const term of searchTerms) {
          qe.searchEntitiesByName(term);
        }
        complexQueryTimes.push(Date.now() - qStart);
      }
      
      const avgComplexQueryTime = complexQueryTimes.reduce((a, b) => a + b, 0) / complexQueryTimes.length;
      logger.info(`  🔍 复合查询平均时间: ${avgComplexQueryTime.toFixed(2)}ms`);
      
      service.clearCache();
      service.resetAll();
      
      this.updateMemory();
      
      this.results.push({
        testName,
        passed: true,
        duration: Date.now() - start,
        metrics: {
          analyzeTimeMs: analyzeTime,
          totalEntities: stats.totalEntityCount,
          classes: classes.length,
          functions: functions.length,
          avgComplexQueryTimeMs: avgComplexQueryTime
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
      logger.error(`❌ ${testName} 失败: ${error.message}`);
    }
  }

  async testMixedProjectAnalysis() {
    const testName = '混合项目分析（src + examples）';
    const start = Date.now();
    logger.info(`\n🔀 ${testName}`);
    logger.info('─'.repeat(60));

    try {
      const srcPath = path.join(process.cwd(), 'src');
      const examplesPath = path.join(process.cwd(), 'examples');
      
      const service1 = new EnhancedCodeKnowledgeGraphService();
      const service2 = new EnhancedCodeKnowledgeGraphService();
      
      // 同时分析两个项目
      const [analyze1, analyze2] = await Promise.all([
        service1.analyzeProject(srcPath),
        service2.analyzeProject(examplesPath)
      ]);
      
      const qe1 = service1.getQueryEngine();
      const qe2 = service2.getQueryEngine();
      
      const stats1 = qe1.getStatistics();
      const stats2 = qe2.getStatistics();
      
      logger.info(`  ✅ 项目1分析: ${stats1.totalEntityCount} 实体`);
      logger.info(`  ✅ 项目2分析: ${stats2.totalEntityCount} 实体`);
      
      // 测试并行查询
      const parallelQueries: Promise<any>[] = [];
      for (let i = 0; i < 50; i++) {
        parallelQueries.push(
          qe1.getEntitiesByType(CodeEntityType.CLASS),
          qe2.getEntitiesByType(CodeEntityType.FUNCTION)
        );
      }
      
      await Promise.all(parallelQueries);
      
      service1.clearCache();
      service1.resetAll();
      service2.clearCache();
      service2.resetAll();
      
      this.updateMemory();
      
      this.results.push({
        testName,
        passed: true,
        duration: Date.now() - start,
        metrics: {
          project1Entities: stats1.totalEntityCount,
          project2Entities: stats2.totalEntityCount,
          parallelQueries: parallelQueries.length
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
      logger.error(`❌ ${testName} 失败: ${error.message}`);
    }
  }

  async testIncrementalAnalysis() {
    const testName = '增量分析和更新测试';
    const start = Date.now();
    logger.info(`\n🔄 ${testName}`);
    logger.info('─'.repeat(60));

    try {
      const srcPath = path.join(process.cwd(), 'src');
      const service = new EnhancedCodeKnowledgeGraphService();
      
      // 初始分析
      await service.analyzeProject(srcPath);
      const qe = service.getQueryEngine();
      const initialStats = qe.getStatistics();
      
      logger.info(`  初始实体数: ${initialStats.totalEntityCount}`);
      
      // 模拟多次重新分析（增量更新）
      for (let i = 0; i < 5; i++) {
        const reanalyzeStart = Date.now();
        await service.analyzeProject(srcPath);
        const reanalyzeTime = Date.now() - reanalyzeStart;
        
        const stats = qe.getStatistics();
        logger.info(`  重分析 #${i+1}: ${stats.totalEntityCount} 实体, ${(reanalyzeTime/1000).toFixed(1)}s`);
      }
      
      service.clearCache();
      service.resetAll();
      
      this.updateMemory();
      
      this.results.push({
        testName,
        passed: true,
        duration: Date.now() - start,
        metrics: {
          initialEntities: initialStats.totalEntityCount,
          reanalyzeCount: 5
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
      logger.error(`❌ ${testName} 失败: ${error.message}`);
    }
  }

  async testResourceManagement() {
    const testName = '资源管理和生命周期测试';
    const start = Date.now();
    logger.info(`\n🔧 ${testName}`);
    logger.info('─'.repeat(60));

    try {
      let memorySamples: number[] = [this.getMemoryMB()];
      
      // 循环创建和销毁服务
      for (let i = 0; i < 10; i++) {
        const service = new EnhancedCodeKnowledgeGraphService();
        await service.analyzeProject(path.join(process.cwd(), 'src'));
        const qe = service.getQueryEngine();
        qe.getStatistics();
        
        // 执行一些查询
        for (let j = 0; j < 50; j++) {
          qe.getEntitiesByType(CodeEntityType.CLASS);
        }
        
        // 清理
        service.clearCache();
        service.resetAll();
        
        // 记录内存
        if (i % 2 === 0) {
          memorySamples.push(this.getMemoryMB());
          logger.info(`  循环 #${i+1}: 内存 ${memorySamples[memorySamples.length-1].toFixed(1)}MB`);
        }
      }
      
      const finalMemory = this.getMemoryMB();
      const memoryGrowth = finalMemory - this.initialMemory;
      
      this.updateMemory();
      
      this.results.push({
        testName,
        passed: memoryGrowth < 200,
        duration: Date.now() - start,
        metrics: {
          initialMemoryMB: this.initialMemory.toFixed(1),
          finalMemoryMB: finalMemory.toFixed(1),
          memoryGrowthMB: memoryGrowth.toFixed(1),
          serviceCycles: 10
        }
      });
      
      if (memoryGrowth < 200) {
        logger.info(`✅ ${testName} 通过 - 内存增长控制良好: ${memoryGrowth.toFixed(1)}MB`);
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
    this.currentMemory = current;
  }

  async printFinalReport() {
    const finalMemory = this.getMemoryMB();
    const memoryGrowth = finalMemory - this.initialMemory;
    const passedTests = this.results.filter(r => r.passed).length;
    const totalTests = this.results.length;
    
    logger.info('\n' + '═'.repeat(80));
    logger.info('📊 真实大项目复杂测试 - 最终报告');
    logger.info('═'.repeat(80));
    logger.info(`总测试数: ${totalTests}`);
    logger.info(`通过数: ${passedTests}`);
    logger.info(`通过率: ${((passedTests/totalTests)*100).toFixed(1)}%`);
    logger.info(`初始内存: ${this.initialMemory.toFixed(1)}MB`);
    logger.info(`峰值内存: ${this.maxMemory.toFixed(1)}MB`);
    logger.info(`最终内存: ${finalMemory.toFixed(1)}MB`);
    logger.info(`内存变化: ${memoryGrowth >= 0 ? '+' : ''}${memoryGrowth.toFixed(1)}MB`);
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
    
    if (passedTests === totalTests) {
      logger.info('🎉 🚀 完美！所有真实大项目测试通过');
    } else {
      logger.warn('⚠️  部分测试失败，请检查');
    }
    logger.info('═'.repeat(80));
  }
}

(async () => {
  const test = new RealProjectComplexityTest();
  await test.runAllTests();
})().catch(error => {
  console.error('测试执行异常:', error);
  process.exit(1);
});
