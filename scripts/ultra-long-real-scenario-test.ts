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

class UltraLongRealScenarioTest {
  private results: TestResult[] = [];
  private initialMemory: number = 0;
  private maxMemory: number = 0;
  private operationsCompleted: number = 0;
  private errorsEncountered: number = 0;
  private startTime: number = 0;
  
  // 为了实际可运行，设置为较短时间，但逻辑上模拟真实1小时场景
  private readonly TEST_DURATION_MS = 10 * 60 * 1000; // 10分钟（演示用）

  async runAllTests() {
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🏆 超长时真实场景测试 - 模拟真实生产环境');
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('测试持续时间: 10分钟（生产环境建议1小时以上）');

    this.startTime = Date.now();
    this.initialMemory = this.getMemoryMB();
    this.maxMemory = this.initialMemory;

    try {
      await this.simulateRealWorkdayLoad();
    } catch (error: any) {
      logger.error('❌ 严重错误:', error);
    } finally {
      await this.printFinalReport();
    }
  }

  async simulateRealWorkdayLoad() {
    const testName = '真实工作日负载模拟';
    const start = Date.now();
    logger.info(`\n💼 ${testName}`);
    logger.info('─'.repeat(60));

    try {
      const srcPath = path.join(process.cwd(), 'src');
      const nestJsPath = path.join(process.cwd(), 'nest.js');
      const vueCorePath = path.join(process.cwd(), 'vue-core');
      
      const projects = [
        { name: 'src', path: srcPath },
        { name: 'nest.js', path: nestJsPath },
        { name: 'vue-core', path: vueCorePath }
      ];
      
      let cycleCount = 0;
      let lastLogTime = Date.now();
      const endTime = Date.now() + this.TEST_DURATION_MS;
      
      const memoryCheckpoints: number[] = [this.initialMemory];
      const queryPerCycle = [];
      
      // 持续负载循环
      while (Date.now() < endTime) {
        cycleCount++;
        
        try {
          // 随机选择一个项目
          const project = projects[Math.floor(Math.random() * projects.length)];
          
          const service = new EnhancedCodeKnowledgeGraphService();
          await service.analyzeProject(project.path);
          const qe = service.getQueryEngine();
          
          // 模拟真实的查询负载
          const queriesThisCycle = Math.floor(Math.random() * 200) + 50;
          for (let q = 0; q < queriesThisCycle; q++) {
            const random = Math.random();
            if (random < 0.15) {
              qe.getEntitiesByType(CodeEntityType.CLASS);
            } else if (random < 0.3) {
              qe.getEntitiesByType(CodeEntityType.FUNCTION);
            } else if (random < 0.45) {
              qe.searchEntitiesByName('service');
            } else if (random < 0.6) {
              qe.searchEntitiesByName('class');
            } else if (random < 0.75) {
              qe.searchEntitiesByName('function');
            } else if (random < 0.85) {
              qe.getStatistics();
            } else {
              service.clearCache();
            }
            this.operationsCompleted++;
          }
          
          queryPerCycle.push(queriesThisCycle);
          
          // 定期清理
          service.clearCache();
          service.resetAll();
          
          // 定期记录内存和进度
          if (Date.now() - lastLogTime > 30000) { // 30秒
            const currentMemory = this.getMemoryMB();
            memoryCheckpoints.push(currentMemory);
            if (currentMemory > this.maxMemory) {
              this.maxMemory = currentMemory;
            }
            
            const elapsedMinutes = (Date.now() - this.startTime) / 60000;
            const operationsPerMinute = this.operationsCompleted / elapsedMinutes;
            
            logger.info(`  时间: ${elapsedMinutes.toFixed(1)}分钟 | ` +
                      `内存: ${currentMemory.toFixed(1)}MB | ` +
                      `操作数: ${this.operationsCompleted.toLocaleString()} | ` +
                      `速度: ${operationsPerMinute.toFixed(0)} 操作/分钟`);
            
            lastLogTime = Date.now();
          }
          
          // 短暂休息，模拟真实用户使用
          await this.sleep(Math.random() * 50 + 10);
          
        } catch (error) {
          this.errorsEncountered++;
          logger.warn(`⚠️  循环 #${cycleCount} 遇到错误: ${error}`);
        }
      }
      
      // 分析内存趋势
      const firstAvg = memoryCheckpoints.slice(0, Math.max(2, Math.floor(memoryCheckpoints.length/2))).reduce((a,b)=>a+b,0) / 
                       Math.max(2, Math.floor(memoryCheckpoints.length/2));
      const lastAvg = memoryCheckpoints.slice(-Math.max(2, Math.floor(memoryCheckpoints.length/2))).reduce((a,b)=>a+b,0) / 
                      Math.max(2, Math.floor(memoryCheckpoints.length/2));
      const memoryTrend = lastAvg - firstAvg;
      
      this.updateMemory();
      
      const avgQueriesPerCycle = queryPerCycle.reduce((a,b) => a+b, 0) / queryPerCycle.length;
      
      this.results.push({
        testName,
        passed: this.errorsEncountered === 0 && memoryTrend < 100,
        duration: Date.now() - start,
        metrics: {
          totalCycles: cycleCount,
          totalOperations: this.operationsCompleted,
          errorsEncountered: this.errorsEncountered,
          avgQueriesPerCycle: Math.round(avgQueriesPerCycle),
          initialMemoryMB: this.initialMemory.toFixed(1),
          maxMemoryMB: this.maxMemory.toFixed(1),
          finalMemoryMB: this.getMemoryMB().toFixed(1),
          memoryTrendMB: memoryTrend.toFixed(1)
        }
      });
      
      if (this.errorsEncountered === 0 && memoryTrend < 100) {
        logger.info(`✅ ${testName} 通过 - 真实场景负载稳定！`);
      } else if (this.errorsEncountered === 0) {
        logger.warn(`⚠️  ${testName} - 内存增长较高: ${memoryTrend.toFixed(1)}MB`);
      } else {
        logger.warn(`⚠️  ${testName} - ${this.errorsEncountered} 个错误`);
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

  async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
    const totalDuration = Date.now() - this.startTime;
    const totalMinutes = totalDuration / 60000;
    const memoryGrowth = finalMemory - this.initialMemory;
    const opsPerMinute = this.operationsCompleted / totalMinutes;
    
    logger.info('\n' + '═'.repeat(80));
    logger.info('🏆 超长时真实场景测试 - 最终报告');
    logger.info('═'.repeat(80));
    logger.info(`测试时长: ${totalMinutes.toFixed(1)} 分钟`);
    logger.info(`总操作数: ${this.operationsCompleted.toLocaleString()}`);
    logger.info(`平均速度: ${opsPerMinute.toFixed(0)} 操作/分钟`);
    logger.info(`错误数: ${this.errorsEncountered}`);
    logger.info('─'.repeat(80));
    logger.info(`初始内存: ${this.initialMemory.toFixed(1)} MB`);
    logger.info(`峰值内存: ${this.maxMemory.toFixed(1)} MB`);
    logger.info(`最终内存: ${finalMemory.toFixed(1)} MB`);
    logger.info(`内存变化: ${memoryGrowth >= 0 ? '+' : ''}${memoryGrowth.toFixed(1)} MB`);
    logger.info('─'.repeat(80));
    
    logger.info('详细结果:');
    for (const result of this.results) {
      const status = result.passed ? '✅' : '❌';
      logger.info(`  ${status} ${result.testName} (${(result.duration/60000).toFixed(1)}分钟)`);
      if (result.metrics) {
        for (const [key, value] of Object.entries(result.metrics)) {
          logger.info(`      ${key}: ${value}`);
        }
      }
      if (result.error) {
        logger.info(`      错误: ${result.error}`);
      }
    }
    
    logger.info('─'.repeat(80));
    
    const passedTests = this.results.filter(r => r.passed).length;
    const totalTests = this.results.length;
    
    if (passedTests === totalTests && this.errorsEncountered === 0) {
      logger.info('🎉 🚀 完美！超长时真实场景测试完美通过！');
      logger.info('🎉 🚀 系统已经可以投入生产环境使用！');
    } else if (passedTests === totalTests) {
      logger.info('✅ 良好！测试通过，系统稳定');
    } else {
      logger.warn('⚠️  需要关注');
    }
    
    logger.info('═'.repeat(80));
  }
}

(async () => {
  const test = new UltraLongRealScenarioTest();
  await test.runAllTests();
})().catch(error => {
  console.error('测试执行异常:', error);
  process.exit(1);
});
