/**
 * 深度观察性测试 - 微小变化检测
 * 原理：观察每一个微小变化，不放过任何异常
 */

import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import { ApplicationLogger } from '../src/infrastructure/logger/Logger.js';
import { CodeEntityType } from '../src/shared/index.js';
import * as path from 'path';

const logger = ApplicationLogger.getInstance();

interface MicroObservation {
  iteration: number;
  timestamp: number;
  memoryMB: number;
  memoryDelta: number;
  gcCount: number;
  cacheSize: number;
  queryTime: number;
  anomalyScore: number;
  notes: string;
}

class DeepObservationTest {
  private observations: MicroObservation[] = [];
  private baselineMemory: number = 0;
  private baselineCacheSize: number = 0;
  private gcTriggerCount: number = 0;
  private lastMemoryCheck: number = 0;
  private startTime: number = 0;
  private totalOperations: number = 0;

  async runDeepObservationTest() {
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🔬 深度观察性测试 - 微小变化检测');
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('原理：观察每一个微小变化，不放过任何异常');
    
    this.startTime = Date.now();
    
    try {
      await this.testMicroMemoryLeaks();
      await this.testMicroPerformanceChanges();
      await this.testCacheEfficiencyChanges();
      await this.testQueryTimePatterns();
      await this.testMemoryGrowthPatterns();
    } catch (error: any) {
      logger.error('❌ 深度观察测试遇到错误:', error);
    } finally {
      await this.generateObservationReport();
    }
  }

  private async testMicroMemoryLeaks() {
    logger.info('\n🔍 测试1: 微小内存泄漏检测');
    logger.info('─'.repeat(60));
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    const qe = service.getQueryEngine();
    
    this.baselineMemory = this.getMemoryMB();
    this.lastMemoryCheck = Date.now();
    
    const ITERATIONS = 100;
    let lastMemory = this.baselineMemory;
    let cumulativeGrowth = 0;
    
    logger.info(`  基线内存: ${this.baselineMemory.toFixed(2)} MB`);
    
    for (let i = 0; i < ITERATIONS; i++) {
      // 执行一组查询
      qe.getEntitiesByType(CodeEntityType.CLASS);
      qe.getStatistics();
      qe.searchEntitiesByName('service');
      this.totalOperations++;
      
      // 每10次检查一次内存
      if (i % 10 === 0) {
        const currentMemory = this.getMemoryMB();
        const memoryDelta = currentMemory - lastMemory;
        const iterationDelta = currentMemory - this.baselineMemory;
        
        cumulativeGrowth += memoryDelta;
        
        // 计算异常分数
        let anomalyScore = 0;
        let notes = '';
        
        // 如果单次增长超过5MB，标记异常
        if (memoryDelta > 5) {
          anomalyScore += 2;
          notes = `⚠️ 单次增长较大: +${memoryDelta.toFixed(2)}MB`;
        }
        
        // 如果累积增长超过基线的20%，标记警告
        if (iterationDelta > this.baselineMemory * 0.2) {
          anomalyScore += 3;
          notes = `🚨 累积增长超过20%: +${iterationDelta.toFixed(2)}MB`;
        }
        
        // 如果内存下降，可能是GC
        if (memoryDelta < -10) {
          anomalyScore -= 2;
          notes = `✅ GC触发，释放 ${Math.abs(memoryDelta).toFixed(2)}MB`;
          this.gcTriggerCount++;
        }
        
        const observation: MicroObservation = {
          iteration: i,
          timestamp: Date.now() - this.startTime,
          memoryMB: currentMemory,
          memoryDelta,
          gcCount: this.gcTriggerCount,
          cacheSize: qe.getCacheStats().size,
          queryTime: 0,
          anomalyScore,
          notes
        };
        
        this.observations.push(observation);
        
        if (i % 20 === 0) {
          logger.info(`  迭代 ${i.toString().padStart(3)}: ` +
                     `内存 ${currentMemory.toFixed(1)}MB ` +
                     `(Δ${memoryDelta >= 0 ? '+' : ''}${memoryDelta.toFixed(1)}) ` +
                     `${notes}`);
        }
        
        lastMemory = currentMemory;
        this.lastMemoryCheck = Date.now();
      }
      
      // 每20次清理一次缓存
      if (i % 20 === 0) {
        service.clearCache();
      }
    }
    
    service.resetAll();
    
    // 分析内存增长趋势
    const firstHalfGrowth = this.baselineMemory - this.observations[0].memoryMB;
    const secondHalfGrowth = this.observations[this.observations.length-1].memoryMB - 
                            this.observations[Math.floor(this.observations.length/2)].memoryMB;
    
    logger.info(`  测试完成:`);
    logger.info(`    基线: ${this.baselineMemory.toFixed(1)} MB`);
    logger.info(`    最终: ${lastMemory.toFixed(1)} MB`);
    logger.info(`    增长: ${(lastMemory - this.baselineMemory).toFixed(1)} MB`);
    logger.info(`    GC触发: ${this.gcTriggerCount} 次`);
  }

