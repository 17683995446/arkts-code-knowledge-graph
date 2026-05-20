/**
 * 🚀 超大规模混乱测试 - 真正的极限挑战
 * 特点：多项目 + 疯狂并发 + 随机错误 + 极限资源压力
 */

import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import { ApplicationLogger } from '../src/infrastructure/logger/Logger.js';
import { CodeEntityType } from '../src/shared/index.js';
import * as path from 'path';

const logger = ApplicationLogger.getInstance();

interface ChaosMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  memorySpikes: number;
  timeouts: number;
  recoveredErrors: number;
  chaosEvents: string[];
}

class ChaosEngineeringTest {
  private metrics: ChaosMetrics = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    memorySpikes: 0,
    timeouts: 0,
    recoveredErrors: 0,
    chaosEvents: []
  };
  
  private startTime = 0;
  private initialMemory = 0;
  private maxMemory = 0;
  private memorySnapshots: number[] = [];

  async runChaosTest() {
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🚀 超大规模混乱测试 - 真正的极限挑战');
    logger.info('═══════════════════════════════════════════════════════════');
    
    this.startTime = Date.now();
    this.initialMemory = this.getMemoryMB();
    
    try {
      // 第一波：混乱的资源竞争
      await this.chaos_WildResourceContention();
      
      // 第二波：混乱的错误注入
      await this.chaos_ErrorInjection();
      
      // 第三波：混乱的并发风暴
      await this.chaos_ConcurrentStorm();
      
      // 第四波：混乱的内存压力
      await this.chaos_MemoryPressure();
      
      // 第五波：混乱的负载模式
      await this.chaos_LoadPatterns();
      
      // 第六波：混乱的恢复测试
      await this.chaos_RecoveryTest();
      
    } catch (error: any) {
      logger.error('❌ 灾难性错误:', error);
      this.metrics.chaosEvents.push(`CRITICAL: ${error.message}`);
    } finally {
      await this.generateChaosReport();
    }
  }

  private async chaos_WildResourceContention() {
    const name = '🔥 第一波：疯狂资源竞争';
    logger.info(`\n${name}`);
    logger.info('─'.repeat(60));
    logger.info('目标：10个服务实例疯狂竞争资源');
    
    this.metrics.chaosEvents.push(name);
    
    const services: EnhancedCodeKnowledgeGraphService[] = [];
    
    // 创建10个服务实例
    for (let i = 0; i < 10; i++) {
      const service = new EnhancedCodeKnowledgeGraphService();
      services.push(service);
    }
    
    const projects = ['src', 'nest.js', 'vue-core'];
    let cycle = 0;
    
    // 疯狂循环
    while (cycle < 20) {
      const promises: Promise<void>[] = [];
      
      for (let i = 0; i < services.length; i++) {
        const service = services[i];
        const project = projects[i % projects.length];
        
        // 疯狂并发查询
        for (let q = 0; q < 50; q++) {
          promises.push(this.wildQuery(service, project));
        }
        
        // 随机清理
        if (Math.random() < 0.3) {
          promises.push(this.wildClear(service));
        }
      }
      
      await Promise.allSettled(promises);
      cycle++;
      
      if (cycle % 5 === 0) {
        const mem = this.getMemoryMB();
        this.updateMaxMemory();
        logger.info(`  周期 ${cycle}/20: 内存 ${mem.toFixed(1)}MB, 操作 ${this.metrics.totalOperations}`);
      }
    }
    
    // 疯狂清理
    for (const service of services) {
      try {
        service.resetAll();
      } catch {}
    }
    
    logger.info(`✅ ${name} 完成`);
  }

  private async chaos_ErrorInjection() {
    const name = '💥 第二波：错误注入与恢复';
    logger.info(`\n${name}`);
    logger.info('─'.repeat(60));
    logger.info('目标：注入随机错误，测试系统恢复能力');
    
    this.metrics.chaosEvents.push(name);
    
    const service = new EnhancedCodeKnowledgeGraphService();
    
    // 疯狂错误注入循环
    for (let i = 0; i < 100; i++) {
      try {
        // 随机选择操作
        const op = Math.random();
        
        if (op < 0.2) {
          // 注入空查询
          service.getQueryEngine().searchEntitiesByName('');
        } else if (op < 0.4) {
          // 注入超长字符串
          service.getQueryEngine().searchEntitiesByName('x'.repeat(10000));
        } else if (op < 0.6) {
          // 注入特殊字符
          service.getQueryEngine().searchEntitiesByName('!@#$%^&*()_+-=[]{}|;:,.<>?');
        } else if (op < 0.8) {
          // 注入null/undefined
          (service.getQueryEngine() as any).getEntitiesByType(null);
        } else {
          // 正常查询
          service.getQueryEngine().getStatistics();
        }
        
        this.metrics.successfulOperations++;
      } catch (error) {
        this.metrics.failedOperations++;
        this.metrics.recoveredErrors++;
        
        if (i % 20 === 0) {
          logger.info(`  错误注入 #${i}: 已恢复 ${this.metrics.recoveredErrors} 次`);
        }
      }
      
      this.metrics.totalOperations++;
    }
    
    // 验证系统仍然正常工作
    try {
      const stats = service.getQueryEngine().getStatistics();
      logger.info(`  ✅ 系统恢复验证: ${stats.totalEntityCount} 实体`);
    } catch (error) {
      logger.error(`  ❌ 系统恢复失败`);
    }
    
    service.resetAll();
    logger.info(`✅ ${name} 完成`);
  }

  private async chaos_ConcurrentStorm() {
    const name = '🌪️ 第三波：并发风暴';
    logger.info(`\n${name}`);
    logger.info('─'.repeat(60));
    logger.info('目标：1000个并发请求风暴');
    
    this.metrics.chaosEvents.push(name);
    
    const service = new EnhancedCodeKnowledgeGraphService();
    
    // 并发风暴
    const CONCURRENT_STORM = 1000;
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < CONCURRENT_STORM; i++) {
      promises.push(this.stormQuery(service, i));
    }
    
    const results = await Promise.allSettled(promises);
    
    const fulfilled = results.filter(r => r.status === 'fulfilled').length;
    const rejected = results.filter(r => r.status === 'rejected').length;
    
    logger.info(`  并发风暴结果: ${fulfilled} 成功, ${rejected} 失败`);
    
    service.resetAll();
    logger.info(`✅ ${name} 完成`);
  }

  private async chaos_MemoryPressure() {
    const name = '💾 第四波：内存压力测试';
    logger.info(`\n${name}`);
    logger.info('─'.repeat(60));
    logger.info('目标：内存压力下系统的表现');
    
    this.metrics.chaosEvents.push(name);
    
    const MEMORY_CYCLES = 30;
    
    for (let cycle = 0; cycle < MEMORY_CYCLES; cycle++) {
      // 创建大量服务实例
      const services: EnhancedCodeKnowledgeGraphService[] = [];
      
      for (let i = 0; i < 5; i++) {
        const service = new EnhancedCodeKnowledgeGraphService();
        services.push(service);
      }
      
      // 分析项目
      for (const service of services) {
        await service.analyzeProject(path.join(process.cwd(), 'src'));
      }
      
      // 疯狂查询
      for (const service of services) {
        const qe = service.getQueryEngine();
        for (let q = 0; q < 100; q++) {
          try {
            qe.getStatistics();
            qe.getEntitiesByType(CodeEntityType.CLASS);
            qe.searchEntitiesByName('service');
            this.metrics.totalOperations++;
          } catch {}
        }
      }
      
      // 记录内存
      const mem = this.getMemoryMB();
      this.memorySnapshots.push(mem);
      this.updateMaxMemory();
      
      // 检测内存尖峰
      if (this.memorySnapshots.length > 1) {
        const last = this.memorySnapshots[this.memorySnapshots.length - 1];
        const prev = this.memorySnapshots[this.memorySnapshots.length - 2];
        if (last - prev > 100) {
          this.metrics.memorySpikes++;
        }
      }
      
      // 疯狂清理
      for (const service of services) {
        try {
          service.clearCache();
          service.resetAll();
        } catch {}
      }
      
      if (cycle % 10 === 0) {
        logger.info(`  内存周期 ${cycle}/${MEMORY_CYCLES}: ${mem.toFixed(1)}MB, 尖峰 ${this.metrics.memorySpikes}`);
      }
    }
    
    logger.info(`✅ ${name} 完成`);
  }

  private async chaos_LoadPatterns() {
    const name = '📊 第五波：混乱负载模式';
    logger.info(`\n${name}`);
    logger.info('─'.repeat(60));
    logger.info('目标：不规律的负载模式');
    
    this.metrics.chaosEvents.push(name);
    
    const PATTERNS = ['spike', 'wave', 'sawtooth', 'random', 'burst'];
    
    for (const pattern of PATTERNS) {
      logger.info(`  测试模式: ${pattern}`);
      
      const service = new EnhancedCodeKnowledgeGraphService();
      
      switch (pattern) {
        case 'spike':
          // 尖峰模式
          await this.patternSpike(service);
          break;
        case 'wave':
          // 波浪模式
          await this.patternWave(service);
          break;
        case 'sawtooth':
          // 锯齿模式
          await this.patternSawtooth(service);
          break;
        case 'random':
          // 随机模式
          await this.patternRandom(service);
          break;
        case 'burst':
          // 突发模式
          await this.patternBurst(service);
          break;
      }
      
      service.resetAll();
    }
    
    logger.info(`✅ ${name} 完成`);
  }

  private async chaos_RecoveryTest() {
    const name = '🔄 第六波：混乱恢复测试';
    logger.info(`\n${name}`);
    logger.info('─'.repeat(60));
    logger.info('目标：模拟各种灾难场景，测试恢复能力');
    
    this.metrics.chaosEvents.push(name);
    
    // 场景1：快速创建销毁
    logger.info('  场景1：快速创建销毁50次');
    for (let i = 0; i < 50; i++) {
      const service = new EnhancedCodeKnowledgeGraphService();
      try {
        await service.analyzeProject(path.join(process.cwd(), 'src'));
        service.getQueryEngine().getStatistics();
      } catch {}
      service.resetAll();
    }
    
    // 场景2：并发竞争
    logger.info('  场景2：并发竞争');
    const services: EnhancedCodeKnowledgeGraphService[] = [];
    for (let i = 0; i < 20; i++) {
      services.push(new EnhancedCodeKnowledgeGraphService());
    }
    
    const promises = services.map(async (s, i) => {
      await s.analyzeProject(path.join(process.cwd(), 'src'));
      s.getQueryEngine().getStatistics();
    });
    
    await Promise.allSettled(promises);
    
    for (const s of services) {
      s.resetAll();
    }
    
    // 场景3：极限负载
    logger.info('  场景3：极限负载');
    const extremeService = new EnhancedCodeKnowledgeGraphService();
    await extremeService.analyzeProject(path.join(process.cwd(), 'src'));
    
    for (let i = 0; i < 500; i++) {
      extremeService.getQueryEngine().getStatistics();
      extremeService.getQueryEngine().getEntitiesByType(CodeEntityType.CLASS);
      this.metrics.totalOperations++;
    }
    
    extremeService.resetAll();
    
    logger.info(`✅ ${name} 完成`);
  }

  // 辅助方法
  private async wildQuery(service: EnhancedCodeKnowledgeGraphService, project: string): Promise<void> {
    try {
      const qe = service.getQueryEngine();
      qe.getStatistics();
      qe.getEntitiesByType(CodeEntityType.CLASS);
      qe.searchEntitiesByName('test');
      this.metrics.totalOperations++;
      this.metrics.successfulOperations++;
    } catch {
      this.metrics.failedOperations++;
    }
  }

  private async wildClear(service: EnhancedCodeKnowledgeGraphService): Promise<void> {
    try {
      service.clearCache();
    } catch {}
  }

  private async stormQuery(service: EnhancedCodeKnowledgeGraphService, index: number): Promise<void> {
    const qe = service.getQueryEngine();
    
    try {
      if (index % 4 === 0) {
        qe.getEntitiesByType(CodeEntityType.CLASS);
      } else if (index % 4 === 1) {
        qe.getEntitiesByType(CodeEntityType.FUNCTION);
      } else if (index % 4 === 2) {
        qe.searchEntitiesByName('service');
      } else {
        qe.getStatistics();
      }
      this.metrics.totalOperations++;
      this.metrics.successfulOperations++;
    } catch {
      this.metrics.failedOperations++;
    }
  }

  private async patternSpike(service: EnhancedCodeKnowledgeGraphService): Promise<void> {
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    
    // 尖峰：突然大量查询
    for (let burst = 0; burst < 10; burst++) {
      const promises: Promise<void>[] = [];
      for (let i = 0; i < 100; i++) {
        promises.push(this.stormQuery(service, i));
      }
      await Promise.allSettled(promises);
      
      // 然后休息
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async patternWave(service: EnhancedCodeKnowledgeGraphService): Promise<void> {
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    
    // 波浪：逐渐增加再减少
    for (let wave = 0; wave < 5; wave++) {
      const intensity = wave + 1;
      for (let i = 0; i < intensity * 20; i++) {
        service.getQueryEngine().getStatistics();
        this.metrics.totalOperations++;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  private async patternSawtooth(service: EnhancedCodeKnowledgeGraphService): Promise<void> {
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    
    // 锯齿：快速增长，然后清空
    for (let tooth = 0; tooth < 10; tooth++) {
      for (let i = 0; i < 30; i++) {
        service.getQueryEngine().getStatistics();
        this.metrics.totalOperations++;
      }
      service.clearCache();
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  }

  private async patternRandom(service: EnhancedCodeKnowledgeGraphService): Promise<void> {
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    
    // 随机：完全随机的时间和强度
    for (let i = 0; i < 100; i++) {
      const randomOps = Math.floor(Math.random() * 20) + 1;
      for (let j = 0; j < randomOps; j++) {
        service.getQueryEngine().getStatistics();
        this.metrics.totalOperations++;
      }
      const randomDelay = Math.floor(Math.random() * 100);
      await new Promise(resolve => setTimeout(resolve, randomDelay));
    }
  }

  private async patternBurst(service: EnhancedCodeKnowledgeGraphService): Promise<void> {
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    
    // 突发：每秒钟突然爆发
    for (let burst = 0; burst < 10; burst++) {
      // 积累
      await new Promise(resolve => setTimeout(resolve, 900));
      
      // 爆发
      const promises: Promise<void>[] = [];
      for (let i = 0; i < 50; i++) {
        promises.push(this.stormQuery(service, i));
      }
      await Promise.allSettled(promises);
    }
  }

  private getMemoryMB(): number {
    const memUsage = process.memoryUsage();
    return memUsage.heapUsed / 1024 / 1024;
  }

  private updateMaxMemory() {
    const current = this.getMemoryMB();
    if (current > this.maxMemory) {
      this.maxMemory = current;
    }
  }

  private async generateChaosReport() {
    const totalDuration = Date.now() - this.startTime;
    const finalMemory = this.getMemoryMB();
    const memoryGrowth = finalMemory - this.initialMemory;
    
    logger.info('\n' + '═'.repeat(80));
    logger.info('🚀 超大规模混乱测试 - 最终报告');
    logger.info('═'.repeat(80));
    
    logger.info('\n📊 混乱指标:');
    logger.info(`  总操作数: ${this.metrics.totalOperations.toLocaleString()}`);
    logger.info(`  成功操作: ${this.metrics.successfulOperations.toLocaleString()}`);
    logger.info(`  失败操作: ${this.metrics.failedOperations}`);
    logger.info(`  恢复错误: ${this.metrics.recoveredErrors}`);
    logger.info(`  内存尖峰: ${this.metrics.memorySpikes}`);
    
    logger.info('\n💾 内存分析:');
    logger.info(`  初始内存: ${this.initialMemory.toFixed(1)} MB`);
    logger.info(`  峰值内存: ${this.maxMemory.toFixed(1)} MB`);
    logger.info(`  最终内存: ${finalMemory.toFixed(1)} MB`);
    logger.info(`  内存变化: ${memoryGrowth >= 0 ? '+' : ''}${memoryGrowth.toFixed(1)} MB`);
    
    logger.info('\n🌪️ 混乱事件:');
    for (const event of this.metrics.chaosEvents) {
      logger.info(`  • ${event}`);
    }
    
    logger.info('\n⏱️ 性能分析:');
    logger.info(`  总时长: ${(totalDuration / 1000).toFixed(1)} 秒`);
    logger.info(`  平均QPS: ${(this.metrics.totalOperations / (totalDuration / 1000)).toFixed(1)}`);
    
    logger.info('\n🎯 最终评估:');
    
    let chaosScore = 100;
    
    // 失败率评分
    const failRate = this.metrics.failedOperations / this.metrics.totalOperations;
    if (failRate > 0.1) chaosScore -= 30;
    else if (failRate > 0.05) chaosScore -= 15;
    else if (failRate > 0.01) chaosScore -= 5;
    
    // 内存评分
    if (memoryGrowth > 500) chaosScore -= 30;
    else if (memoryGrowth > 300) chaosScore -= 15;
    else if (memoryGrowth > 100) chaosScore -= 5;
    
    // 内存尖峰评分
    if (this.metrics.memorySpikes > 10) chaosScore -= 20;
    else if (this.metrics.memorySpikes > 5) chaosScore -= 10;
    
    if (chaosScore >= 90) {
      logger.info(`  🎉 🚀 完美！混乱测试得分 ${chaosScore}/100`);
      logger.info(`  🎉 🚀 系统在混乱场景下依然完美稳定！`);
    } else if (chaosScore >= 70) {
      logger.info(`  ✅ 良好！混乱测试得分 ${chaosScore}/100`);
      logger.info(`  ✅ 系统可以应对混乱场景`);
    } else {
      logger.warn(`  ⚠️  需要改进！混乱测试得分 ${chaosScore}/100`);
    }
    
    logger.info('═'.repeat(80));
    
    // 输出关键指标
    console.log('\n--- 关键指标 ---');
    console.log(`totalOperations:${this.metrics.totalOperations}`);
    console.log(`successfulOperations:${this.metrics.successfulOperations}`);
    console.log(`failedOperations:${this.metrics.failedOperations}`);
    console.log(`memorySpikes:${this.metrics.memorySpikes}`);
    console.log(`initialMemoryMB:${this.initialMemory.toFixed(2)}`);
    console.log(`maxMemoryMB:${this.maxMemory.toFixed(2)}`);
    console.log(`finalMemoryMB:${finalMemory.toFixed(2)}`);
    console.log(`memoryGrowthMB:${memoryGrowth.toFixed(2)}`);
    console.log(`chaosScore:${chaosScore}`);
  }
}

(async () => {
  const chaos = new ChaosEngineeringTest();
  await chaos.runChaosTest();
})().catch(error => {
  console.error('混乱测试执行异常:', error);
  process.exit(1);
});
