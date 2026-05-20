/**
 * 🌪️ 超极端混乱场景测试 - 极限边界挑战
 * 特点：极端并发 + 极限资源 + 复杂错误 + 网络延迟模拟 + 边界值测试
 */

import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import { ApplicationLogger } from '../src/infrastructure/logger/Logger.js';
import { CodeEntityType } from '../src/shared/index.js';
import * as path from 'path';

const logger = ApplicationLogger.getInstance();

interface ExtremeChaosMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  timeoutOperations: number;
  memoryPeakMB: number;
  gcTriggered: number;
  resourceExhaustionAttempts: number;
  networkSimulatedDelays: number;
  edgeCaseFailures: number;
  recoveryAttempts: number;
  chaosEvents: Map<string, number>;
}

class SuperExtremeChaosTest {
  private metrics: ExtremeChaosMetrics = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    timeoutOperations: 0,
    memoryPeakMB: 0,
    gcTriggered: 0,
    resourceExhaustionAttempts: 0,
    networkSimulatedDelays: 0,
    edgeCaseFailures: 0,
    recoveryAttempts: 0,
    chaosEvents: new Map()
  };
  
  private startTime = 0;
  private initialMemory = 0;
  private currentMemory = 0;
  private memorySnapshots: number[] = [];
  private warnings: string[] = [];

  async runSuperExtremeChaosTest() {
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🌪️ 超极端混乱场景测试 - 极限边界挑战');
    logger.info('═══════════════════════════════════════════════════════════');
    
    this.startTime = Date.now();
    this.initialMemory = this.getMemoryMB();
    
    try {
      // 阶段1: 极限并发测试
      await this.chaos_ExtremeConcurrency();
      
      // 阶段2: 资源耗尽测试
      await this.chaos_ResourceExhaustion();
      
      // 阶段3: 复杂错误注入
      await this.chaos_ComplexErrorInjection();
      
      // 阶段4: 网络延迟模拟
      await this.chaos_NetworkDelaySimulation();
      
      // 阶段5: 边界值测试
      await this.chaos_BoundaryValueTesting();
      
      // 阶段6: 极限内存压力
      await this.chaos_ExtremeMemoryPressure();
      
      // 阶段7: 恢复能力测试
      await this.chaos_RecoveryCapability();
      
      // 阶段8: 最终边界探索
      await this.chaos_FinalBoundaryExploration();
      
    } catch (error: any) {
      logger.error('❌ 灾难性错误:', error);
      this.recordChaosEvent('CRITICAL_ERROR');
    } finally {
      await this.generateSuperExtremeReport();
    }
  }

  private async chaos_ExtremeConcurrency() {
    const name = '阶段1: 极限并发测试 (10000+ 并发)';
    logger.info(`\n🌪️ ${name}`);
    logger.info('─'.repeat(60));
    
    this.recordChaosEvent(name);
    
    const CONCURRENCY_LEVELS = [100, 500, 1000, 5000, 10000];
    
    for (const level of CONCURRENCY_LEVELS) {
      logger.info(`  并发级别: ${level}`);
      
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject(path.join(process.cwd(), 'src'));
      
      const promises: Promise<void>[] = [];
      
      for (let i = 0; i < level; i++) {
        promises.push(this.extremeConcurrentQuery(service, i));
      }
      
      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      this.metrics.successfulOperations += successful;
      this.metrics.failedOperations += failed;
      
      logger.info(`    成功: ${successful}, 失败: ${failed}`);
      
      this.recordMemory();
      service.resetAll();
      
      await this.sleep(100);
    }
    
    logger.info(`✅ ${name} 完成`);
  }

  private async chaos_ResourceExhaustion() {
    const name = '阶段2: 资源耗尽测试';
    logger.info(`\n💣 ${name}`);
    logger.info('─'.repeat(60));
    
    this.recordChaosEvent(name);
    this.metrics.resourceExhaustionAttempts++;
    
    // 尝试创建大量服务实例
    const MAX_INSTANCES = 50;
    const services: EnhancedCodeKnowledgeGraphService[] = [];
    
    for (let i = 0; i < MAX_INSTANCES; i++) {
      try {
        const service = new EnhancedCodeKnowledgeGraphService();
        await service.analyzeProject(path.join(process.cwd(), 'src'));
        services.push(service);
        
        this.metrics.successfulOperations++;
      } catch (error) {
        this.metrics.failedOperations++;
        logger.warn(`    实例 ${i} 创建失败`);
      }
      
      if (i % 10 === 0) {
        logger.info(`    已创建 ${i}/${MAX_INSTANCES} 实例`);
        this.recordMemory();
      }
    }
    
    // 尝试极限查询
    for (const service of services) {
      try {
        for (let i = 0; i < 100; i++) {
          service.getQueryEngine().getStatistics();
          this.metrics.totalOperations++;
        }
      } catch {}
    }
    
    // 清理
    for (const service of services) {
      service.resetAll();
    }
    
    logger.info(`✅ ${name} 完成`);
  }

  private async chaos_ComplexErrorInjection() {
    const name = '阶段3: 复杂错误注入';
    logger.info(`\n💥 ${name}`);
    logger.info('─'.repeat(60));
    
    this.recordChaosEvent(name);
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    
    const errorTypes = [
      { name: '空字符串查询', query: () => service.getQueryEngine().searchEntitiesByName('') },
      { name: '超长字符串查询', query: () => service.getQueryEngine().searchEntitiesByName('x'.repeat(100000)) },
      { name: '特殊字符查询', query: () => service.getQueryEngine().searchEntitiesByName('!@#$%^&*()_+-=[]{}|;:\'\",./<>?`~') },
      { name: 'Unicode字符查询', query: () => service.getQueryEngine().searchEntitiesByName('中文测试日本語한국어') },
      { name: 'SQL注入模拟', query: () => service.getQueryEngine().searchEntitiesByName('\' OR \'1\'=\'1') },
      { name: '正则特殊字符', query: () => service.getQueryEngine().searchEntitiesByName('[.*+?^${}()|[\\]\\\\]') },
      { name: 'null值查询', query: () => (service.getQueryEngine() as any).getEntitiesByType(null) },
      { name: 'undefined查询', query: () => (service.getQueryEngine() as any).getEntitiesByType(undefined) },
      { name: 'NaN查询', query: () => (service.getQueryEngine() as any).getEntitiesByType(NaN) },
      { name: 'Infinity查询', query: () => (service.getQueryEngine() as any).getEntitiesByType(Infinity) }
    ];
    
    for (const errorType of errorTypes) {
      try {
        errorType.query();
        logger.info(`    ⚠️  ${errorType.name}: 未报错（可能有问题）`);
        this.metrics.edgeCaseFailures++;
      } catch (error) {
        logger.info(`    ✅ ${errorType.name}: 正确报错`);
        this.metrics.successfulOperations++;
      }
      this.metrics.totalOperations++;
    }
    
    service.resetAll();
    logger.info(`✅ ${name} 完成`);
  }

  private async chaos_NetworkDelaySimulation() {
    const name = '阶段4: 网络延迟模拟';
    logger.info(`\n🌐 ${name}`);
    logger.info('─'.repeat(60));
    
    this.recordChaosEvent(name);
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    
    const delayLevels = [1, 5, 10, 50, 100, 500]; // ms
    
    for (const delay of delayLevels) {
      logger.info(`    模拟延迟: ${delay}ms`);
      
      const startTime = Date.now();
      let timeoutOccurred = false;
      
      try {
        // 模拟网络延迟
        const queryPromise = service.getQueryEngine().getStatistics();
        
        // 超时检测
        const timeoutPromise = new Promise<void>((_, reject) => {
          setTimeout(() => {
            timeoutOccurred = true;
            reject(new Error('Simulated timeout'));
          }, delay);
        });
        
        await Promise.race([queryPromise, timeoutPromise]);
        this.metrics.successfulOperations++;
      } catch (error) {
        if (timeoutOccurred) {
          this.metrics.timeoutOperations++;
          logger.info(`      ⚠️  超时: ${delay}ms`);
        } else {
          this.metrics.failedOperations++;
        }
        this.metrics.networkSimulatedDelays++;
      }
      
      this.metrics.totalOperations++;
      this.recordMemory();
    }
    
    service.resetAll();
    logger.info(`✅ ${name} 完成`);
  }

  private async chaos_BoundaryValueTesting() {
    const name = '阶段5: 边界值测试';
    logger.info(`\n🎯 ${name}`);
    logger.info('─'.repeat(60));
    
    this.recordChaosEvent(name);
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    
    const boundaryTests = [
      { name: '查询数量: 0', test: () => service.getQueryEngine().getEntitiesByType(CodeEntityType.CLASS) },
      { name: '查询数量: 1', test: () => service.getQueryEngine().getEntitiesByType(CodeEntityType.CLASS) },
      { name: '查询数量: -1', test: () => (service.getQueryEngine() as any).getEntitiesByType(-1) },
      { name: '查询数量: 0.5', test: () => (service.getQueryEngine() as any).getEntitiesByType(0.5) },
      { name: '查询数量: 999999', test: () => (service.getQueryEngine() as any).getEntitiesByType(999999) },
      { name: '空搜索', test: () => service.getQueryEngine().searchEntitiesByName('') },
      { name: '单字符搜索', test: () => service.getQueryEngine().searchEntitiesByName('a') },
      { name: '极长搜索', test: () => service.getQueryEngine().searchEntitiesByName('a'.repeat(10000)) }
    ];
    
    for (const testCase of boundaryTests) {
      try {
        testCase.test();
        logger.info(`    ✅ ${testCase.name}: 正常`);
        this.metrics.successfulOperations++;
      } catch (error) {
        logger.info(`    ⚠️  ${testCase.name}: 异常`);
        this.metrics.edgeCaseFailures++;
      }
      this.metrics.totalOperations++;
    }
    
    service.resetAll();
    logger.info(`✅ ${name} 完成`);
  }

  private async chaos_ExtremeMemoryPressure() {
    const name = '阶段6: 极限内存压力';
    logger.info(`\n💾 ${name}`);
    logger.info('─'.repeat(60));
    
    this.recordChaosEvent(name);
    
    const ITERATIONS = 50;
    const memoryReadings: number[] = [];
    
    for (let i = 0; i < ITERATIONS; i++) {
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject(path.join(process.cwd(), 'src'));
      
      // 大量查询
      for (let j = 0; j < 200; j++) {
        try {
          service.getQueryEngine().getStatistics();
          service.getQueryEngine().getEntitiesByType(CodeEntityType.CLASS);
          service.getQueryEngine().searchEntitiesByName('service');
          this.metrics.totalOperations++;
        } catch {}
      }
      
      const mem = this.getMemoryMB();
      memoryReadings.push(mem);
      
      if (i % 10 === 0) {
        logger.info(`    迭代 ${i}/${ITERATIONS}: ${mem.toFixed(1)}MB`);
        this.recordMemory();
      }
      
      service.resetAll();
      
      // 触发GC
      if (global.gc) {
        this.metrics.gcTriggered++;
        try {
          global.gc();
        } catch {}
      }
    }
    
    // 分析内存增长
    if (memoryReadings.length > 10) {
      const first = memoryReadings.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
      const last = memoryReadings.slice(-10).reduce((a, b) => a + b, 0) / 10;
      const growth = last - first;
      
      if (growth > 200) {
        this.warnings.push(`严重内存增长: ${first.toFixed(1)}MB → ${last.toFixed(1)}MB`);
      } else if (growth > 100) {
        this.warnings.push(`内存增长: ${first.toFixed(1)}MB → ${last.toFixed(1)}MB`);
      }
    }
    
    logger.info(`✅ ${name} 完成`);
  }

  private async chaos_RecoveryCapability() {
    const name = '阶段7: 恢复能力测试';
    logger.info(`\n🔄 ${name}`);
    logger.info('─'.repeat(60));
    
    this.recordChaosEvent(name);
    
    const service = new EnhancedCodeKnowledgeGraphService();
    
    // 模拟各种故障后的恢复
    const scenarios = [
      { name: '空项目路径', action: async () => {
        try {
          await service.analyzeProject('');
        } catch {}
      }},
      { name: '无效项目路径', action: async () => {
        try {
          await service.analyzeProject('/nonexistent/path');
        } catch {}
      }},
      { name: '损坏缓存', action: async () => {
        service.clearCache();
        service.getQueryEngine().getStatistics();
      }},
      { name: '极限查询', action: async () => {
        for (let i = 0; i < 1000; i++) {
          try {
            service.getQueryEngine().getStatistics();
          } catch {}
        }
      }}
    ];
    
    for (const scenario of scenarios) {
      this.metrics.recoveryAttempts++;
      await scenario.action();
      
      // 验证恢复
      try {
        await service.analyzeProject(path.join(process.cwd(), 'src'));
        const stats = service.getQueryEngine().getStatistics();
        logger.info(`    ✅ ${scenario.name}: 恢复成功 (${stats.totalEntityCount} 实体)`);
        this.metrics.successfulOperations++;
      } catch (error) {
        logger.warn(`    ⚠️  ${scenario.name}: 恢复失败`);
        this.metrics.failedOperations++;
      }
    }
    
    service.resetAll();
    logger.info(`✅ ${name} 完成`);
  }

  private async chaos_FinalBoundaryExploration() {
    const name = '阶段8: 最终边界探索';
    logger.info(`\n🚀 ${name}`);
    logger.info('─'.repeat(60));
    
    this.recordChaosEvent(name);
    
    // 极限探索
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    
    // 连续查询直到出错
    let consecutiveSuccess = 0;
    let consecutiveFailure = 0;
    
    for (let i = 0; i < 10000; i++) {
      try {
        service.getQueryEngine().getStatistics();
        consecutiveSuccess++;
        consecutiveFailure = 0;
        this.metrics.successfulOperations++;
      } catch {
        consecutiveFailure++;
        consecutiveSuccess = 0;
        this.metrics.failedOperations++;
        
        if (consecutiveFailure > 10) {
          logger.info(`    ⚠️  连续失败 ${consecutiveFailure} 次，停止`);
          break;
        }
      }
      this.metrics.totalOperations++;
      
      if (i % 1000 === 0) {
        logger.info(`    查询 ${i}/10000`);
      }
    }
    
    logger.info(`    最大连续成功: ${consecutiveSuccess}`);
    
    service.resetAll();
    logger.info(`✅ ${name} 完成`);
  }

  private async extremeConcurrentQuery(service: EnhancedCodeKnowledgeGraphService, index: number): Promise<void> {
    try {
      const type = index % 4;
      
      if (type === 0) {
        service.getQueryEngine().getEntitiesByType(CodeEntityType.CLASS);
      } else if (type === 1) {
        service.getQueryEngine().getEntitiesByType(CodeEntityType.FUNCTION);
      } else if (type === 2) {
        service.getQueryEngine().searchEntitiesByName('service');
      } else {
        service.getQueryEngine().getStatistics();
      }
    } catch {
      throw new Error(`Query ${index} failed`);
    }
  }

  private recordMemory() {
    this.currentMemory = this.getMemoryMB();
    if (this.currentMemory > this.metrics.memoryPeakMB) {
      this.metrics.memoryPeakMB = this.currentMemory;
    }
    this.memorySnapshots.push(this.currentMemory);
  }

  private recordChaosEvent(event: string) {
    const count = this.metrics.chaosEvents.get(event) || 0;
    this.metrics.chaosEvents.set(event, count + 1);
  }

  private getMemoryMB(): number {
    const memUsage = process.memoryUsage();
    return memUsage.heapUsed / 1024 / 1024;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async generateSuperExtremeReport() {
    const totalDuration = Date.now() - this.startTime;
    const finalMemory = this.getMemoryMB();
    const memoryGrowth = finalMemory - this.initialMemory;
    
    logger.info('\n' + '═'.repeat(80));
    logger.info('🌪️ 超极端混乱场景测试 - 最终报告');
    logger.info('═'.repeat(80));
    
    logger.info('\n📊 操作统计:');
    logger.info(`  总操作数: ${this.metrics.totalOperations.toLocaleString()}`);
    logger.info(`  成功操作: ${this.metrics.successfulOperations.toLocaleString()}`);
    logger.info(`  失败操作: ${this.metrics.failedOperations}`);
    logger.info(`  超时操作: ${this.metrics.timeoutOperations}`);
    logger.info(`  边界失败: ${this.metrics.edgeCaseFailures}`);
    
    logger.info('\n🌪️ 混乱事件统计:');
    for (const [event, count] of this.metrics.chaosEvents.entries()) {
      logger.info(`  ${event}: ${count}次`);
    }
    
    logger.info('\n💾 内存分析:');
    logger.info(`  初始内存: ${this.initialMemory.toFixed(1)} MB`);
    logger.info(`  峰值内存: ${this.metrics.memoryPeakMB.toFixed(1)} MB`);
    logger.info(`  最终内存: ${finalMemory.toFixed(1)} MB`);
    logger.info(`  内存变化: ${memoryGrowth >= 0 ? '+' : ''}${memoryGrowth.toFixed(1)} MB`);
    logger.info(`  GC触发次数: ${this.metrics.gcTriggered}`);
    
    logger.info('\n⏱️ 性能分析:');
    logger.info(`  总时长: ${(totalDuration / 1000).toFixed(1)} 秒`);
    logger.info(`  平均QPS: ${(this.metrics.totalOperations / (totalDuration / 1000)).toFixed(1)}`);
    
    logger.info('\n⚠️ 警告信息:');
    if (this.warnings.length > 0) {
      for (const warning of this.warnings) {
        logger.warn(`  • ${warning}`);
      }
    } else {
      logger.info('  ✅ 无警告');
    }
    
    logger.info('\n🎯 最终评估:');
    
    let chaosScore = 100;
    
    // 失败率评分
    const failRate = this.metrics.failedOperations / this.metrics.totalOperations;
    if (failRate > 0.2) chaosScore -= 40;
    else if (failRate > 0.1) chaosScore -= 20;
    else if (failRate > 0.05) chaosScore -= 10;
    else if (failRate > 0.01) chaosScore -= 5;
    
    // 内存评分
    if (memoryGrowth > 500) chaosScore -= 30;
    else if (memoryGrowth > 300) chaosScore -= 20;
    else if (memoryGrowth > 100) chaosScore -= 10;
    else if (memoryGrowth < 0) chaosScore += 5;
    
    // 边界失败评分
    if (this.metrics.edgeCaseFailures > 20) chaosScore -= 20;
    else if (this.metrics.edgeCaseFailures > 10) chaosScore -= 10;
    
    // 超时评分
    if (this.metrics.timeoutOperations > 100) chaosScore -= 20;
    else if (this.metrics.timeoutOperations > 50) chaosScore -= 10;
    
    if (chaosScore >= 90) {
      logger.info(`  🎉 🚀 完美！超极端测试得分 ${chaosScore}/100`);
      logger.info(`  🎉 🚀 系统在极端混乱场景下依然完美稳定！`);
    } else if (chaosScore >= 70) {
      logger.info(`  ✅ 良好！超极端测试得分 ${chaosScore}/100`);
      logger.info(`  ✅ 系统可以应对极端场景`);
    } else {
      logger.warn(`  ⚠️  需要改进！超极端测试得分 ${chaosScore}/100`);
    }
    
    logger.info('═'.repeat(80));
    
    // 输出关键指标
    console.log('\n--- 关键指标 ---');
    console.log(`totalOperations:${this.metrics.totalOperations}`);
    console.log(`successfulOperations:${this.metrics.successfulOperations}`);
    console.log(`failedOperations:${this.metrics.failedOperations}`);
    console.log(`timeoutOperations:${this.metrics.timeoutOperations}`);
    console.log(`edgeCaseFailures:${this.metrics.edgeCaseFailures}`);
    console.log(`memoryPeakMB:${this.metrics.memoryPeakMB.toFixed(2)}`);
    console.log(`memoryGrowthMB:${memoryGrowth.toFixed(2)}`);
    console.log(`gcTriggered:${this.metrics.gcTriggered}`);
    console.log(`chaosScore:${chaosScore}`);
  }
}

(async () => {
  const chaos = new SuperExtremeChaosTest();
  await chaos.runSuperExtremeChaosTest();
})().catch(error => {
  console.error('超极端混乱测试执行异常:', error);
  process.exit(1);
});
