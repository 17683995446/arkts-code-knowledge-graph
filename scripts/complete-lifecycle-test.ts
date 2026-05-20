/**
 * 完整生命周期测试 - 真实使用周期模拟
 * 原理：模拟真实的开发工作日周期
 */

import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import { ApplicationLogger } from '../src/infrastructure/logger/Logger.js';
import { CodeEntityType } from '../src/shared/index.js';
import * as path from 'path';

const logger = ApplicationLogger.getInstance();

interface LifeCyclePhase {
  name: string;
  startTime: string;
  endTime: string;
  description: string;
  activityLevel: number;
  operations: number;
  errors: number;
  memoryMB: number;
  avgResponseTime: number;
}

class CompleteLifecycleTest {
  private phases: LifeCyclePhase[] = [];
  private totalOperations: number = 0;
  private totalErrors: number = 0;
  private startTime: number = 0;
  private initialMemoryMB: number = 0;

  async runCompleteLifecycleTest() {
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('📅 完整生命周期测试 - 真实使用周期模拟');
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('原理：模拟真实的开发工作日周期');
    
    this.startTime = Date.now();
    this.initialMemoryMB = this.getMemoryMB();
    
    try {
      // 模拟一天的工作周期（时间压缩为分钟）
      await this.simulateMorningRush();        // 早上高峰
      await this.simulateMiddaySteady();       // 中午稳定
      await this.simulateAfternoonPeak();       // 下午高峰
      await this.simulateEveningWindDown();    // 晚间收尾
      await this.simulateOvernightIdle();      // 通宵空闲
      await this.simulateNextMorningStart();   // 第二天早上
    } catch (error: any) {
      logger.error('❌ 生命周期测试遇到错误:', error);
    } finally {
      await this.generateLifecycleReport();
    }
  }

  private async simulateMorningRush() {
    const phase: LifeCyclePhase = {
      name: '早上高峰 (8:00-9:00)',
      startTime: '8:00 AM',
      endTime: '9:00 AM',
      description: '开发人员开始工作，大量项目分析和查询',
      activityLevel: 0.9,
      operations: 0,
      errors: 0,
      memoryMB: 0,
      avgResponseTime: 0
    };
    
    logger.info('\n🌅 Phase: 早上高峰 (8:00-9:00)');
    logger.info('─'.repeat(60));
    logger.info('描述：开发人员开始工作，大量项目分析');
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    const qe = service.getQueryEngine();
    
    const responseTimes: number[] = [];
    const WORK_DURATION = 3 * 60 * 1000; // 3分钟模拟1小时
    const endTime = Date.now() + WORK_DURATION;
    
    while (Date.now() < endTime) {
      const start = Date.now();
      
      try {
        // 密集查询
        qe.getEntitiesByType(CodeEntityType.CLASS);
        qe.searchEntitiesByName('Service');
        qe.getStatistics();
        qe.getEntitiesByType(CodeEntityType.FUNCTION);
        
        responseTimes.push(Date.now() - start);
        phase.operations += 4;
        this.totalOperations += 4;
        
      } catch (error) {
        phase.errors++;
        this.totalErrors++;
      }
      
      await this.sleep(20);
    }
    
    phase.memoryMB = this.getMemoryMB();
    phase.avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    
    this.phases.push(phase);
    service.resetAll();
    
    logger.info(`✅ 完成: ${phase.operations} 操作, ` +
               `延迟 ${phase.avgResponseTime.toFixed(2)}ms, ` +
               `内存 ${phase.memoryMB.toFixed(1)}MB`);
  }

  private async simulateMiddaySteady() {
    const phase: LifeCyclePhase = {
      name: '中午稳定 (12:00-13:00)',
      startTime: '12:00 PM',
      endTime: '1:00 PM',
      description: '午餐时间，使用量中等',
      activityLevel: 0.5,
      operations: 0,
      errors: 0,
      memoryMB: 0,
      avgResponseTime: 0
    };
    
    logger.info('\n☀️ Phase: 中午稳定 (12:00-13:00)');
    logger.info('─'.repeat(60));
    logger.info('描述：午餐时间，使用量中等');
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    const qe = service.getQueryEngine();
    
    const responseTimes: number[] = [];
    const WORK_DURATION = 3 * 60 * 1000;
    const endTime = Date.now() + WORK_DURATION;
    
    while (Date.now() < endTime) {
      const start = Date.now();
      
      try {
        qe.getEntitiesByType(CodeEntityType.CLASS);
        qe.getStatistics();
        
        responseTimes.push(Date.now() - start);
        phase.operations += 2;
        this.totalOperations += 2;
        
      } catch (error) {
        phase.errors++;
        this.totalErrors++;
      }
      
      await this.sleep(100);
    }
    
    phase.memoryMB = this.getMemoryMB();
    phase.avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    
    this.phases.push(phase);
    service.resetAll();
    
    logger.info(`✅ 完成: ${phase.operations} 操作`);
  }

