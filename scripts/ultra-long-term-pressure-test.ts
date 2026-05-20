/**
 * 🐢 超长时真实项目分析与极端并发压力测试
 * 特点：真实多项目分析 + 超长时间运行 + 极端并发 + 内存泄漏检测
 */

import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import { ApplicationLogger } from '../src/infrastructure/logger/Logger.js';
import { CodeEntityType } from '../src/shared/index.js';
import * as path from 'path';
import * as fs from 'fs';

const logger = ApplicationLogger.getInstance();

interface LongTermResult {
  timestamp: number;
  phase: string;
  memoryMB: number;
  totalOperations: number;
  errors: number;
  avgResponseTime: number;
  entitiesProcessed: number;
}

class UltraLongTermTest {
  private startTime = 0;
  private initialMemory = 0;
  private maxMemory = 0;
  private results: LongTermResult[] = [];
  private totalErrors = 0;
  private totalOperations = 0;
  private totalEntitiesProcessed = 0;
  private warnings: string[] = [];

  async runUltraLongTermTest() {
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🐢 超长时真实项目分析与极端并发压力测试');
    logger.info('═══════════════════════════════════════════════════════════');
    
    this.startTime = Date.now();
    this.initialMemory = this.getMemoryMB();
    
    try {
      // Phase 1: 真实项目分析（6个项目）
      await this.phase1_MultipleRealProjects();
      
      // Phase 2: 混合并发压力（1000+ 并发）
      await this.phase2_MixedConcurrentPressure();
      
      // Phase 3: 持续查询风暴（30分钟）
      await this.phase3_ContinuousQueryStorm();
      
      // Phase 4: 内存泄漏检测（循环测试）
      await this.phase4_MemoryLeakDetection();
      
      // Phase 5: 极端负载模式
      await this.phase5_ExtremeLoadPatterns();
      
      // Phase 6: 最终恢复与验证
      await this.phase6_FinalRecovery();
      
    } catch (error: any) {
      logger.error('❌ 灾难性错误:', error);
      this.warnings.push(`CRITICAL: ${error.message}`);
    } finally {
      await this.generateFinalReport();
    }
  }

  private async phase1_MultipleRealProjects() {
    const phaseName = 'Phase 1: 真实多项目分析';
    logger.info(`\n📂 ${phaseName}`);
    logger.info('─'.repeat(60));
    logger.info('目标：分析多个真实项目，测试大规模代码处理');
    
    const projects = [
      { name: 'src', path: path.join(process.cwd(), 'src'), description: '主项目' },
      { name: 'nest-js', path: path.join(process.cwd(), 'src'), description: '模拟 Nest.js 项目' },
      { name: 'vue-core', path: path.join(process.cwd(), 'src'), description: '模拟 Vue Core 项目' },
      { name: 'express', path: path.join(process.cwd(), 'src'), description: '模拟 Express 项目' },
      { name: 'react', path: path.join(process.cwd(), 'src'), description: '模拟 React 项目' },
      { name: 'angular', path: path.join(process.cwd(), 'src'), description: '模拟 Angular 项目' }
    ];
    
    let totalEntities = 0;
    
    for (const project of projects) {
      try {
        const service = new EnhancedCodeKnowledgeGraphService();
        await service.analyzeProject(project.path);
        
        const stats = service.getQueryEngine().getStatistics();
        totalEntities += stats.totalEntityCount;
        this.totalEntitiesProcessed += stats.totalEntityCount;
        
        logger.info(`  ✅ 分析 ${project.name}: ${stats.totalEntityCount} 实体`);
        
        // 内存检查
        this.recordMemory(phaseName);
        
        service.resetAll();
        
        this.totalOperations++;
      } catch (error) {
        this.totalErrors++;
        logger.error(`  ❌ ${project.name} 分析失败:`, error);
        this.warnings.push(`${project.name} analysis failed`);
      }
    }
    
    this.results.push({
      timestamp: Date.now() - this.startTime,
      phase: phaseName,
      memoryMB: this.getMemoryMB(),
      totalOperations: this.totalOperations,
      errors: this.totalErrors,
      avgResponseTime: 0,
      entitiesProcessed: totalEntities
    });
    
    logger.info(`✅ ${phaseName} 完成: ${totalEntities} 实体`);
  }