  private async testMicroPerformanceChanges() {
    logger.info('\n⏱️ 测试2: 微小性能变化检测');
    logger.info('─'.repeat(60));
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    const qe = service.getQueryEngine();
    
    const queryTimes: number[] = [];
    const SAMPLE_SIZE = 50;
    
    for (let i = 0; i < SAMPLE_SIZE; i++) {
      const start = Date.now();
      qe.getEntitiesByType(CodeEntityType.CLASS);
      const queryTime = Date.now() - start;
      queryTimes.push(queryTime);
      
      this.totalOperations++;
      
      if (i % 10 === 0) {
        const avgTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
        const p95Time = this.percentile(queryTimes, 95);
        
        logger.info(`  样本 ${i.toString().padStart(2)}/${SAMPLE_SIZE}: ` +
                   `平均 ${avgTime.toFixed(2)}ms, ` +
                   `P95 ${p95Time.toFixed(2)}ms`);
      }
    }
    
    // 分析性能趋势
    const first10Avg = queryTimes.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
    const last10Avg = queryTimes.slice(-10).reduce((a, b) => a + b, 0) / 10;
    const performanceChange = ((last10Avg - first10Avg) / first10Avg) * 100;
    
    logger.info(`  性能分析:`);
    logger.info(`    前10次平均: ${first10Avg.toFixed(2)}ms`);
    logger.info(`    后10次平均: ${last10Avg.toFixed(2)}ms`);
    logger.info(`    变化率: ${performanceChange >= 0 ? '+' : ''}${performanceChange.toFixed(1)}%`);
    
    if (Math.abs(performanceChange) < 20) {
      logger.info(`    ✅ 性能稳定`);
    } else if (performanceChange > 0) {
      logger.warn(`    ⚠️ 性能退化`);
    } else {
      logger.info(`    ✅ 性能改善`);
    }
    
    service.resetAll();
  }

  private async testCacheEfficiencyChanges() {
    logger.info('\n💾 测试3: 缓存效率变化检测');
    logger.info('─'.repeat(60));
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    const qe = service.getQueryEngine();
    
    const cacheSizes: number[] = [];
    const cacheHits: number[] = [];
    let totalQueries = 0;
    
    // 连续查询，观察缓存行为
    for (let i = 0; i < 30; i++) {
      const cacheBefore = qe.getCacheStats().size;
      
      // 执行查询
      qe.getEntitiesByType(CodeEntityType.CLASS);
      qe.searchEntitiesByName('service');
      qe.getStatistics();
      totalQueries += 3;
      
      const cacheAfter = qe.getCacheStats().size;
      cacheSizes.push(cacheAfter);
      
      // 计算缓存命中率（通过缓存大小变化推断）
      const cacheGrowth = cacheAfter - cacheBefore;
      cacheHits.push(cacheGrowth <= 0 ? 1 : 0); // 如果缓存没增长，认为是命中
      
      if (i % 10 === 0) {
        const avgCacheSize = cacheSizes.reduce((a, b) => a + b, 0) / cacheSizes.length;
        const hitRate = (cacheHits.reduce((a, b) => a + b, 0) / cacheHits.length) * 100;
        
        logger.info(`  批次 ${i}/${30}: ` +
                   `缓存大小 ${avgCacheSize.toFixed(0)}, ` +
                   `命中率 ${hitRate.toFixed(0)}%`);
      }
    }
    
    // 分析缓存效率
    const firstHalfAvg = cacheSizes.slice(0, 15).reduce((a, b) => a + b, 0) / 15;
    const secondHalfAvg = cacheSizes.slice(-15).reduce((a, b) => a + b, 0) / 15;
    
    logger.info(`  缓存分析:`);
    logger.info(`    前半段平均: ${firstHalfAvg.toFixed(0)}`);
    logger.info(`    后半段平均: ${secondHalfAvg.toFixed(0)}`);
    
    if (secondHalfAvg > firstHalfAvg * 1.5) {
      logger.warn(`    ⚠️ 缓存持续增长，可能有问题`);
    } else {
      logger.info(`    ✅ 缓存行为正常`);
    }
    
    service.resetAll();
  }