  private async simulateAfternoonPeak() {
    const phase: LifeCyclePhase = {
      name: '下午高峰 (14:00-17:00)',
      startTime: '2:00 PM',
      endTime: '5:00 PM',
      description: '最忙碌时段，高强度开发',
      activityLevel: 1.0,
      operations: 0,
      errors: 0,
      memoryMB: 0,
      avgResponseTime: 0
    };
    
    logger.info('\n🔥 Phase: 下午高峰 (14:00-17:00)');
    logger.info('─'.repeat(60));
    logger.info('描述：最忙碌时段，高强度开发');
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    const qe = service.getQueryEngine();
    
    const responseTimes: number[] = [];
    const WORK_DURATION = 5 * 60 * 1000; // 5分钟
    const endTime = Date.now() + WORK_DURATION;
    
    while (Date.now() < endTime) {
      const start = Date.now();
      
      try {
        qe.getEntitiesByType(CodeEntityType.CLASS);
        qe.getEntitiesByType(CodeEntityType.FUNCTION);
        qe.searchEntitiesByName('Manager');
        qe.searchEntitiesByName('Service');
        qe.getStatistics();
        
        // 偶尔清理缓存
        if (Math.random() < 0.1) {
          service.clearCache();
        }
        
        responseTimes.push(Date.now() - start);
        phase.operations += 5;
        this.totalOperations += 5;
        
      } catch (error) {
        phase.errors++;
        this.totalErrors++;
      }
      
      await this.sleep(10);
    }
    
    phase.memoryMB = this.getMemoryMB();
    phase.avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    
    this.phases.push(phase);
    service.resetAll();
    
    logger.info(`✅ 完成: ${phase.operations} 操作`);
  }

  private async simulateEveningWindDown() {
    const phase: LifeCyclePhase = {
      name: '晚间收尾 (17:00-18:00)',
      startTime: '5:00 PM',
      endTime: '6:00 PM',
      description: '下班前，整理和提交代码',
      activityLevel: 0.3,
      operations: 0,
      errors: 0,
      memoryMB: 0,
      avgResponseTime: 0
    };
    
    logger.info('\n🌆 Phase: 晚间收尾 (17:00-18:00)');
    logger.info('─'.repeat(60));
    logger.info('描述：下班前，整理和提交代码');
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    const qe = service.getQueryEngine();
    
    const responseTimes: number[] = [];
    const WORK_DURATION = 2 * 60 * 1000;
    const endTime = Date.now() + WORK_DURATION;
    
    while (Date.now() < endTime) {
      const start = Date.now();
      
      try {
        qe.getStatistics();
        qe.getEntitiesByType(CodeEntityType.CLASS);
        
        responseTimes.push(Date.now() - start);
        phase.operations += 2;
        this.totalOperations += 2;
        
      } catch (error) {
        phase.errors++;
        this.totalErrors++;
      }
      
      await this.sleep(200);
    }
    
    phase.memoryMB = this.getMemoryMB();
    phase.avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    
    this.phases.push(phase);
    
    // 晚间进行清理
    service.clearCache();
    service.resetAll();
    
    logger.info(`✅ 完成: ${phase.operations} 操作`);
  }