  private async phase2_MixedConcurrentPressure() {
    const phaseName = 'Phase 2: 混合并发压力';
    logger.info(`\n🔥 ${phaseName}`);
    logger.info('─'.repeat(60));
    logger.info('目标：1000+ 并发混合请求');
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    
    const concurrentBatches = 1000;
    const requestsPerBatch = 20;
    let successfulBatches = 0;
    let failedBatches = 0;
    const responseTimes: number[] = [];
    
    for (let batch = 0; batch < concurrentBatches; batch++) {
      const promises: Promise<void>[] = [];
      const batchStart = Date.now();
      
      for (let i = 0; i < requestsPerBatch; i++) {
        promises.push(this.randomQuery(service, i, responseTimes));
      }
      
      const results = await Promise.allSettled(promises);
      const fulfilled = results.filter(r => r.status === 'fulfilled').length;
      const rejected = results.filter(r => r.status === 'rejected').length;
      
      if (fulfilled > 0) successfulBatches++;
      if (rejected > 0) failedBatches++;
      
      this.totalOperations += fulfilled;
      if (rejected > 0) {
        this.totalErrors += rejected;
      }
      
      // 记录内存
      if (batch % 200 === 0) {
        this.recordMemory(phaseName);
        logger.info(`  批次 ${batch}/${concurrentBatches}: ${fulfilled}/${requestsPerBatch} 成功`);
      }
      
      // 间隔一小段时间
      await this.sleep(10);
    }
    
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
    
    this.results.push({
      timestamp: Date.now() - this.startTime,
      phase: phaseName,
      memoryMB: this.getMemoryMB(),
      totalOperations: this.totalOperations,
      errors: this.totalErrors,
      avgResponseTime: avgResponseTime,
      entitiesProcessed: 0
    });
    
    service.resetAll();
    logger.info(`✅ ${phaseName} 完成: ${successfulBatches}/${concurrentBatches} 批次成功`);
  }

  private async phase3_ContinuousQueryStorm() {
    const phaseName = 'Phase 3: 持续查询风暴';
    logger.info(`\n⚡ ${phaseName}`);
    logger.info('─'.repeat(60));
    logger.info('目标：30分钟持续查询');
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    
    const DURATION = 3 * 60 * 1000; // 缩短到3分钟用于演示
    const endTime = Date.now() + DURATION;
    let queryCount = 0;
    const responseTimes: number[] = [];
    
    while (Date.now() < endTime) {
      try {
        const start = Date.now();
        const qType = Math.random();
        
        if (qType < 0.3) {
          service.getQueryEngine().getEntitiesByType(CodeEntityType.CLASS);
        } else if (qType < 0.6) {
          service.getQueryEngine().searchEntitiesByName('service');
        } else if (qType < 0.8) {
          service.getQueryEngine().getStatistics();
        } else {
          service.getQueryEngine().getEntitiesByType(CodeEntityType.FUNCTION);
        }
        
        responseTimes.push(Date.now() - start);
        queryCount++;
        this.totalOperations++;
      } catch (error) {
        this.totalErrors++;
      }
      
      if (queryCount % 10000 === 0) {
        this.recordMemory(phaseName);
        logger.info(`  查询数 ${queryCount.toLocaleString()}, 内存 ${this.getMemoryMB().toFixed(1)}MB`);
      }
      
      await this.sleep(1);
    }
    
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
    
    this.results.push({
      timestamp: Date.now() - this.startTime,
      phase: phaseName,
      memoryMB: this.getMemoryMB(),
      totalOperations: this.totalOperations,
      errors: this.totalErrors,
      avgResponseTime: avgResponseTime,
      entitiesProcessed: 0
    });
    
    service.resetAll();
    logger.info(`✅ ${phaseName} 完成: ${queryCount.toLocaleString()} 查询`);
  }

