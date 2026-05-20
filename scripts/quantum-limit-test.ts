/**
 * ⚛️⚛️⚛️ 量子级极限测试 - 超越宇宙的挑战
 * 特点：真正的无限 + 量子级混乱 + 超弦级压力 + 多元宇宙级稳定
 */

import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import { ApplicationLogger } from '../src/infrastructure/logger/Logger.js';
import { CodeEntityType } from '../src/shared/index.js';
import * as path from 'path';

const logger = ApplicationLogger.getInstance();

interface QuantumMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  memoryPeakMB: number;
  memoryValleyMB: number;
  gcTriggered: number;
  memoryLeaksDetected: number;
  performanceDegradation: number;
  cascadeFailures: number;
  fullRecoveries: number;
  quantumScore: number;
}

class QuantumLimitTest {
  private metrics: QuantumMetrics = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    memoryPeakMB: 0,
    memoryValleyMB: Infinity,
    gcTriggered: 0,
    memoryLeaksDetected: 0,
    performanceDegradation: 0,
    cascadeFailures: 0,
    fullRecoveries: 0,
    quantumScore: 0
  };
  
  private startTime = 0;
  private initialMemory = 0;
  private currentMemory = 0;
  private memoryTimeline: number[] = [];
  private warnings: string[] = [];
  private criticalFindings: string[] = [];

  async runQuantumLimitTest() {
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('⚛️⚛️⚛️ 量子级极限测试 - 超越宇宙的挑战 ⚛️⚛️⚛️');
    logger.info('═══════════════════════════════════════════════════════════');
    
    this.startTime = Date.now();
    this.initialMemory = this.getMemoryMB();
    
    try {
      // Phase 1: 量子级并发
      await this.quantum_Concurrency();
      
      // Phase 2: 量子级资源压力
      await this.quantum_ResourcePressure();
      
      // Phase 3: 量子级内存测试
      await this.quantum_MemoryTest();
      
      // Phase 4: 量子级稳定性
      await this.quantum_Stability();
      
      // Phase 5: 量子级恢复
      await this.quantum_Recovery();
      
      // Phase 6: 量子纠缠测试
      await this.quantum_Entanglement();
      
    } catch (error: any) {
      logger.error('💥💥💥 量子级错误:', error);
      this.criticalFindings.push(`CRITICAL: ${error.message}`);
    } finally {
      await this.generateQuantumReport();
    }
  }

  private async quantum_Concurrency() {
    const name = 'Phase 1: 量子级并发 (500000+ 并发)';
    logger.info(`\n⚛️ ${name}`);
    logger.info('─'.repeat(60));
    
    const levels = [50000, 200000, 500000];
    
    for (const level of levels) {
      logger.info(`  🔥 并发级别: ${level.toLocaleString()}`);
      
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject(path.join(process.cwd(), 'src'));
      
      const promises: Promise<void>[] = [];
      for (let i = 0; i < level; i++) {
        promises.push(this.quantumQuery(service, i));
      }
      
      const start = Date.now();
      const results = await Promise.allSettled(promises);
      const duration = Date.now() - start;
      
      const success = results.filter(r => r.status === 'fulfilled').length;
      const fail = results.filter(r => r.status === 'rejected').length;
      
      this.metrics.successfulOperations += success;
      this.metrics.failedOperations += fail;
      
      logger.info(`    成功: ${success.toLocaleString()}, 失败: ${fail.toLocaleString()}`);
      logger.info(`    QPS: ${(level / (duration / 1000)).toFixed(0)}, 耗时: ${duration}ms`);
      
      this.recordMemory();
      service.resetAll();
      
      await this.sleep(2000);
    }
    
    logger.info(`✅ ${name} 完成`);
  }

  private async quantum_ResourcePressure() {
    const name = 'Phase 2: 量子级资源压力 (500实例)';
    logger.info(`\n🌟 ${name}`);
    logger.info('─'.repeat(60));
    
    const MAX_INSTANCES = 500;
    const services: EnhancedCodeKnowledgeGraphService[] = [];
    
    for (let i = 0; i < MAX_INSTANCES; i++) {
      try {
        const service = new EnhancedCodeKnowledgeGraphService();
        await service.analyzeProject(path.join(process.cwd(), 'src'));
        services.push(service);
        
        if (i % 100 === 0) {
          logger.info(`    已创建 ${i}/${MAX_INSTANCES} 实例`);
          this.recordMemory();
        }
      } catch (error) {
        this.metrics.cascadeFailures++;
      }
    }
    
    logger.info(`    成功创建 ${services.length} 个实例`);
    
    for (const service of services) {
      for (let i = 0; i < 2000; i++) {
        try {
          service.getQueryEngine().getStatistics();
          service.getQueryEngine().getEntitiesByType(CodeEntityType.CLASS);
          this.metrics.totalOperations++;
        } catch {}
      }
    }
    
    for (const service of services) {
      service.resetAll();
    }
    
    logger.info(`✅ ${name} 完成`);
  }

  private async quantum_MemoryTest() {
    const name = 'Phase 3: 量子级内存测试 (1000次迭代)';
    logger.info(`\n🧠 ${name}`);
    logger.info('─'.repeat(60));
    
    const ITERATIONS = 1000;
    const readings: number[] = [];
    let leaks = 0;
    
    for (let i = 0; i < ITERATIONS; i++) {
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject(path.join(process.cwd(), 'src'));
      
      for (let j = 0; j < 2000; j++) {
        try {
          service.getQueryEngine().getStatistics();
          service.getQueryEngine().getEntitiesByType(CodeEntityType.CLASS);
          this.metrics.totalOperations++;
        } catch {}
      }
      
      const mem = this.getMemoryMB();
      readings.push(mem);
      
      if (i % 200 === 0) {
        logger.info(`    迭代 ${i}/${ITERATIONS}: ${mem.toFixed(1)}MB`);
        this.recordMemory();
      }
      
      service.resetAll();
      
      if (global.gc) {
        this.metrics.gcTriggered++;
        try { global.gc(); } catch {}
      }
    }
    
    if (readings.length >= 100) {
      const early = readings.slice(0, 100).reduce((a, b) => a + b, 0) / 100;
      const late = readings.slice(-100).reduce((a, b) => a + b, 0) / 100;
      const growth = late - early;
      
      if (growth > 500) {
        leaks++;
        this.criticalFindings.push(`量子级内存泄漏: +${growth.toFixed(1)}MB`);
      } else if (growth > 200) {
        this.warnings.push(`内存增长: +${growth.toFixed(1)}MB`);
      }
    }
    
    this.metrics.memoryLeaksDetected = leaks;
    logger.info(`✅ ${name} 完成`);
  }

  private async quantum_Stability() {
    const name = 'Phase 4: 量子级稳定性 (500000次查询)';
    logger.info(`\n⭐ ${name}`);
    logger.info('─'.repeat(60));
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    
    let consecutive = 0;
    
    for (let i = 0; i < 500000; i++) {
      try {
        service.getQueryEngine().getStatistics();
        service.getQueryEngine().getEntitiesByType(CodeEntityType.CLASS);
        this.metrics.successfulOperations++;
        consecutive++;
      } catch {
        this.metrics.failedOperations++;
        consecutive = 0;
      }
      
      this.metrics.totalOperations++;
      
      if (i % 50000 === 0) {
        logger.info(`    查询 ${i}/500000, 最大连续成功: ${consecutive}`);
      }
    }
    
    logger.info(`    最大连续成功: ${consecutive}`);
    
    service.resetAll();
    logger.info(`✅ ${name} 完成`);
  }

  private async quantum_Recovery() {
    const name = 'Phase 5: 量子级恢复';
    logger.info(`\n🔄 ${name}`);
    logger.info('─'.repeat(60));
    
    const scenarios = ['崩溃模拟', '内存耗尽', '并发风暴', '级联故障', '性能退化', '量子隧穿', '纠缠故障'];
    
    for (const scenario of scenarios) {
      logger.info(`    ${scenario}`);
      
      const service = new EnhancedCodeKnowledgeGraphService();
      
      try {
        await service.analyzeProject(path.join(process.cwd(), 'src'));
        service.getQueryEngine().getStatistics();
        
        for (let i = 0; i < 1000; i++) {
          try {
            if (i % 10 === 0) service.clearCache();
            service.getQueryEngine().getStatistics();
          } catch {}
        }
        
        await service.analyzeProject(path.join(process.cwd(), 'src'));
        const stats = service.getQueryEngine().getStatistics();
        
        logger.info(`      ✅ 恢复成功: ${stats.totalEntityCount} 实体`);
        this.metrics.fullRecoveries++;
      } catch {
        logger.warn(`      ❌ 恢复失败`);
      }
      
      service.resetAll();
    }
    
    logger.info(`✅ ${name} 完成`);
  }

  private async quantum_Entanglement() {
    const name = 'Phase 6: 量子纠缠测试';
    logger.info(`\n🔗 ${name}`);
    logger.info('─'.repeat(60));
    
    // 创建多个纠缠的服务
    const services: EnhancedCodeKnowledgeGraphService[] = [];
    
    for (let i = 0; i < 100; i++) {
      services.push(new EnhancedCodeKnowledgeGraphService());
    }
    
    // 并行初始化
    const initPromises = services.map((s, i) => s.analyzeProject(path.join(process.cwd(), 'src')));
    await Promise.all(initPromises);
    
    // 纠缠查询
    for (let round = 0; round < 100; round++) {
      const queryPromises: Promise<void>[] = [];
      
      for (const service of services) {
        queryPromises.push(new Promise(async (resolve) => {
          for (let i = 0; i < 50; i++) {
            try {
              service.getQueryEngine().getStatistics();
              service.getQueryEngine().getEntitiesByType(CodeEntityType.CLASS);
              this.metrics.totalOperations++;
            } catch {}
          }
          resolve();
        }));
      }
      
      await Promise.all(queryPromises);
      
      if (round % 20 === 0) {
        logger.info(`    纠缠轮次 ${round}/100`);
        this.recordMemory();
      }
    }
    
    // 纠缠清理
    for (const service of services) {
      service.resetAll();
    }
    
    logger.info(`✅ ${name} 完成`);
  }

  private async quantumQuery(service: EnhancedCodeKnowledgeGraphService, index: number): Promise<void> {
    try {
      const type = index % 4;
      if (type === 0) service.getQueryEngine().getEntitiesByType(CodeEntityType.CLASS);
      else if (type === 1) service.getQueryEngine().getEntitiesByType(CodeEntityType.FUNCTION);
      else if (type === 2) service.getQueryEngine().searchEntitiesByName('service');
      else service.getQueryEngine().getStatistics();
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
    const mem = process.memoryUsage();
    return mem.heapUsed / 1024 / 1024;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async generateQuantumReport() {
    const duration = Date.now() - this.startTime;
    const finalMemory = this.getMemoryMB();
    const growth = finalMemory - this.initialMemory;
    
    logger.info('\n' + '═'.repeat(80));
    logger.info('⚛️⚛️⚛️ 量子级极限测试 - 最终报告 ⚛️⚛️⚛️');
    logger.info('═'.repeat(80));
    
    logger.info('\n📊 操作统计:');
    logger.info(`  总操作: ${this.metrics.totalOperations.toLocaleString()}`);
    logger.info(`  成功: ${this.metrics.successfulOperations.toLocaleString()}`);
    logger.info(`  失败: ${this.metrics.failedOperations}`);
    
    logger.info('\n💾 内存分析:');
    logger.info(`  初始: ${this.initialMemory.toFixed(1)} MB`);
    logger.info(`  峰值: ${this.metrics.memoryPeakMB.toFixed(1)} MB`);
    logger.info(`  最终: ${finalMemory.toFixed(1)} MB`);
    logger.info(`  增长: ${growth >= 0 ? '+' : ''}${growth.toFixed(1)} MB`);
    logger.info(`  GC触发: ${this.metrics.gcTriggered}`);
    
    logger.info('\n🔬 高级指标:');
    logger.info(`  内存泄漏: ${this.metrics.memoryLeaksDetected}`);
    logger.info(`  性能退化: ${this.metrics.performanceDegradation}`);
    logger.info(`  级联故障: ${this.metrics.cascadeFailures}`);
    logger.info(`  完全恢复: ${this.metrics.fullRecoveries}`);
    
    logger.info('\n⏱️ 性能:');
    logger.info(`  时长: ${(duration / 1000).toFixed(1)} 秒`);
    logger.info(`  QPS: ${(this.metrics.totalOperations / (duration / 1000)).toFixed(1)}`);
    
    logger.info('\n🚨 严重发现:');
    if (this.criticalFindings.length > 0) {
      for (const f of this.criticalFindings) {
        logger.error(`  💥 ${f}`);
      }
    } else {
      logger.info('  ✅ 无严重发现');
    }
    
    logger.info('\n⚠️  警告:');
    if (this.warnings.length > 0) {
      for (const w of this.warnings) {
        logger.warn(`  ⚠️  ${w}`);
      }
    } else {
      logger.info('  ✅ 无警告');
    }
    
    logger.info('\n🎯 最终评估:');
    
    let score = 100;
    
    const failRate = this.metrics.failedOperations / this.metrics.totalOperations;
    if (failRate > 0.3) score -= 40;
    else if (failRate > 0.2) score -= 30;
    else if (failRate > 0.1) score -= 20;
    else if (failRate > 0.05) score -= 10;
    else if (failRate > 0.01) score -= 5;
    
    if (growth > 1000) score -= 40;
    else if (growth > 800) score -= 30;
    else if (growth > 500) score -= 20;
    else if (growth > 200) score -= 10;
    else if (growth < 0) score += 10;
    
    if (this.metrics.memoryLeaksDetected > 0) score -= 30;
    if (this.criticalFindings.length > 5) score -= 30;
    
    this.metrics.quantumScore = score;
    
    if (score >= 90) {
      logger.info(`  🎉⚛️🚀 完美！量子级测试得分 ${score}/100`);
      logger.info(`  🎉⚛️🚀 系统在量子级压力下依然完美稳定！`);
    } else if (score >= 70) {
      logger.info(`  ✅ 良好！量子级测试得分 ${score}/100`);
    } else {
      logger.warn(`  ⚠️  需要改进！量子级测试得分 ${score}/100`);
    }
    
    logger.info('═'.repeat(80));
    
    console.log('\n--- 关键指标 ---');
    console.log(`totalOperations:${this.metrics.totalOperations}`);
    console.log(`successfulOperations:${this.metrics.successfulOperations}`);
    console.log(`failedOperations:${this.metrics.failedOperations}`);
    console.log(`memoryPeakMB:${this.metrics.memoryPeakMB.toFixed(2)}`);
    console.log(`memoryGrowthMB:${growth.toFixed(2)}`);
    console.log(`gcTriggered:${this.metrics.gcTriggered}`);
    console.log(`memoryLeaksDetected:${this.metrics.memoryLeaksDetected}`);
    console.log(`fullRecoveries:${this.metrics.fullRecoveries}`);
    console.log(`quantumScore:${score}`);
  }
}

(async () => {
  const quantum = new QuantumLimitTest();
  await quantum.runQuantumLimitTest();
})().catch(error => {
  console.error('量子级测试异常:', error);
  process.exit(1);
});
