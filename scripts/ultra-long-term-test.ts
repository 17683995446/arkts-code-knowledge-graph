import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import { ApplicationLogger } from '../src/infrastructure/logger/Logger.js';
import { CodeEntityType } from '../src/shared/index.js';

const logger = ApplicationLogger.getInstance();

interface TestResult {
  timestamp: string;
  memoryUsedMB: number;
  operationsCompleted: number;
  errorsEncountered: number;
  testPassed: boolean;
  message?: string;
}

class UltraLongTermTest {
  private allResults: TestResult[] = [];
  private totalOperations = 0;
  private totalErrors = 0;
  private startTime = Date.now();
  private lastMemoryCheck = Date.now();
  private initialMemoryMB = 0;
  private maxMemoryMB = 0;
  private memoryLeakChecks = 0;
  private memoryLeaksDetected = 0;

  async runUltraLongTermTest(): Promise<void> {
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🚀 开始超长时间真实负载测试 (10分钟快速验证)');
    logger.info('═══════════════════════════════════════════════════════════');

    try {
      // 阶段: 持续真实负载 (10分钟)
      await this.continuousRealLoadPhase();
      
      // 最终验证与清理
      await this.finalValidation();
      
    } catch (error: any) {
      logger.error('❌ 严重错误:', error);
    } finally {
      await this.printFinalReport();
    }
  }

  private async continuousRealLoadPhase(): Promise<void> {
    logger.info('\n🔥 持续真实负载测试 (10分钟)');
    logger.info('─'.repeat(60));

    const phaseDuration = 10 * 60 * 1000; 
    const endTime = Date.now() + phaseDuration;
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject('/workspace/src');
    const queryEngine = service.getQueryEngine();
    
    let phaseOperations = 0;
    let lastPhaseLog = Date.now();
    
    this.initialMemoryMB = this.getCurrentMemoryMB();
    this.maxMemoryMB = this.initialMemoryMB;
    
    logger.info(`初始内存: ${this.initialMemoryMB.toFixed(1)} MB`);
    
    while (Date.now() < endTime) {
      try {
        const random = Math.random();
        
        if (random < 0.2) {
          // 获取所有类
          queryEngine.getEntitiesByType(CodeEntityType.CLASS);
        } else if (random < 0.4) {
          // 搜索
          queryEngine.searchEntitiesByName('service');
        } else if (random < 0.6) {
          // 获取统计
          queryEngine.getStatistics();
        } else if (random < 0.8) {
          // 获取函数
          queryEngine.getEntitiesByType(CodeEntityType.FUNCTION);
        } else {
          // 缓存清理
          service.clearCache();
        }
        
        phaseOperations++;
        this.totalOperations++;
        
      } catch (error: any) {
        this.totalErrors++;
      }
      
      // 定期检查
      if (Date.now() - lastPhaseLog > 30000) { // 每30秒
        this.checkMemoryAndLog(phaseOperations, 'RealLoad');
        lastPhaseLog = Date.now();
      }
      
      // 避免 100% CPU
      await this.sleep(15);
    }
    
    logger.info(`✅ 持续负载完成: ${phaseOperations.toLocaleString()} 次操作`);
  }

  private async finalValidation(): Promise<void> {
    logger.info('\n✅ Phase 5 - 最终验证与检查');
    logger.info('─'.repeat(60));
    
    // 创建干净的服务
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject('/workspace/src');
    const queryEngine = service.getQueryEngine();
    
    // 验证数据完整性
    const stats = queryEngine.getStatistics();
    const classes = queryEngine.getEntitiesByType(CodeEntityType.CLASS);
    const functions = queryEngine.getEntitiesByType(CodeEntityType.FUNCTION);
    
    const validationPassed = stats.totalEntityCount > 0 && 
                            classes.length > 0 && 
                            functions.length > 0;
    
    if (validationPassed) {
      logger.info('✅ 最终验证通过');
      logger.info(`   总实体: ${stats.totalEntityCount}`);
      logger.info(`   类: ${classes.length}`);
      logger.info(`   函数: ${functions.length}`);
    } else {
      logger.error('❌ 最终验证失败');
    }
    
    // 记录最终内存
    const finalMemory = this.getCurrentMemoryMB();
    this.maxMemoryMB = Math.max(this.maxMemoryMB, finalMemory);
    
    // 保存最终结果
    this.allResults.push({
      timestamp: new Date().toISOString(),
      memoryUsedMB: finalMemory,
      operationsCompleted: this.totalOperations,
      errorsEncountered: this.totalErrors,
      testPassed: validationPassed,
      message: 'Final Validation'
    });
  }