  private async testQueryTimePatterns() {
    logger.info('\n📊 测试4: 查询时间模式分析');
    logger.info('─'.repeat(60));
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    const qe = service.getQueryEngine();
    
    const queryTypes = [
      { name: 'CLASS查询', query: () => qe.getEntitiesByType(CodeEntityType.CLASS) },
      { name: 'FUNCTION查询', query: () => qe.getEntitiesByType(CodeEntityType.FUNCTION) },
      { name: '统计查询', query: () => qe.getStatistics() },
      { name: '搜索查询', query: () => qe.searchEntitiesByName('service') }
    ];
    
    for (const type of queryTypes) {
      const times: number[] = [];
      
      for (let i = 0; i < 20; i++) {
        const start = Date.now();
        type.query();
        times.push(Date.now() - start);
        this.totalOperations++;
      }
      
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      const stdDev = this.standardDeviation(times);
      
      logger.info(`  ${type.name.padEnd(15)}: ` +
                 `平均 ${avg.toFixed(2).padStart(7)}ms, ` +
                 `最小 ${min.toFixed(2).padStart(7)}ms, ` +
                 `最大 ${max.toFixed(2).padStart(7)}ms, ` +
                 `标准差 ${stdDev.toFixed(2).padStart(6)}ms`);
    }
    
    service.resetAll();
  }

  private async testMemoryGrowthPatterns() {
    logger.info('\n📈 测试5: 内存增长模式分析');
    logger.info('─'.repeat(60));
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    const qe = service.getQueryEngine();
    
    const memorySnapshots: number[] = [];
    const MEMORY_CHECKS = 20;
    
    for (let i = 0; i < MEMORY_CHECKS; i++) {
      // 执行一组查询
      for (let j = 0; j < 10; j++) {
        qe.getEntitiesByType(CodeEntityType.CLASS);
        qe.searchEntitiesByName('test');
        this.totalOperations++;
      }
      
      const memory = this.getMemoryMB();
      memorySnapshots.push(memory);
      
      if (i % 5 === 0) {
        logger.info(`  检查点 ${i}/${MEMORY_CHECKS}: ${memory.toFixed(2)} MB`);
      }
    }
    
    // 线性回归分析内存增长趋势
    const n = memorySnapshots.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += memorySnapshots[i];
      sumXY += i * memorySnapshots[i];
      sumXX += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    logger.info(`  内存增长分析:`);
    logger.info(`    初始: ${memorySnapshots[0].toFixed(2)} MB`);
    logger.info(`    最终: ${memorySnapshots[n-1].toFixed(2)} MB`);
    logger.info(`    总增长: ${(memorySnapshots[n-1] - memorySnapshots[0]).toFixed(2)} MB`);
    logger.info(`    增长斜率: ${slope >= 0 ? '+' : ''}${slope.toFixed(4)} MB/次`);
    
    if (slope > 0.5) {
      logger.warn(`    🚨 明显内存泄漏趋势！斜率过高`);
    } else if (slope > 0.1) {
      logger.warn(`    ⚠️ 轻微内存增长趋势`);
    } else {
      logger.info(`    ✅ 内存稳定，无明显泄漏`);
    }
    
    service.resetAll();
  }

  private getMemoryMB(): number {
    const memUsage = process.memoryUsage();
    return memUsage.heapUsed / 1024 / 1024;
  }

  private percentile(arr: number[], p: number): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private standardDeviation(arr: number[]): number {
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(avgSquareDiff);
  }

