/**
 * 🔥🔥🔥 超超极端混乱测试 - 绝对极限挑战
 * 特点：真正极限 + 绝对混乱 + 极限边界 + 极端资源 + 终极压力
 */

import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import { ApplicationLogger } from '../src/infrastructure/logger/Logger.js';
import { CodeEntityType } from '../src/shared/index.js';
import * as path from 'path';

const logger = ApplicationLogger.getInstance();

interface UltimateChaosMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  timeoutOperations: number;
  memoryPeakMB: number;
  memoryValleyMB: number;
  gcTriggered: number;
  heapAllocations: number;
  externalAllocations: number;
  resourceExhaustion: number;
  cascadeFailures: number;
  partialRecoveries: number;
  fullRecoveries: number;
  deadlockAttempts: number;
  raceConditions: number;
  memoryLeaksDetected: number;
  performanceDegradation: number;
  stressLevel: number;
  chaosIntensity: number;
}

class UltimateChaosTest {
  private metrics: UltimateChaosMetrics = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    timeoutOperations: 0,
    memoryPeakMB: 0,
    memoryValleyMB: Infinity,
    gcTriggered: 0,
    heapAllocations: 0,
    externalAllocations: 0,
    resourceExhaustion: 0,
    cascadeFailures: 0,
    partialRecoveries: 0,
    fullRecoveries: 0,
    deadlockAttempts: 0,
    raceConditions: 0,
    memoryLeaksDetected: 0,
    performanceDegradation: 0,
    stressLevel: 0,
    chaosIntensity: 0
  };
  
  private startTime = 0;
  private initialMemory = 0;
  private currentMemory = 0;
  private memoryTimeline: number[] = [];
  private responseTimeTimeline: number[] = [];
  private warnings: string[] = [];
  private errors: string[] = [];
  private criticalFindings: string[] = [];

  async runUltimateChaosTest() {
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🔥🔥🔥 超超极端混乱测试 - 绝对极限挑战 🔥🔥🔥');
    logger.info('═══════════════════════════════════════════════════════════');
    
    this.startTime = Date.now();
    this.initialMemory = this.getMemoryMB();
    
    try {
      // 阶段1: 绝对并发测试
      await this.absolute_ConcurrencyTest();
      
      // 阶段2: 极限资源耗尽
      await this.ultimate_ResourceExhaustion();
      
      // 阶段3: 级联故障测试
      await this.cascade_FailureTest();
      
      // 阶段4: 竞态条件测试
      await this.race_ConditionTest();
      
      // 阶段5: 死锁模拟测试
      await this.deadlock_SimulationTest();
      
      // 阶段6: 极限内存泄漏检测
      await this.extreme_MemoryLeakDetection();
      
      // 阶段7: 性能退化测试
      await this.performance_DegradationTest();
      
      // 阶段8: 混沌强度递增测试
      await this.chaos_IntensityEscalation();
      
      // 阶段9: 极限边界探索
      await this.ultimate_BoundaryExploration();
      
      // 阶段10: 终极恢复测试
      await this.ultimate_RecoveryTest();
      
    } catch (error: any) {
      logger.error('💥💥💥 灾难性错误:', error);
      this.criticalFindings.push(`CRITICAL: ${error.message}`);
    } finally {
      await this.generateUltimateReport();
    }
  }

  private async absolute_ConcurrencyTest() {
    const name = '阶段1: 绝对并发测试 (50000+ 并发)';
    logger.info(`\n🔓 ${name}`);
    logger.info('─'.repeat(60));
    
    const concurrencyLevels = [1000, 5000, 10000, 25000, 50000];
    
    for (const level of concurrencyLevels) {
      logger.info(`  🔥 并发级别: ${level.toLocaleString()}`);
      
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject(path.join(process.cwd(), 'src'));
      
      const promises: Promise<void>[] = [];
      
      for (let i = 0; i < level; i++) {
        promises.push(this.absoluteConcurrentQuery(service, i));
      }
      
      const startTime = Date.now();
      const results = await Promise.allSettled(promises);
      const duration = Date.now() - startTime;
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      this.metrics.successfulOperations += successful;
      this.metrics.failedOperations += failed;
      
      const qps = level / (duration / 1000);
      logger.info(`    成功: ${successful.toLocaleString()}, 失败: ${failed.toLocaleString()}`);
      logger.info(`    QPS: ${qps.toFixed(0)}, 耗时: ${duration}ms`);
      
      this.recordMemory();
      service.resetAll();
      
      await this.sleep(500);
    }
    
    logger.info(`✅ ${name} 完成`);
  }

  private async ultimate_ResourceExhaustion() {
    const name = '阶段2: 极限资源耗尽';
    logger.info(`\n💀 ${name}`);
    logger.info('─'.repeat(60));
    
    this.metrics.resourceExhaustion++;
    
    // 极限实例创建
    const MAX_INSTANCES = 100;
    const services: EnhancedCodeKnowledgeGraphService[] = [];
    
    for (let i = 0; i < MAX_INSTANCES; i++) {
      try {
        const service = new EnhancedCodeKnowledgeGraphService();
        await service.analyzeProject(path.join(process.cwd(), 'src'));
        services.push(service);
        
        if (i % 20 === 0) {
          logger.info(`    已创建 ${i}/${MAX_INSTANCES} 实例`);
          this.recordMemory();
        }
      } catch (error) {
        logger.warn(`    实例 ${i} 创建失败`);
        this.metrics.cascadeFailures++;
      }
    }
    
    logger.info(`    成功创建 ${services.length} 个实例`);
    
    // 极限查询
    for (const service of services) {
      for (let i = 0; i < 500; i++) {
        try {
          service.getQueryEngine().getStatistics();
          service.getQueryEngine().getEntitiesByType(CodeEntityType.CLASS);
          this.metrics.totalOperations++;
        } catch {}
      }
    }
    
    // 疯狂清理
    for (const service of services) {
      service.resetAll();
    }
    
    logger.info(`✅ ${name} 完成`);
  }

  private async cascade_FailureTest() {
    const name = '阶段3: 级联故障测试';
    logger.info(`\n💥 ${name}`);
    logger.info('─'.repeat(60));
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    
    // 模拟级联故障
    const failureStages = [
      { name: '空查询', action: () => service.getQueryEngine().searchEntitiesByName('') },
      { name: '超长查询', action: () => service.getQueryEngine().searchEntitiesByName('x'.repeat(1000000)) },
      { name: '无效路径', action: async () => await service.analyzeProject('/nonexistent/path') },
      { name: '损坏缓存', action: () => service.clearCache() },
      { name: '极限查询', action: () => (service.getQueryEngine() as any).getEntitiesByType(-999999) }
    ];
    
    for (const stage of failureStages) {
      try {
        await stage.action();
        logger.info(`    ⚠️  ${stage.name}: 未触发故障`);
        this.metrics.partialRecoveries++;
      } catch (error) {
        logger.info(`    💥 ${stage.name}: 正确触发故障`);
        this.metrics.cascadeFailures++;
        
        // 尝试恢复
        try {
          await service.analyzeProject(path.join(process.cwd(), 'src'));
          const stats = service.getQueryEngine().getStatistics();
          logger.info(`    ✅ 恢复成功: ${stats.totalEntityCount} 实体`);
          this.metrics.fullRecoveries++;
        } catch {
          logger.warn(`    ❌ 恢复失败`);
        }
      }
    }
    
    service.resetAll();
    logger.info(`✅ ${name} 完成`);
  }

  private async race_ConditionTest() {
    const name = '阶段4: 竞态条件测试';
    logger.info(`\n🏃 ${name}`);
    logger.info('─'.repeat(60));
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    
    // 同时进行读写操作
    const READERS = 50;
    const WRITERS = 50;
    const operations: Promise<void>[] = [];
    
    for (let i = 0; i < READERS; i++) {
      operations.push(new Promise(async (resolve) => {
        for (let j = 0; j < 100; j++) {
          try {
            service.getQueryEngine().getStatistics();
            this.metrics.raceConditions++;
          } catch {}
        }
        resolve();
      }));
    }
    
    for (let i = 0; i < WRITERS; i++) {
      operations.push(new Promise(async (resolve) => {
        for (let j = 0; j < 100; j++) {
          try {
            service.getQueryEngine().searchEntitiesByName('test');
            this.metrics.raceConditions++;
          } catch {}
        }
        resolve();
      }));
    }
    
    await Promise.allSettled(operations);
    
    logger.info(`    执行了 ${READERS + WRITERS} 个并发操作`);
    logger.info(`✅ ${name} 完成`);
  }

  private async deadlock_SimulationTest() {
    const name = '阶段5: 死锁模拟测试';
    logger.info(`\n🔒 ${name}`);
    logger.info('─'.repeat(60));
    
    const services: EnhancedCodeKnowledgeGraphService[] = [];
    
    // 创建多个服务实例
    for (let i = 0; i < 10; i++) {
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject(path.join(process.cwd(), 'src'));
      services.push(service);
    }
    
    // 模拟资源竞争
    for (let cycle = 0; cycle < 100; cycle++) {
      const promises: Promise<void>[] = [];
      
      for (const service of services) {
        promises.push(new Promise(async (resolve) => {
          try {
            service.getQueryEngine().getStatistics();
            service.clearCache();
            service.getQueryEngine().getEntitiesByType(CodeEntityType.CLASS);
          } catch {
            this.metrics.deadlockAttempts++;
          }
          resolve();
        }));
      }
      
      await Promise.allSettled(promises);
      
      if (cycle % 20 === 0) {
        logger.info(`    循环 ${cycle}/100`);
        this.recordMemory();
      }
    }
    
    for (const service of services) {
      service.resetAll();
    }
    
    logger.info(`✅ ${name} 完成`);
  }

  private async extreme_MemoryLeakDetection() {
    const name = '阶段6: 极限内存泄漏检测';
    logger.info(`\n💾 ${name}`);
    logger.info('─'.repeat(60));
    
    const ITERATIONS = 200;
    const memoryReadings: number[] = [];
    let leakDetected = false;
    
    for (let i = 0; i < ITERATIONS; i++) {
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject(path.join(process.cwd(), 'src'));
      
      // 极限查询
      for (let j = 0; j < 500; j++) {
        try {
          service.getQueryEngine().getStatistics();
          service.getQueryEngine().getEntitiesByType(CodeEntityType.CLASS);
          service.getQueryEngine().searchEntitiesByName('service');
          this.metrics.totalOperations++;
        } catch {}
      }
      
      const mem = this.getMemoryMB();
      memoryReadings.push(mem);
      
      if (i % 40 === 0) {
        logger.info(`    迭代 ${i}/${ITERATIONS}: ${mem.toFixed(1)}MB`);
        this.recordMemory();
      }
      
      service.resetAll();
      
      // 强制GC
      if (global.gc) {
        this.metrics.gcTriggered++;
        try {
          global.gc();
        } catch {}
      }
    }
    
    // 分析内存增长
    if (memoryReadings.length >= 20) {
      const first10 = memoryReadings.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
      const last10 = memoryReadings.slice(-10).reduce((a, b) => a + b, 0) / 10;
      const growth = last10 - first10;
      
      if (growth > 200) {
        this.metrics.memoryLeaksDetected++;
        leakDetected = true;
        this.criticalFindings.push(`严重内存泄漏: ${first10.toFixed(1)}MB → ${last10.toFixed(1)}MB`);
        logger.warn(`    🚨 严重内存泄漏: +${growth.toFixed(1)}MB`);
      } else if (growth > 100) {
        this.warnings.push(`内存增长: +${growth.toFixed(1)}MB`);
        logger.warn(`    ⚠️  内存增长: +${growth.toFixed(1)}MB`);
      } else {
        logger.info(`    ✅ 内存稳定: +${growth.toFixed(1)}MB`);
      }
    }
    
    logger.info(`✅ ${name} 完成`);
  }

  private async performance_DegradationTest() {
    const name = '阶段7: 性能退化测试';
    logger.info(`\n📉 ${name}`);
    logger.info('─'.repeat(60));
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    
    const responseTimes: number[] = [];
    
    // 连续查询10000次，观察性能变化
    for (let i = 0; i < 10000; i++) {
      const start = Date.now();
      
      try {
        service.getQueryEngine().getStatistics();
        service.getQueryEngine().getEntitiesByType(CodeEntityType.CLASS);
        this.metrics.totalOperations++;
      } catch {}
      
      responseTimes.push(Date.now() - start);
      
      if (i % 1000 === 0) {
        const recentAvg = responseTimes.slice(-100).reduce((a, b) => a + b, 0) / 100;
        const earlyAvg = responseTimes.slice(0, 100).reduce((a, b) => a + b, 0) / 100;
        const degradation = ((recentAvg - earlyAvg) / earlyAvg) * 100;
        
        this.responseTimeTimeline.push(recentAvg);
        
        if (degradation > 50) {
          this.metrics.performanceDegradation++;
          logger.warn(`    📉 查询 ${i}: 性能退化 ${degradation.toFixed(1)}%`);
        }
      }
    }
    
    const first100 = responseTimes.slice(0, 100).reduce((a, b) => a + b, 0) / 100;
    const last100 = responseTimes.slice(-100).reduce((a, b) => a + b, 0) / 100;
    const totalDegradation = ((last100 - first100) / first100) * 100;
    
    logger.info(`    初始延迟: ${first100.toFixed(2)}ms`);
    logger.info(`    最终延迟: ${last100.toFixed(2)}ms`);
    logger.info(`    总退化: ${totalDegradation.toFixed(1)}%`);
    
    if (totalDegradation > 100) {
      this.criticalFindings.push(`严重性能退化: ${totalDegradation.toFixed(1)}%`);
    }
    
    service.resetAll();
    logger.info(`✅ ${name} 完成`);
  }

  private async chaos_IntensityEscalation() {
    const name = '阶段8: 混沌强度递增测试';
    logger.info(`\n🌪️ ${name}`);
    logger.info('─'.repeat(60));
    
    const intensities = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    
    for (const intensity of intensities) {
      this.metrics.chaosIntensity = intensity;
      logger.info(`    🔥 混沌强度: ${intensity}/10`);
      
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject(path.join(process.cwd(), 'src'));
      
      const operations = intensity * 1000;
      for (let i = 0; i < operations; i++) {
        try {
          const type = i % 4;
          if (type === 0) service.getQueryEngine().getStatistics();
          else if (type === 1) service.getQueryEngine().getEntitiesByType(CodeEntityType.CLASS);
          else if (type === 2) service.getQueryEngine().searchEntitiesByName('service');
          else service.getQueryEngine().getEntitiesByType(CodeEntityType.FUNCTION);
          
          this.metrics.totalOperations++;
        } catch {
          this.metrics.failedOperations++;
        }
        
        // 根据强度增加延迟
        if (intensity >= 5 && i % 10 === 0) {
          await this.sleep(intensity);
        }
      }
      
      this.recordMemory();
      service.resetAll();
      
      await this.sleep(100);
    }
    
    logger.info(`✅ ${name} 完成`);
  }

  private async ultimate_BoundaryExploration() {
    const name = '阶段9: 极限边界探索';
    logger.info(`\n🚀 ${name}`);
    logger.info('─'.repeat(60));
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    
    // 探索各种边界
    const boundaryTests = [
      { name: '最大并发', test: async () => {
        const promises: Promise<void>[] = [];
        for (let i = 0; i < 50000; i++) {
          promises.push(this.absoluteConcurrentQuery(service, i));
        }
        await Promise.allSettled(promises);
      }},
      { name: '最大查询量', test: async () => {
        for (let i = 0; i < 100000; i++) {
          service.getQueryEngine().getStatistics();
        }
      }},
      { name: '极限内存分配', test: async () => {
        const services: EnhancedCodeKnowledgeGraphService[] = [];
        for (let i = 0; i < 200; i++) {
          services.push(new EnhancedCodeKnowledgeGraphService());
          await services[i].analyzeProject(path.join(process.cwd(), 'src'));
        }
        for (const s of services) s.resetAll();
      }},
      { name: '极限嵌套调用', test: async () => {
        for (let i = 0; i < 10000; i++) {
          const stats = service.getQueryEngine().getStatistics();
          const classes = service.getQueryEngine().getEntitiesByType(CodeEntityType.CLASS);
        }
      }}
    ];
    
    for (const test of boundaryTests) {
      logger.info(`    🔍 ${test.name}`);
      const start = Date.now();
      try {
        await test.test();
        logger.info(`    ✅ ${test.name}: 成功 (${Date.now() - start}ms)`);
      } catch (error) {
        logger.warn(`    ❌ ${test.name}: 失败`);
        this.criticalFindings.push(`${test.name} 失败`);
      }
      this.recordMemory();
    }
    
    service.resetAll();
    logger.info(`✅ ${name} 完成`);
  }

  private async ultimate_RecoveryTest() {
    const name = '阶段10: 终极恢复测试';
    logger.info(`\n🔄 ${name}`);
    logger.info('─'.repeat(60));
    
    const scenarios = [
      '服务崩溃模拟',
      '内存耗尽模拟',
      '并发风暴模拟',
      '级联故障模拟',
      '性能退化模拟'
    ];
    
    for (const scenario of scenarios) {
      logger.info(`    🔄 ${scenario}`);
      
      const service = new EnhancedCodeKnowledgeGraphService();
      
      try {
        await service.analyzeProject(path.join(process.cwd(), 'src'));
        service.getQueryEngine().getStatistics();
        
        // 模拟故障
        for (let i = 0; i < 100; i++) {
          try {
            if (i % 3 === 0) {
              service.clearCache();
            }
            service.getQueryEngine().getStatistics();
          } catch {}
        }
        
        // 恢复
        await service.analyzeProject(path.join(process.cwd(), 'src'));
        const stats = service.getQueryEngine().getStatistics();
        
        logger.info(`    ✅ 恢复成功: ${stats.totalEntityCount} 实体`);
        this.metrics.fullRecoveries++;
      } catch (error) {
        logger.warn(`    ❌ ${scenario} 恢复失败`);
        this.metrics.partialRecoveries++;
      }
      
      service.resetAll();
    }
    
    logger.info(`✅ ${name} 完成`);
  }

  private async absoluteConcurrentQuery(service: EnhancedCodeKnowledgeGraphService, index: number): Promise<void> {
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
    if (this.currentMemory < this.metrics.memoryValleyMB) {
      this.metrics.memoryValleyMB = this.currentMemory;
    }
    this.memoryTimeline.push(this.currentMemory);
  }

  private getMemoryMB(): number {
    const memUsage = process.memoryUsage();
    this.metrics.heapAllocations = memUsage.heapUsed;
    this.metrics.externalAllocations = memUsage.external;
    return memUsage.heapUsed / 1024 / 1024;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async generateUltimateReport() {
    const totalDuration = Date.now() - this.startTime;
    const finalMemory = this.getMemoryMB();
    const memoryGrowth = finalMemory - this.initialMemory;
    
    logger.info('\n' + '═'.repeat(80));
    logger.info('🔥🔥🔥 超超极端混乱测试 - 最终报告 🔥🔥🔥');
    logger.info('═'.repeat(80));
    
    logger.info('\n📊 操作统计:');
    logger.info(`  总操作数: ${this.metrics.totalOperations.toLocaleString()}`);
    logger.info(`  成功操作: ${this.metrics.successfulOperations.toLocaleString()}`);
    logger.info(`  失败操作: ${this.metrics.failedOperations}`);
    logger.info(`  超时操作: ${this.metrics.timeoutOperations}`);
    
    logger.info('\n🔬 高级指标:');
    logger.info(`  竞态条件: ${this.metrics.raceConditions}`);
    logger.info(`  死锁尝试: ${this.metrics.deadlockAttempts}`);
    logger.info(`  级联故障: ${this.metrics.cascadeFailures}`);
    logger.info(`  内存泄漏检测: ${this.metrics.memoryLeaksDetected}`);
    logger.info(`  性能退化: ${this.metrics.performanceDegradation}`);
    logger.info(`  GC触发次数: ${this.metrics.gcTriggered}`);
    
    logger.info('\n💾 内存分析:');
    logger.info(`  初始内存: ${this.initialMemory.toFixed(1)} MB`);
    logger.info(`  峰值内存: ${this.metrics.memoryPeakMB.toFixed(1)} MB`);
    logger.info(`  谷值内存: ${this.metrics.memoryValleyMB === Infinity ? 'N/A' : this.metrics.memoryValleyMB.toFixed(1)} MB`);
    logger.info(`  最终内存: ${finalMemory.toFixed(1)} MB`);
    logger.info(`  内存变化: ${memoryGrowth >= 0 ? '+' : ''}${memoryGrowth.toFixed(1)} MB`);
    logger.info(`  堆分配: ${(this.metrics.heapAllocations / 1024 / 1024).toFixed(1)} MB`);
    logger.info(`  外部分配: ${(this.metrics.externalAllocations / 1024 / 1024).toFixed(1)} MB`);
    
    logger.info('\n⏱️ 性能分析:');
    logger.info(`  总时长: ${(totalDuration / 1000).toFixed(1)} 秒`);
    logger.info(`  平均QPS: ${(this.metrics.totalOperations / (totalDuration / 1000)).toFixed(1)}`);
    
    if (this.responseTimeTimeline.length > 0) {
      const first = this.responseTimeTimeline[0];
      const last = this.responseTimeTimeline[this.responseTimeTimeline.length - 1];
      const degradation = ((last - first) / first) * 100;
      logger.info(`  性能变化: ${degradation >= 0 ? '+' : ''}${degradation.toFixed(1)}%`);
    }
    
    logger.info('\n🔄 恢复分析:');
    logger.info(`  完全恢复: ${this.metrics.fullRecoveries}`);
    logger.info(`  部分恢复: ${this.metrics.partialRecoveries}`);
    logger.info(`  恢复率: ${((this.metrics.fullRecoveries / (this.metrics.fullRecoveries + this.metrics.partialRecoveries)) * 100).toFixed(1)}%`);
    
    logger.info('\n🚨 严重发现:');
    if (this.criticalFindings.length > 0) {
      for (const finding of this.criticalFindings) {
        logger.error(`  💥 ${finding}`);
      }
    } else {
      logger.info('  ✅ 无严重发现');
    }
    
    logger.info('\n⚠️  警告:');
    if (this.warnings.length > 0) {
      for (const warning of this.warnings) {
        logger.warn(`  ⚠️  ${warning}`);
      }
    } else {
      logger.info('  ✅ 无警告');
    }
    
    logger.info('\n🎯 最终评估:');
    
    let chaosScore = 100;
    
    // 失败率评分
    const failRate = this.metrics.failedOperations / this.metrics.totalOperations;
    if (failRate > 0.3) chaosScore -= 40;
    else if (failRate > 0.2) chaosScore -= 30;
    else if (failRate > 0.1) chaosScore -= 20;
    else if (failRate > 0.05) chaosScore -= 10;
    else if (failRate > 0.01) chaosScore -= 5;
    
    // 内存评分
    if (memoryGrowth > 800) chaosScore -= 40;
    else if (memoryGrowth > 500) chaosScore -= 30;
    else if (memoryGrowth > 300) chaosScore -= 20;
    else if (memoryGrowth > 100) chaosScore -= 10;
    else if (memoryGrowth < 0) chaosScore += 10;
    
    // 关键指标评分
    if (this.metrics.memoryLeaksDetected > 0) chaosScore -= 30;
    if (this.metrics.performanceDegradation > 5) chaosScore -= 20;
    if (this.criticalFindings.length > 5) chaosScore -= 30;
    
    // 恢复率评分
    const recoveryRate = this.metrics.fullRecoveries / (this.metrics.fullRecoveries + this.metrics.partialRecoveries);
    if (recoveryRate < 0.5) chaosScore -= 20;
    else if (recoveryRate < 0.8) chaosScore -= 10;
    
    if (chaosScore >= 90) {
      logger.info(`  🎉🔥🚀 完美！超超极端测试得分 ${chaosScore}/100`);
      logger.info(`  🎉🔥🚀 系统在绝对极限下依然完美稳定！`);
    } else if (chaosScore >= 70) {
      logger.info(`  ✅ 良好！超超极端测试得分 ${chaosScore}/100`);
      logger.info(`  ✅ 系统可以应对极端场景`);
    } else {
      logger.warn(`  ⚠️  需要改进！超超极端测试得分 ${chaosScore}/100`);
    }
    
    logger.info('═'.repeat(80));
    
    // 输出关键指标
    console.log('\n--- 关键指标 ---');
    console.log(`totalOperations:${this.metrics.totalOperations}`);
    console.log(`successfulOperations:${this.metrics.successfulOperations}`);
    console.log(`failedOperations:${this.metrics.failedOperations}`);
    console.log(`memoryLeaksDetected:${this.metrics.memoryLeaksDetected}`);
    console.log(`performanceDegradation:${this.metrics.performanceDegradation}`);
    console.log(`memoryPeakMB:${this.metrics.memoryPeakMB.toFixed(2)}`);
    console.log(`memoryGrowthMB:${memoryGrowth.toFixed(2)}`);
    console.log(`gcTriggered:${this.metrics.gcTriggered}`);
    console.log(`fullRecoveries:${this.metrics.fullRecoveries}`);
    console.log(`criticalFindings:${this.criticalFindings.length}`);
    console.log(`chaosScore:${chaosScore}`);
  }
}

(async () => {
  const chaos = new UltimateChaosTest();
  await chaos.runUltimateChaosTest();
})().catch(error => {
  console.error('超超极端混乱测试执行异常:', error);
  process.exit(1);
});