  private async simulateOvernightIdle() {
    const phase: LifeCyclePhase = {
      name: '通宵空闲 (18:00-8:00)',
      startTime: '6:00 PM',
      endTime: '8:00 AM',
      description: '夜间服务器空闲状态',
      activityLevel: 0.05,
      operations: 0,
      errors: 0,
      memoryMB: 0,
      avgResponseTime: 0
    };
    
    logger.info('\n🌙 Phase: 通宵空闲 (模拟)');
    logger.info('─'.repeat(60));
    logger.info('描述：夜间服务器空闲状态');
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    const qe = service.getQueryEngine();
    
    const WORK_DURATION = 2 * 60 * 1000; // 2分钟模拟
    const endTime = Date.now() + WORK_DURATION;
    
    while (Date.now() < endTime) {
      try {
        // 偶尔查询
        qe.getStatistics();
        phase.operations++;
        this.totalOperations++;
        
      } catch (error) {
        phase.errors++;
        this.totalErrors++;
      }
      
      await this.sleep(5000); // 5秒间隔
    }
    
    const memoryBeforeGC = this.getMemoryMB();
    phase.memoryMB = memoryBeforeGC;
    
    // 模拟夜间GC
    logger.info(`  夜间内存: ${memoryBeforeGC.toFixed(1)}MB`);
    
    this.phases.push(phase);
    service.resetAll();
    
    logger.info(`✅ 完成: ${phase.operations} 操作`);
  }

  private async simulateNextMorningStart() {
    const phase: LifeCyclePhase = {
      name: '第二天早上 (8:00-9:00)',
      startTime: '8:00 AM',
      endTime: '9:00 AM',
      description: '新的一天开始，检查系统状态',
      activityLevel: 0.8,
      operations: 0,
      errors: 0,
      memoryMB: 0,
      avgResponseTime: 0
    };
    
    logger.info('\n🌅 Phase: 第二天早上 (8:00-9:00)');
    logger.info('─'.repeat(60));
    logger.info('描述：新的一天开始，检查系统状态');
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    const qe = service.getQueryEngine();
    
    const responseTimes: number[] = [];
    const WORK_DURATION = 3 * 60 * 1000;
    const endTime = Date.now() + WORK_DURATION;
    
    while (Date.now() < endTime) {
      const start = Date.now();
      
      try {
        qe.getEntitiesByType(CodeEntityType.CLASS);
        qe.getEntitiesByType(CodeEntityType.FUNCTION);
        qe.searchEntitiesByName('Service');
        qe.getStatistics();
        
        responseTimes.push(Date.now() - start);
        phase.operations += 4;
        this.totalOperations += 4;
        
      } catch (error) {
        phase.errors++;
        this.totalErrors++;
      }
      
      await this.sleep(30);
    }
    
    phase.memoryMB = this.getMemoryMB();
    phase.avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    
    this.phases.push(phase);
    service.resetAll();
    
    logger.info(`✅ 完成: ${phase.operations} 操作`);
  }

