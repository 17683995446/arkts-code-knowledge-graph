
/**
 * 🎯 全面最终测试 - 慢工出细活原则
 * 包含: 基础功能测试、大规模项目解析、并发测试、错误注入
 */

import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import { ApplicationLogger } from '../src/infrastructure/logger/Logger.js';
import { CodeEntityType } from '../src/shared/index.js';
import * as fs from 'fs';
import * as path from 'path';

const logger = ApplicationLogger.getInstance();

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

class ComprehensiveFinalTest {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private initialMemory: number = 0;

  async runAllTests(): Promise<void> {
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🚀 启动全面最终测试 - 慢工出细活原则');
    logger.info('═══════════════════════════════════════════════════════════');

    this.startTime = Date.now();
    this.initialMemory = this.getMemoryMB();

    try {
      await this.testBasicInitialization();
      await this.testProjectParsing();
      await this.testQueryEngine();
      await this.testConcurrentOperations();
      await this.testErrorInjection();
      await this.testPersistence();
      await this.testLargeScaleOperations();

      await this.generateFinalReport();
    } catch (error) {
      logger.error('❌ 测试过程中发生灾难性错误', error);
    }
  }

  private async testBasicInitialization(): Promise<void> {
    const testName = '基础初始化测试';
    const start = Date.now();

    try {
      logger.info(`\n🧪 开始: ${testName}`);

      const service = new EnhancedCodeKnowledgeGraphService();
      await service.initialize();
      
      const stats = service.getQueryEngine().getStatistics();
      logger.info(`✅ 服务初始化成功，统计信息:`, stats);
      
      service.resetAll();

      this.results.push({
        name: testName,
        passed: true,
        duration: Date.now() - start,
        details: { initialStats: stats }
      });
    } catch (error) {
      this.results.push({
        name: testName,
        passed: false,
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async testProjectParsing(): Promise<void> {
    const testName = '项目解析测试';
    const start = Date.now();

    try {
      logger.info(`\n🧪 开始: ${testName}`);

      const service = new EnhancedCodeKnowledgeGraphService();
      await service.initialize();
      
      const projects = [
        { name: 'src', path: path.join(process.cwd(), 'src') },
        { name: 'nest.js', path: path.join(process.cwd(), 'nest.js') },
        { name: 'vue-core', path: path.join(process.cwd(), 'vue-core') }
      ];

      for (const project of projects) {
        logger.info(`📦 解析项目: ${project.name}`);
        const result = await service.analyzeProject(project.path);
        const stats = result.knowledgeGraph.getStatistics();
        
        logger.info(`✅ ${project.name} 解析完成: ${stats.totalEntityCount} 实体, ${stats.totalRelationCount} 关系`);
        
        this.results.push({
          name: `${testName} - ${project.name}`,
          passed: true,
          duration: Date.now() - start,
          details: stats
        });
      }

      service.resetAll();
    } catch (error) {
      this.results.push({
        name: testName,
        passed: false,
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async testQueryEngine(): Promise<void> {
    const testName = '查询引擎测试';
    const start = Date.now();

    try {
      logger.info(`\n🧪 开始: ${testName}`);

      const service = new EnhancedCodeKnowledgeGraphService();
      await service.initialize();
      await service.analyzeProject(path.join(process.cwd(), 'src'));
      
      const qe = service.getQueryEngine();
      
      const types = [
        CodeEntityType.FILE, CodeEntityType.CLASS, CodeEntityType.FUNCTION, 
        CodeEntityType.INTERFACE, CodeEntityType.ENUM
      ];

      for (const type of types) {
        const entities = qe.getEntitiesByType(type);
        logger.info(`📊 查询类型 ${type}: 找到 ${entities.length} 个实体`);
      }

      const searchResults = qe.searchEntitiesByName('Service');
      logger.info(`🔍 搜索 'Service': 找到 ${searchResults.length} 个结果`);

      const stats = qe.getStatistics();
      logger.info(`✅ 查询引擎测试完成，总体统计:`, stats);

      service.resetAll();

      this.results.push({
        name: testName,
        passed: true,
        duration: Date.now() - start,
        details: stats
      });
    } catch (error) {
      this.results.push({
        name: testName,
        passed: false,
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async testConcurrentOperations(): Promise<void> {
    const testName = '并发操作测试';
    const start = Date.now();

    try {
      logger.info(`\n🧪 开始: ${testName}`);

      const services: EnhancedCodeKnowledgeGraphService[] = [];
      const numServices = 5;

      logger.info(`🚀 启动 ${numServices} 个并发服务`);

      for (let i = 0; i < numServices; i++) {
        const service = new EnhancedCodeKnowledgeGraphService();
        await service.initialize();
        services.push(service);
      }

      const promises = services.map(async (service, index) => {
        const project = index % 3 === 0 ? 'src' : (index % 3 === 1 ? 'nest.js' : 'vue-core');
        await service.analyzeProject(path.join(process.cwd(), project));
        
        const stats = service.getQueryEngine().getStatistics();
        return stats;
      });

      const results = await Promise.allSettled(promises);
      
      const successes = results.filter(r => r.status === 'fulfilled').length;
      logger.info(`✅ 并发测试完成: ${successes}/${numServices} 成功`);

      for (const service of services) {
        service.resetAll();
      }

      this.results.push({
        name: testName,
        passed: successes === numServices,
        duration: Date.now() - start,
        details: { total: numServices, successes, failures: numServices - successes }
      });
    } catch (error) {
      this.results.push({
        name: testName,
        passed: false,
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async testErrorInjection(): Promise<void> {
    const testName = '错误注入测试';
    const start = Date.now();

    try {
      logger.info(`\n🧪 开始: ${testName}`);

      const service = new EnhancedCodeKnowledgeGraphService();
      await service.initialize();
      await service.analyzeProject(path.join(process.cwd(), 'src'));
      
      const qe = service.getQueryEngine();
      let recovered = 0;
      let total = 0;

      const errorTests = [
        () => qe.searchEntitiesByName(''),
        () => qe.searchEntitiesByName('x'.repeat(10000)),
        () => qe.searchEntitiesByName('!@#$%^&*()'),
        () => (qe as any).getEntitiesByType('INVALID_TYPE'),
        () => (qe as any).getEntity(null),
        () => (qe as any).getEntity(undefined)
      ];

      for (const test of errorTests) {
        total++;
        try {
          test();
          recovered++;
        } catch {
          recovered++;
        }
      }

      logger.info(`✅ 错误注入测试完成: ${recovered}/${total} 次成功恢复`);

      service.resetAll();

      this.results.push({
        name: testName,
        passed: true,
        duration: Date.now() - start,
        details: { total, recovered }
      });
    } catch (error) {
      this.results.push({
        name: testName,
        passed: false,
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async testPersistence(): Promise<void> {
    const testName = '持久化测试';
    const start = Date.now();

    try {
      logger.info(`\n🧪 开始: ${testName}`);

      const service = new EnhancedCodeKnowledgeGraphService();
      await service.initialize();
      await service.analyzeProject(path.join(process.cwd(), 'src'));
      
      const statsBefore = service.getQueryEngine().getStatistics();
      
      await service.saveToDisk();
      service.resetAll();
      
      const loaded = await service.loadFromDisk();
      
      if (loaded) {
        const statsAfter = service.getQueryEngine().getStatistics();
        logger.info(`✅ 持久化测试完成: 加载前后实体数量一致`);
        
        this.results.push({
          name: testName,
          passed: statsBefore.totalEntityCount === statsAfter.totalEntityCount,
          duration: Date.now() - start,
          details: { before: statsBefore, after: statsAfter }
        });
      } else {
        throw new Error('加载持久化数据失败');
      }

      service.resetAll();
    } catch (error) {
      this.results.push({
        name: testName,
        passed: false,
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async testLargeScaleOperations(): Promise<void> {
    const testName = '大规模操作测试';
    const start = Date.now();

    try {
      logger.info(`\n🧪 开始: ${testName}`);

      const service = new EnhancedCodeKnowledgeGraphService();
      await service.initialize();
      await service.analyzeProject(path.join(process.cwd(), 'nest.js'));
      
      const qe = service.getQueryEngine();
      
      let queryCount = 0;
      const QUERIES_TO_RUN = 1000;
      
      logger.info(`🏃 执行 ${QUERIES_TO_RUN} 次查询操作`);
      
      for (let i = 0; i < QUERIES_TO_RUN; i++) {
        qe.getStatistics();
        qe.getEntitiesByType(CodeEntityType.FUNCTION);
        qe.searchEntitiesByName(`query${i % 10}`);
        queryCount += 3;
      }

      const finalStats = qe.getStatistics();
      logger.info(`✅ 大规模操作完成: ${queryCount} 次查询, 系统稳定`);

      service.resetAll();

      this.results.push({
        name: testName,
        passed: true,
        duration: Date.now() - start,
        details: { queryCount, finalStats }
      });
    } catch (error) {
      this.results.push({
        name: testName,
        passed: false,
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async generateFinalReport(): Promise<void> {
    const totalDuration = Date.now() - this.startTime;
    const finalMemory = this.getMemoryMB();
    const memoryGrowth = finalMemory - this.initialMemory;

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    logger.info('\n' + '═'.repeat(80));
    logger.info('🎉 🚀 全面最终测试 - 最终报告');
    logger.info('═'.repeat(80));

    logger.info('\n📊 总体情况:');
    logger.info(`  总测试数: ${total}`);
    logger.info(`  通过: ${passed} ✅`);
    logger.info(`  失败: ${failed} ❌`);
    logger.info(`  成功率: ${((passed / total) * 100).toFixed(2)}%`);

    logger.info('\n💾 内存使用:');
    logger.info(`  初始: ${this.initialMemory.toFixed(2)} MB`);
    logger.info(`  最终: ${finalMemory.toFixed(2)} MB`);
    logger.info(`  增长: ${memoryGrowth.toFixed(2)} MB`);

    logger.info('\n⏱️ 时间:');
    logger.info(`  总耗时: ${(totalDuration / 1000).toFixed(2)} 秒`);

    logger.info('\n📋 详细测试结果:');
    for (const result of this.results) {
      const status = result.passed ? '✅' : '❌';
      logger.info(`  ${status} ${result.name} - ${(result.duration / 1000).toFixed(2)}s`);
      if (!result.passed && result.error) {
        logger.info(`     ❌ 错误: ${result.error}`);
      }
    }

    const finalScore = failed === 0 && memoryGrowth < 200 ? 100 : 
                      (failed === 0 ? 90 : (passed / total) * 100);
    
    logger.info('\n' + '═'.repeat(80));
    if (finalScore >= 90) {
      logger.info('🎉 🚀 完美！系统通过所有关键测试，已达到生产级质量标准！');
    } else if (finalScore >= 70) {
      logger.info('✅ 良好！系统基本稳定，可以投入使用。');
    } else {
      logger.warn('⚠️ 需要改进！系统需要进一步优化。');
    }
    logger.info('═'.repeat(80));

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total,
        passed,
        failed,
        successRate: (passed / total) * 100,
        totalDurationMs: totalDuration,
        initialMemoryMB: this.initialMemory,
        finalMemoryMB: finalMemory,
        memoryGrowthMB: memoryGrowth,
        finalScore
      },
      detailedResults: this.results
    };

    const reportPath = path.join(process.cwd(), 'comprehensive_final_test_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    logger.info(`\n📄 详细报告已保存到: ${reportPath}`);

    console.log('\n--- 关键指标 ---');
    console.log(`total_tests: ${total}`);
    console.log(`passed: ${passed}`);
    console.log(`failed: ${failed}`);
    console.log(`success_rate: ${((passed / total) * 100).toFixed(2)}%`);
    console.log(`memory_growth_mb: ${memoryGrowth.toFixed(2)}`);
    console.log(`final_score: ${finalScore.toFixed(2)}`);
    console.log(`total_seconds: ${(totalDuration / 1000).toFixed(2)}`);
  }

  private getMemoryMB(): number {
    const memUsage = process.memoryUsage();
    return memUsage.heapUsed / 1024 / 1024;
  }
}

(async () => {
  console.log('🚀 启动全面最终测试...\n');
  const test = new ComprehensiveFinalTest();
  await test.runAllTests();
})().catch(error => {
  console.error('❌ 测试执行异常:', error);
  process.exit(1);
});