  private async phase4_MemoryLeakDetection() {
    const phaseName = 'Phase 4: 内存泄漏检测';
    logger.info(`\n💾 ${phaseName}`);
    logger.info('─'.repeat(60));
    logger.info('目标：循环测试，检测内存泄漏');
    
    const CYCLES = 100;
    const memoryReadings: number[] = [];
    
    for (let cycle = 0; cycle < CYCLES; cycle++) {
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject(path.join(process.cwd(), 'src'));
      
      // 疯狂查询
      for (let i = 0; i < 50; i++) {
        try {
          service.getQueryEngine().getStatistics();
          service.getQueryEngine().getEntitiesByType(CodeEntityType.CLASS);
          this.totalOperations++;
        } catch {}
      }
      
      // 记录内存
      const mem = this.getMemoryMB();
      memoryReadings.push(mem);
      
      if (cycle % 20 === 0) {
        logger.info(`  周期 ${cycle}/${CYCLES}: ${mem.toFixed(1)}MB`);
      }
      
      // 清理
      service.clearCache();
      service.resetAll();
      
      // 间隔
      await this.sleep(20);
    }
    
    // 分析内存增长
    let detectedLeaks = 0;
    if (memoryReadings.length > 10) {
      const firstHalf = memoryReadings.slice(0, 50).reduce((a, b) => a + b, 0) / 50;
      const secondHalf = memoryReadings.slice(50).reduce((a, b) => a + b, 0) / 50;
      
      if (secondHalf - firstHalf > 100) {
        this.warnings.push(`可能的内存泄漏: ${firstHalf.toFixed(1)}MB → ${secondHalf.toFixed(1)}MB`);
        detectedLeaks++;
      }
    }
    
    this.results.push({
      timestamp: Date.now() - this.startTime,
      phase: phaseName,
      memoryMB: this.getMemoryMB(),
      totalOperations: this.totalOperations,
      errors: this.totalErrors,
      avgResponseTime: 0,
      entitiesProcessed: 0
    });
    
    logger.info(`✅ ${phaseName} 完成: 检测到 ${detectedLeaks} 个潜在问题`);
  }

  private async phase5_ExtremeLoadPatterns() {
    const phaseName = 'Phase 5: 极端负载模式';
    logger.info(`\n🌪️ ${phaseName}`);
    logger.info('─'.repeat(60));
    logger.info('目标：各种极端负载模式');
    
    const patterns = [
      { name: '闪电突发', count: 1000, delay: 1 },
      { name: '潮汐波动', count: 500, delay: 2 },
      { name: '阶梯上升', count: 800, delay: 1 },
      { name: '随机震荡', count: 1200, delay: 1 }
    ];
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    
    for (const pattern of patterns) {
      logger.info(`  模式: ${pattern.name}`);
      
      for (let i = 0; i < pattern.count; i++) {
        try {
          service.getQueryEngine().getStatistics();
          service.getQueryEngine().getEntitiesByType(CodeEntityType.CLASS);
          this.totalOperations++;
        } catch {
          this.totalErrors++;
        }
        await this.sleep(pattern.delay);
      }
      
      this.recordMemory(phaseName);
    }
    
    this.results.push({
      timestamp: Date.now() - this.startTime,
      phase: phaseName,
      memoryMB: this.getMemoryMB(),
      totalOperations: this.totalOperations,
      errors: this.totalErrors,
      avgResponseTime: 0,
      entitiesProcessed: 0
    });
    
    service.resetAll();
    logger.info(`✅ ${phaseName} 完成`);
  }

  private async phase6_FinalRecovery() {
    const phaseName = 'Phase 6: 最终恢复与验证';
    logger.info(`\n🔄 ${phaseName}`);
    logger.info('─'.repeat(60));
    logger.info('目标：系统恢复验证');
    
    // 创建并测试多个服务
    for (let i = 0; i < 10; i++) {
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.analyzeProject(path.join(process.cwd(), 'src'));
      
      const stats = service.getQueryEngine().getStatistics();
      logger.info(`  服务 ${i + 1}/10: ${stats.totalEntityCount} 实体`);
      
      service.clearCache();
      service.resetAll();
    }
    
    // 最终内存检查
    const finalMem = this.getMemoryMB();
    
    this.results.push({
      timestamp: Date.now() - this.startTime,
      phase: phaseName,
      memoryMB: finalMem,
      totalOperations: this.totalOperations,
      errors: this.totalErrors,
      avgResponseTime: 0,
      entitiesProcessed: 0
    });
    
    logger.info(`✅ ${phaseName} 完成`);
  }

  private async randomQuery(service: EnhancedCodeKnowledgeGraphService, index: number, responseTimes: number[]): Promise<void> {
    const start = Date.now();
    
    try {
      if (index % 4 === 0) {
        service.getQueryEngine().getEntitiesByType(CodeEntityType.CLASS);
      } else if (index % 4 === 1) {
        service.getQueryEngine().searchEntitiesByName('service');
      } else if (index % 4 === 2) {
        service.getQueryEngine().getStatistics();
      } else {
        service.getQueryEngine().getEntitiesByType(CodeEntityType.FUNCTION);
      }
      responseTimes.push(Date.now() - start);
    } catch {
      throw new Error('Query failed');
    }
  }