  private async generateObservationReport() {
    const totalDuration = (Date.now() - this.startTime) / 1000;
    const finalMemory = this.getMemoryMB();
    const memoryGrowth = finalMemory - this.baselineMemory;
    
    logger.info('\n' + '═'.repeat(80));
    logger.info('🔬 深度观察性测试 - 最终报告');
    logger.info('═'.repeat(80));
    
    logger.info('\n📊 总体统计:');
    logger.info(`  测试时长: ${totalDuration.toFixed(1)} 秒`);
    logger.info(`  总操作数: ${this.totalOperations}`);
    logger.info(`  基线内存: ${this.baselineMemory.toFixed(2)} MB`);
    logger.info(`  最终内存: ${finalMemory.toFixed(2)} MB`);
    logger.info(`  内存变化: ${memoryGrowth >= 0 ? '+' : ''}${memoryGrowth.toFixed(2)} MB`);
    logger.info(`  GC触发次数: ${this.gcTriggerCount}`);
    
    logger.info('\n🔍 微小变化检测结果:');
    
    // 分析异常观察点
    const anomalies = this.observations.filter(o => o.anomalyScore > 0);
    if (anomalies.length > 0) {
      logger.warn(`  ⚠️  发现 ${anomalies.length} 个异常观察点:`);
      for (const anomaly of anomalies.slice(0, 5)) {
        logger.warn(`     迭代 ${anomaly.iteration}: ${anomaly.notes}`);
      }
    } else {
      logger.info(`  ✅ 未发现明显异常`);
    }
    
    // 内存增长分析
    const memoryTrend = this.analyzeMemoryTrend();
    logger.info(`\n💾 内存趋势分析: ${memoryTrend}`);
    
    // GC效率分析
    logger.info(`\n🧹 GC效率分析:`);
    if (this.gcTriggerCount === 0) {
      logger.info(`  ⚠️  GC从未触发，可能内存未达到阈值`);
    } else if (this.gcTriggerCount > 10) {
      logger.warn(`  ⚠️  GC频繁触发，可能存在内存压力`);
    } else {
      logger.info(`  ✅ GC触发正常`);
    }
    
    logger.info('\n🎯 最终评估:');
    
    let healthScore = 100;
    
    if (memoryGrowth > 200) healthScore -= 30;
    else if (memoryGrowth > 100) healthScore -= 15;
    else if (memoryGrowth < 0) healthScore += 5;
    
    if (anomalies.length > 5) healthScore -= 20;
    else if (anomalies.length > 0) healthScore -= 5;
    
    if (healthScore >= 90) {
      logger.info(`  🎉 🚀 完美！系统健康得分 ${healthScore}/100`);
      logger.info(`  🎉 🚀 系统非常健康，可以投入生产使用！`);
    } else if (healthScore >= 70) {
      logger.info(`  ✅ 良好！系统健康得分 ${healthScore}/100`);
      logger.info(`  ✅ 系统可以投入使用，但建议持续监控`);
    } else {
      logger.warn(`  ⚠️  需要改进！系统健康得分 ${healthScore}/100`);
      logger.warn(`  ⚠️  建议修复发现的问题后再投入使用`);
    }
    
    logger.info('═'.repeat(80));
    
    // 输出关键指标
    console.log('\n--- 关键指标 ---');
    console.log(`totalDuration:${totalDuration.toFixed(2)}`);
    console.log(`totalOperations:${this.totalOperations}`);
    console.log(`baselineMemoryMB:${this.baselineMemory.toFixed(2)}`);
    console.log(`finalMemoryMB:${finalMemory.toFixed(2)}`);
    console.log(`memoryGrowthMB:${memoryGrowth.toFixed(2)}`);
    console.log(`gcTriggerCount:${this.gcTriggerCount}`);
    console.log(`anomalyCount:${anomalies.length}`);
    console.log(`healthScore:${healthScore}`);
  }

  private analyzeMemoryTrend(): string {
    if (this.observations.length < 5) return '数据不足';
    
    const firstHalf = this.observations.slice(0, Math.floor(this.observations.length / 2));
    const secondHalf = this.observations.slice(Math.floor(this.observations.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b.memoryMB, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b.memoryMB, 0) / secondHalf.length;
    
    const growth = secondAvg - firstAvg;
    
    if (growth > 50) return '🚨 明显上升趋势（可能泄漏）';
    if (growth > 20) return '⚠️ 轻微上升趋势';
    if (growth > -20) return '✅ 基本稳定';
    return '✅ 有所下降';
  }
}

(async () => {
  const test = new DeepObservationTest();
  await test.runDeepObservationTest();
})().catch(error => {
  console.error('深度观察测试执行异常:', error);
  process.exit(1);
});