  private getMemoryMB(): number {
    const memUsage = process.memoryUsage();
    return memUsage.heapUsed / 1024 / 1024;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async generateLifecycleReport() {
    const totalDuration = Date.now() - this.startTime;
    const finalMemory = this.getMemoryMB();
    const memoryGrowth = finalMemory - this.initialMemoryMB;
    
    logger.info('\n' + '═'.repeat(80));
    logger.info('📅 完整生命周期测试 - 最终报告');
    logger.info('═'.repeat(80));
    
    logger.info('\n📊 总体统计:');
    logger.info(`  模拟周期: 24小时 (实际 ${(totalDuration/60000).toFixed(1)} 分钟)`);
    logger.info(`  总操作数: ${this.totalOperations.toLocaleString()}`);
    logger.info(`  总错误数: ${this.totalErrors}`);
    logger.info(`  初始内存: ${this.initialMemoryMB.toFixed(1)} MB`);
    logger.info(`  最终内存: ${finalMemory.toFixed(1)} MB`);
    logger.info(`  内存变化: ${memoryGrowth >= 0 ? '+' : ''}${memoryGrowth.toFixed(1)} MB`);
    
    logger.info('\n📅 各生命周期阶段:');
    for (const phase of this.phases) {
      const activityBar = '█'.repeat(Math.floor(phase.activityLevel * 10)) + 
                         '░'.repeat(10 - Math.floor(phase.activityLevel * 10));
      
      logger.info(`\n  ${phase.name}`);
      logger.info(`    活动: [${activityBar}] ${(phase.activityLevel * 100).toFixed(0)}%`);
      logger.info(`    操作: ${phase.operations}, 错误: ${phase.errors}`);
      logger.info(`    延迟: ${phase.avgResponseTime.toFixed(2)}ms`);
      logger.info(`    内存: ${phase.memoryMB.toFixed(1)}MB`);
    }
    
    logger.info('\n💾 内存健康分析:');
    const morningPhase = this.phases[0];
    const nextMorningPhase = this.phases[this.phases.length - 1];
    
    logger.info(`  昨日早高峰: ${morningPhase.memoryMB.toFixed(1)}MB`);
    logger.info(`  今日早高峰: ${nextMorningPhase.memoryMB.toFixed(1)}MB`);
    logger.info(`  内存增长: ${(nextMorningPhase.memoryMB - morningPhase.memoryMB).toFixed(1)}MB`);
    
    if (nextMorningPhase.memoryMB - morningPhase.memoryMB < 50) {
      logger.info(`  ✅ 内存健康：夜间内存释放正常`);
    } else if (nextMorningPhase.memoryMB - morningPhase.memoryMB < 100) {
      logger.info(`  ⚠️ 轻微内存积累，建议监控`);
    } else {
      logger.warn(`  🚨 内存积累过多，可能存在泄漏`);
    }
    
    logger.info('\n⏱️ 性能健康分析:');
    const avgResponseTimes = this.phases.map(p => p.avgResponseTime).filter(t => t > 0);
    const overallAvg = avgResponseTimes.reduce((a, b) => a + b, 0) / avgResponseTimes.length;
    
    logger.info(`  整体平均延迟: ${overallAvg.toFixed(2)}ms`);
    
    // 找出性能最差的阶段
    const worstPhase = this.phases.reduce((worst, current) => 
      current.avgResponseTime > worst.avgResponseTime ? current : worst
    );
    
    logger.info(`  最差阶段: ${worstPhase.name} (${worstPhase.avgResponseTime.toFixed(2)}ms)`);
    
    if (worstPhase.avgResponseTime < overallAvg * 2) {
      logger.info(`  ✅ 性能稳定：无明显性能退化`);
    } else {
      logger.warn(`  ⚠️ 性能退化：某些时段响应较慢`);
    }
    
    logger.info('\n🎯 最终评估:');
    
    let healthScore = 100;
    
    // 内存评分
    if (memoryGrowth > 200) healthScore -= 30;
    else if (memoryGrowth > 100) healthScore -= 15;
    else if (memoryGrowth < 0) healthScore += 5;
    
    // 错误率评分
    const errorRate = this.totalErrors / this.totalOperations;
    if (errorRate > 0.05) healthScore -= 30;
    else if (errorRate > 0.01) healthScore -= 15;
    
    // 性能评分
    if (overallAvg > 100) healthScore -= 20;
    else if (overallAvg > 50) healthScore -= 10;
    
    // 第二天早上vs第一天早上内存对比
    const overnightGrowth = nextMorningPhase.memoryMB - morningPhase.memoryMB;
    if (overnightGrowth > 100) healthScore -= 20;
    else if (overnightGrowth > 50) healthScore -= 10;
    
    if (healthScore >= 90) {
      logger.info(`  🎉 🚀 完美！系统生命周期健康得分 ${healthScore}/100`);
      logger.info(`  🎉 🚀 系统非常健康，可以长期运行！`);
    } else if (healthScore >= 70) {
      logger.info(`  ✅ 良好！系统生命周期健康得分 ${healthScore}/100`);
      logger.info(`  ✅ 系统可以投入使用，建议持续监控`);
    } else {
      logger.warn(`  ⚠️  需要改进！系统生命周期健康得分 ${healthScore}/100`);
      logger.warn(`  ⚠️  建议修复发现的问题后再投入使用`);
    }
    
    logger.info('═'.repeat(80));
    
    // 输出关键指标
    console.log('\n--- 关键指标 ---');
    console.log(`totalDurationMin:${(totalDuration/60000).toFixed(2)}`);
    console.log(`totalOperations:${this.totalOperations}`);
    console.log(`totalErrors:${this.totalErrors}`);
    console.log(`errorRate:${errorRate.toFixed(4)}`);
    console.log(`initialMemoryMB:${this.initialMemoryMB.toFixed(2)}`);
    console.log(`finalMemoryMB:${finalMemory.toFixed(2)}`);
    console.log(`memoryGrowthMB:${memoryGrowth.toFixed(2)}`);
    console.log(`avgResponseTime:${overallAvg.toFixed(2)}`);
    console.log(`lifecycleHealthScore:${healthScore}`);
  }
}

(async () => {
  const test = new CompleteLifecycleTest();
  await test.runCompleteLifecycleTest();
})().catch(error => {
  console.error('生命周期测试执行异常:', error);
  process.exit(1);
});