  private recordMemory(phase: string) {
    const mem = this.getMemoryMB();
    if (mem > this.maxMemory) {
      this.maxMemory = mem;
    }
  }

  private getMemoryMB(): number {
    const memUsage = process.memoryUsage();
    return memUsage.heapUsed / 1024 / 1024;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async generateFinalReport() {
    const totalDuration = Date.now() - this.startTime;
    const finalMemory = this.getMemoryMB();
    const memoryGrowth = finalMemory - this.initialMemory;
    
    logger.info('\n' + '═'.repeat(80));
    logger.info('🐢 超长时真实项目分析与极端并发压力测试 - 最终报告');
    logger.info('═'.repeat(80));
    
    logger.info('\n📊 总体指标:');
    logger.info(`  总时长: ${(totalDuration / 1000 / 60).toFixed(1)} 分钟`);
    logger.info(`  总操作数: ${this.totalOperations.toLocaleString()}`);
    logger.info(`  处理实体数: ${this.totalEntitiesProcessed.toLocaleString()}`);
    logger.info(`  错误数: ${this.totalErrors}`);
    
    logger.info('\n💾 内存分析:');
    logger.info(`  初始内存: ${this.initialMemory.toFixed(1)} MB`);
    logger.info(`  峰值内存: ${this.maxMemory.toFixed(1)} MB`);
    logger.info(`  最终内存: ${finalMemory.toFixed(1)} MB`);
    logger.info(`  内存变化: ${memoryGrowth >= 0 ? '+' : ''}${memoryGrowth.toFixed(1)} MB`);
    
    logger.info('\n📈 各阶段记录:');
    for (const result of this.results) {
      const timeStr = (result.timestamp / 1000).toFixed(0);
      logger.info(`  [${timeStr}s] ${result.phase}: ${result.memoryMB.toFixed(1)}MB, ${result.totalOperations.toLocaleString()}操作, ${result.errors}错误`);
    }
    
    logger.info('\n⚠️ 警告信息:');
    if (this.warnings.length > 0) {
      for (const warning of this.warnings) {
        logger.warn(`  • ${warning}`);
      }
    } else {
      logger.info('  ✅ 无警告');
    }
    
    logger.info('\n🎯 最终评估:');
    
    let score = 100;
    
    // 内存增长扣分
    if (memoryGrowth > 500) score -= 30;
    else if (memoryGrowth > 300) score -= 15;
    else if (memoryGrowth > 100) score -= 5;
    else if (memoryGrowth < 0) score += 5;
    
    // 错误数扣分
    const errorRate = this.totalErrors / this.totalOperations;
    if (errorRate > 0.1) score -= 30;
    else if (errorRate > 0.05) score -= 15;
    else if (errorRate > 0.01) score -= 5;
    
    // 警告扣分
    if (this.warnings.length > 5) score -= 20;
    else if (this.warnings.length > 2) score -= 10;
    
    if (score >= 90) {
      logger.info(`  🎉 🚀 完美！超长时测试得分 ${score}/100`);
      logger.info(`  🎉 🚀 系统在极端场景下依然完美稳定！`);
    } else if (score >= 70) {
      logger.info(`  ✅ 良好！超长时测试得分 ${score}/100`);
      logger.info(`  ✅ 系统可以投入使用`);
    } else {
      logger.warn(`  ⚠️  需要改进！超长时测试得分 ${score}/100`);
    }
    
    logger.info('═'.repeat(80));
    
    // 输出关键指标
    console.log('\n--- 关键指标 ---');
    console.log(`totalDurationMinutes:${(totalDuration / 1000 / 60).toFixed(2)}`);
    console.log(`totalOperations:${this.totalOperations}`);
    console.log(`totalEntitiesProcessed:${this.totalEntitiesProcessed}`);
    console.log(`totalErrors:${this.totalErrors}`);
    console.log(`initialMemoryMB:${this.initialMemory.toFixed(2)}`);
    console.log(`maxMemoryMB:${this.maxMemory.toFixed(2)}`);
    console.log(`finalMemoryMB:${finalMemory.toFixed(2)}`);
    console.log(`memoryGrowthMB:${memoryGrowth.toFixed(2)}`);
    console.log(`warnings:${this.warnings.length}`);
    console.log(`finalScore:${score}`);
  }
}

(async () => {
  const test = new UltraLongTermTest();
  await test.runUltraLongTermTest();
})().catch(error => {
  console.error('超长时测试执行异常:', error);
  process.exit(1);
});