  private checkMemoryAndLog(operations: number, phase: string): void {
    const currentMemory = this.getCurrentMemoryMB();
    this.maxMemoryMB = Math.max(this.maxMemoryMB, currentMemory);
    
    const elapsedSec = (Date.now() - this.startTime) / 1000;
    const memoryGrowth = currentMemory - this.initialMemoryMB;
    
    // 检查内存泄漏 (每5分钟)
    if (Date.now() - this.lastMemoryCheck > 5 * 60 * 1000) {
      this.memoryLeakChecks++;
      
      if (memoryGrowth > 50) { 
        this.memoryLeaksDetected++;
        logger.warn(`⚠️ 可能内存泄漏: 增长 ${memoryGrowth.toFixed(1)}MB`);
      }
      
      this.lastMemoryCheck = Date.now();
    }
    
    const result: TestResult = {
      timestamp: new Date().toISOString(),
      memoryUsedMB: currentMemory,
      operationsCompleted: operations,
      errorsEncountered: this.totalErrors,
      testPassed: true,
      message: phase
    };
    
    this.allResults.push(result);
    
    logger.info(
      `⏱️ ${elapsedSec.toFixed(0)}s |` + 
      ` 内存: ${currentMemory.toFixed(1)}MB |` +
      ` 总操作: ${operations.toLocaleString()} |` + 
      ` 错误: ${this.totalErrors}`
    );
  }

  private getCurrentMemoryMB(): number {
    const memUsage = process.memoryUsage();
    return memUsage.heapUsed / 1024 / 1024;
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  private async printFinalReport(): Promise<void> {
    const totalDuration = (Date.now() - this.startTime) / 1000;
    const totalMinutes = totalDuration / 60;
    const totalHours = totalMinutes / 60;
    
    const finalMemory = this.getCurrentMemoryMB();
    const totalMemoryGrowth = finalMemory - this.initialMemoryMB;
    
    logger.info('\n' + '═'.repeat(80));
    logger.info('📊 超长时间真实负载测试 - 最终报告');
    logger.info('═'.repeat(80));
    logger.info(`总测试时长: ${totalMinutes.toFixed(1)} 分钟`);
    logger.info(`总操作次数: ${this.totalOperations.toLocaleString()}`);
    logger.info(`总错误次数: ${this.totalErrors}`);
    logger.info(`内存检查: ${this.memoryLeakChecks} 次`);
    logger.info(`内存泄漏警告: ${this.memoryLeaksDetected} 次`);
    logger.info('─'.repeat(80));
    logger.info(`初始内存: ${this.initialMemoryMB.toFixed(1)} MB`);
    logger.info(`峰值内存: ${this.maxMemoryMB.toFixed(1)} MB`);
    logger.info(`最终内存: ${finalMemory.toFixed(1)} MB`);
    logger.info(`总内存变化: ${totalMemoryGrowth >= 0 ? '+' : ''}${totalMemoryGrowth.toFixed(1)} MB`);
    logger.info(`性能表现: ${Math.round(this.totalOperations / (totalDuration / 60))} ops/minute`);
    logger.info('═'.repeat(80));
    
    if (totalMemoryGrowth < 100 && this.totalErrors === 0) {
      logger.info('🎉 🚀 ✨ 完美! 系统长时间运行稳定! 可以投入生产!');
    } else if (totalMemoryGrowth < 300) {
      logger.info('✅ 良好! 系统稳定, 可投入生产, 建议定期监控内存');
    } else {
      logger.warn('⚠️ 需要继续优化内存管理');
    }
    logger.info('═'.repeat(80));
  }
}

// 执行
(async () => {
  const test = new UltraLongTermTest();
  await test.runUltraLongTermTest();
})().catch(error => {
  console.error('测试执行异常:', error);
  process.exit(1);
});
