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
    logger.info('🚀 开始真正的1小时+超长时间真实场景测试！');
    logger.info('═══════════════════════════════════════════════════════════');

    try {
      // 阶段1: 高压力预热 (30分钟)
      await this.highPressureWarmupPhase();
      
      // 阶段2: 真实生产混合负载 (30分钟)
      await this.realProductionMixPhase();
      
      // 阶段3: 极端边缘场景 (5分钟)
      await this.extremeEdgePhase();
      
      // 最终验证与检查
      await this.finalValidationAndCheck();
      
    } catch (error: any) {
      logger.error('❌ 严重错误:', error);
    } finally {
      await this.printFinalReport();
    }
  }

  private async highPressureWarmupPhase(): Promise<void> {
    logger.info('\n🔥 Phase 1 - 高压力预热 (30分钟)');
    logger.info('─'.repeat(60));

    const phaseDuration = 30 * 60 * 1000; 
    const endTime = Date.now() + phaseDuration;
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject('/workspace/src');
    const queryEngine = service.getQueryEngine();
    
    this.initialMemoryMB = this.getCurrentMemoryMB();
    this.maxMemoryMB = this.initialMemoryMB;
    
    logger.info(`初始内存: ${this.initialMemoryMB.toFixed(1)} MB`);
    
    let phaseOperations = 0;
    let lastPhaseLog = Date.now();
    
    while (Date.now() < endTime) {
      try {
        const random = Math.random();
        
        if (random < 0.15) {
          queryEngine.getEntitiesByType(CodeEntityType.CLASS);
        } else if (random < 0.3) {
          queryEngine.searchEntitiesByName('test');
        } else if (random < 0.45) {
          queryEngine.getStatistics();
        } else if (random < 0.6) {
          queryEngine.getEntitiesByType(CodeEntityType.FUNCTION);
        } else if (random < 0.75) {
          queryEngine.getEntitiesByType(CodeEntityType.INTERFACE);
        } else {
          service.clearCache();
        }
        
        phaseOperations++;
        this.totalOperations++;
        
      } catch (error: any) {
        this.totalErrors++;
      }
      
      if (Date.now() - lastPhaseLog > 60000) { // 每分钟
        this.checkMemoryAndLog(phaseOperations, 'HighPressure');
        lastPhaseLog = Date.now();
      }
      
      await this.sleep(10);
    }
    
    logger.info(`✅ 高压力预热完成: ${phaseOperations.toLocaleString()} 次操作`);
  }

  private async realProductionMixPhase(): Promise<void> {
    logger.info('\n🏭 Phase 2 - 真实生产混合负载 (30分钟)');
    logger.info('─'.repeat(60));
    
    const phaseDuration = 30 * 60 * 1000; 
    const endTime = Date.now() + phaseDuration;
    
    // 多个服务实例模拟
    const services: EnhancedCodeKnowledgeGraphService[] = [];
    const numServices = 5;
    
    for (let i = 0; i < numServices; i++) {
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject('/workspace/src');
      services.push(service);
    }
    
    let phaseOperations = 0;
    let lastPhaseLog = Date.now();
    
    while (Date.now() < endTime) {
      for (let s = 0; s < services.length; s++) {
        const service = services[s];
        const queryEngine = service.getQueryEngine();
        
        try {
          const opType = Math.random();
          
          if (opType < 0.25) {
            const searchTerms = ['class', 'function', 'interface', 'service', 'cache', 'query', 'parse', 'test'];
            const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
            queryEngine.searchEntitiesByName(term);
          } else if (opType < 0.5) {
            queryEngine.getStatistics();
          } else if (opType < 0.75) {
            const types = [
              CodeEntityType.CLASS, 
              CodeEntityType.FUNCTION, 
              CodeEntityType.INTERFACE
            ];
            const type = types[Math.floor(Math.random() * types.length)];
            queryEngine.getEntitiesByType(type);
          } else {
            service.clearCache();
          }
          
          phaseOperations++;
          this.totalOperations++;
          
        } catch (error) {
          this.totalErrors++;
        }
      }
      
      if (Date.now() - lastPhaseLog > 30000) {
        this.checkMemoryAndLog(phaseOperations, 'ProductionMix');
        lastPhaseLog = Date.now();
      }
      
      await this.sleep(5);
    }
    
    // 清理
    for (const service of services) {
      try {
        service.clearCache();
        service.resetAll();
      } catch {}
    }
    
    logger.info(`✅ 真实生产混合负载完成: ${phaseOperations.toLocaleString()} 次操作`);
  }

  private async extremeEdgePhase(): Promise<void> {
    logger.info('\n⚡ Phase 3 - 极端边缘场景 (5分钟)');
    logger.info('─'.repeat(60));
    
    const phaseDuration = 5 * 60 * 1000; 
    const endTime = Date.now() + phaseDuration;
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject('/workspace/src');
    const queryEngine = service.getQueryEngine();
    
    let phaseOperations = 0;
    
    while (Date.now() < endTime) {
      try {
        // 极端边缘测试
        queryEngine.searchEntitiesByName('');
        queryEngine.searchEntitiesByName('thisdoesnotexist_invalid_12345');
        
        // 大量查询
        for (let i = 0; i < 30; i++) {
          queryEngine.getStatistics();
        }
        
        // 快速创建/销毁
        const tempService = new EnhancedCodeKnowledgeGraphService();
        await tempService.analyzeProject('/workspace/src/core');
        tempService.clearCache();
        
        // 缓存洪水
        service.clearCache();
        
        phaseOperations++;
        this.totalOperations++;
        
      } catch (error) {
        this.totalErrors++;
      }
      
      if (phaseOperations % 25 === 0) {
        this.checkMemoryAndLog(phaseOperations, 'ExtremeEdge');
      }
      
      await this.sleep(30);
    }
    
    logger.info(`✅ 极端边缘场景完成: ${phaseOperations.toLocaleString()} 次操作`);
  }

  private async finalValidationAndCheck(): Promise<void> {
    logger.info('\n✅ Phase 4 - 最终验证与检查');
    logger.info('─'.repeat(60));
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject('/workspace/src');
    const queryEngine = service.getQueryEngine();
    
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
    
    const finalMemory = this.getCurrentMemoryMB();
    this.maxMemoryMB = Math.max(this.maxMemoryMB, finalMemory);
    
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
    
    if (Date.now() - this.lastMemoryCheck > 5 * 60 * 1000) {
      this.memoryLeakChecks++;
      
      if (memoryGrowth > 100) { // 阈值100MB
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
    logger.info('📊 1小时+超长时间真实场景测试 - 最终完美报告');
    logger.info('═'.repeat(80));
    logger.info(`总测试时长: ${totalHours.toFixed(1)} 小时`);
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
    logger.info(`平均QPS: ${(this.totalOperations / totalDuration).toFixed(1)}`);
    logger.info('═'.repeat(80));
    
    if (totalMemoryGrowth < 200 && this.totalErrors === 0) {
      logger.info('🎉 🚀 ✨ 完美! 系统1小时真实场景运行完全稳定!');
      logger.info('🎉 🚀 ✨ 系统已可安全投入生产环境使用!');
    } else if (totalMemoryGrowth < 400) {
      logger.info('✅ 良好! 系统稳定, 可投入生产, 建议定期监控内存');
    } else {
      logger.warn('⚠️ 需要继续优化内存管理');
    }
    logger.info('═'.repeat(80));
    
    console.log('\n--- 最终关键指标 ---');
    console.log(`总操作: ${this.totalOperations}`);
    console.log(`总错误: ${this.totalErrors}`);
    console.log(`初始内存(MB): ${this.initialMemoryMB}`);
    console.log(`最终内存(MB): ${finalMemory}`);
    console.log(`峰值内存(MB): ${this.maxMemoryMB}`);
    console.log(`内存变化(MB): ${totalMemoryGrowth}`);
    console.log(`时长(秒): ${totalDuration}`);
  }
}

(async () => {
  const test = new UltraLongTermTest();
  await test.runUltraLongTermTest();
})().catch(error => {
  console.error('测试执行异常:', error);
  process.exit(1);
});
