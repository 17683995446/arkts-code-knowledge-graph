/**
 * 慢工出细活 - 精细化渐进测试
 * 原理：逐步增加压力，仔细观察每个阶段的表现
 */

import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import { ApplicationLogger } from '../src/infrastructure/logger/Logger.js';
import { CodeEntityType } from '../src/shared/index.js';
import * as path from 'path';

const logger = ApplicationLogger.getInstance();

interface ObservationPoint {
  timestamp: number;
  phase: string;
  memoryMB: number;
  operations: number;
  errors: number;
  avgResponseTime: number;
  notes?: string;
}

interface PhaseResult {
  phaseName: string;
  duration: number;
  passed: boolean;
  observations: ObservationPoint[];
  issues: string[];
  metrics: Record<string, any>;
}

class SlowAndSteadyTestFramework {
  private allResults: PhaseResult[] = [];
  private allObservations: ObservationPoint[] = [];
  private totalOperations = 0;
  private totalErrors = 0;
  private startTime = 0;
  private initialMemoryMB = 0;

  async runSlowAndSteadyTest() {
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🐢 慢工出细活 - 精细化渐进测试');
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('原理：逐步增加压力，仔细观察每个阶段的表现');
    
    this.startTime = Date.now();
    this.initialMemoryMB = this.getMemoryMB();
    
    try {
      // 第一阶段：热身（低压力）
      await this.phase1_WarmUp();
      
      // 第二阶段：正常负载
      await this.phase2_NormalLoad();
      
      // 第三阶段：中等压力
      await this.phase3_MediumPressure();
      
      // 第四阶段：高压力
      await this.phase4_HighPressure();
      
      // 第五阶段：峰值压力
      await this.phase5_PeakPressure();
      
      // 第六阶段：冷却恢复
      await this.phase6_CoolDown();
      
    } catch (error: any) {
      logger.error('❌ 测试框架遇到严重错误:', error);
    } finally {
      await this.generateDetailedReport();
    }
  }

  private async phase1_WarmUp() {
    const phase: PhaseResult = {
      phaseName: 'Phase 1: 热身（低压力 - 5分钟）',
      duration: 0,
      passed: true,
      observations: [],
      issues: [],
      metrics: {}
    };
    
    const startTime = Date.now();
    const phaseDuration = 5 * 60 * 1000; // 5分钟
    const endTime = startTime + phaseDuration;
    
    logger.info('\n🐢 Phase 1: 热身（低压力 - 5分钟）');
    logger.info('─'.repeat(60));
    logger.info('目标：让系统热身，观察基线性能');
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    const qe = service.getQueryEngine();
    
    let opsInPhase = 0;
    let lastObservation = startTime;
    const responseTimes: number[] = [];
    
    while (Date.now() < endTime) {
      const queryStart = Date.now();
      
      try {
        const random = Math.random();
        if (random < 0.3) {
          qe.getEntitiesByType(CodeEntityType.CLASS);
        } else if (random < 0.6) {
          qe.searchEntitiesByName('service');
        } else {
          qe.getStatistics();
        }
        
        const responseTime = Date.now() - queryStart;
        responseTimes.push(responseTime);
        opsInPhase++;
        this.totalOperations++;
        
      } catch (error) {
        this.totalErrors++;
        phase.issues.push(`查询错误: ${error}`);
      }
      
      // 每30秒记录一次观察点
      if (Date.now() - lastObservation > 30000) {
        const observation: ObservationPoint = {
          timestamp: Date.now() - this.startTime,
          phase: '热身',
          memoryMB: this.getMemoryMB(),
          operations: this.totalOperations,
          errors: this.totalErrors,
          avgResponseTime: responseTimes.reduce((a,b) => a+b, 0) / responseTimes.length,
          notes: `QPS: ${(opsInPhase / ((Date.now() - startTime)/1000)).toFixed(1)}`
        };
        phase.observations.push(observation);
        this.allObservations.push(observation);
        
        logger.info(`  观察点 [${(observation.timestamp/1000).toFixed(0)}s]: ` +
                   `内存 ${observation.memoryMB.toFixed(1)}MB, ` +
                   `操作 ${observation.operations}, ` +
                   `延迟 ${observation.avgResponseTime.toFixed(2)}ms, ` +
                   `${observation.notes}`);
        
        lastObservation = Date.now();
      }
      
      await this.sleep(50);
    }
    
    phase.duration = Date.now() - startTime;
    phase.metrics = {
      totalOperations: opsInPhase,
      avgResponseTime: responseTimes.reduce((a,b) => a+b, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      p95ResponseTime: this.percentile(responseTimes, 95),
      errorRate: this.totalErrors / this.totalOperations
    };
    
    this.allResults.push(phase);
    service.resetAll();
    
    logger.info(`✅ Phase 1 完成: ${opsInPhase} 操作, 平均延迟 ${phase.metrics.avgResponseTime.toFixed(2)}ms`);
  }

  private async phase2_NormalLoad() {
    const phase: PhaseResult = {
      phaseName: 'Phase 2: 正常负载（10分钟）',
      duration: 0,
      passed: true,
      observations: [],
      issues: [],
      metrics: {}
    };
    
    const startTime = Date.now();
    const phaseDuration = 10 * 60 * 1000;
    const endTime = startTime + phaseDuration;
    
    logger.info('\n🐌 Phase 2: 正常负载（10分钟）');
    logger.info('─'.repeat(60));
    logger.info('目标：模拟正常使用的负载');
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    const qe = service.getQueryEngine();
    
    let opsInPhase = 0;
    let lastObservation = startTime;
    const responseTimes: number[] = [];
    
    while (Date.now() < endTime) {
      const queryStart = Date.now();
      
      try {
        const random = Math.random();
        if (random < 0.25) {
          qe.getEntitiesByType(CodeEntityType.CLASS);
        } else if (random < 0.5) {
          qe.getEntitiesByType(CodeEntityType.FUNCTION);
        } else if (random < 0.75) {
          qe.searchEntitiesByName('test');
        } else {
          qe.getStatistics();
        }
        
        const responseTime = Date.now() - queryStart;
        responseTimes.push(responseTime);
        opsInPhase++;
        this.totalOperations++;
        
      } catch (error) {
        this.totalErrors++;
        phase.issues.push(`查询错误: ${error}`);
      }
      
      // 每60秒记录一次
      if (Date.now() - lastObservation > 60000) {
        const observation: ObservationPoint = {
          timestamp: Date.now() - this.startTime,
          phase: '正常负载',
          memoryMB: this.getMemoryMB(),
          operations: this.totalOperations,
          errors: this.totalErrors,
          avgResponseTime: responseTimes.reduce((a,b) => a+b, 0) / responseTimes.length,
          notes: `QPS: ${(opsInPhase / ((Date.now() - startTime)/1000)).toFixed(1)}`
        };
        phase.observations.push(observation);
        this.allObservations.push(observation);
        
        logger.info(`  观察点 [${(observation.timestamp/1000).toFixed(0)}s]: ` +
                   `内存 ${observation.memoryMB.toFixed(1)}MB, ` +
                   `操作 ${observation.operations}, ` +
                   `延迟 ${observation.avgResponseTime.toFixed(2)}ms`);
        
        lastObservation = Date.now();
      }
      
      await this.sleep(30);
    }
    
    phase.duration = Date.now() - startTime;
    phase.metrics = {
      totalOperations: opsInPhase,
      avgResponseTime: responseTimes.reduce((a,b) => a+b, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      p95ResponseTime: this.percentile(responseTimes, 95),
      errorRate: this.totalErrors / this.totalOperations
    };
    
    this.allResults.push(phase);
    service.resetAll();
    
    logger.info(`✅ Phase 2 完成: ${opsInPhase} 操作`);
  }

  private async phase3_MediumPressure() {
    const phase: PhaseResult = {
      phaseName: 'Phase 3: 中等压力（10分钟）',
      duration: 0,
      passed: true,
      observations: [],
      issues: [],
      metrics: {}
    };
    
    const startTime = Date.now();
    const phaseDuration = 10 * 60 * 1000;
    const endTime = startTime + phaseDuration;
    
    logger.info('\n🦊 Phase 3: 中等压力（10分钟）');
    logger.info('─'.repeat(60));
    logger.info('目标：高于正常负载，测试系统稳定性');
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    const qe = service.getQueryEngine();
    
    let opsInPhase = 0;
    let lastObservation = startTime;
    const responseTimes: number[] = [];
    
    while (Date.now() < endTime) {
      const queryStart = Date.now();
      
      try {
        const random = Math.random();
        if (random < 0.2) {
          qe.getEntitiesByType(CodeEntityType.CLASS);
        } else if (random < 0.4) {
          qe.getEntitiesByType(CodeEntityType.FUNCTION);
        } else if (random < 0.6) {
          qe.searchEntitiesByName('Service');
        } else if (random < 0.8) {
          qe.searchEntitiesByName('Manager');
        } else {
          qe.getStatistics();
        }
        
        const responseTime = Date.now() - queryStart;
        responseTimes.push(responseTime);
        opsInPhase++;
        this.totalOperations++;
        
      } catch (error) {
        this.totalErrors++;
        phase.issues.push(`查询错误: ${error}`);
      }
      
      // 每60秒记录一次
      if (Date.now() - lastObservation > 60000) {
        const observation: ObservationPoint = {
          timestamp: Date.now() - this.startTime,
          phase: '中等压力',
          memoryMB: this.getMemoryMB(),
          operations: this.totalOperations,
          errors: this.totalErrors,
          avgResponseTime: responseTimes.reduce((a,b) => a+b, 0) / responseTimes.length,
          notes: `QPS: ${(opsInPhase / ((Date.now() - startTime)/1000)).toFixed(1)}`
        };
        phase.observations.push(observation);
        this.allObservations.push(observation);
        
        logger.info(`  观察点 [${(observation.timestamp/1000).toFixed(0)}s]: ` +
                   `内存 ${observation.memoryMB.toFixed(1)}MB, ` +
                   `延迟 ${observation.avgResponseTime.toFixed(2)}ms`);
        
        lastObservation = Date.now();
      }
      
      await this.sleep(15);
    }
    
    phase.duration = Date.now() - startTime;
    phase.metrics = {
      totalOperations: opsInPhase,
      avgResponseTime: responseTimes.reduce((a,b) => a+b, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      p95ResponseTime: this.percentile(responseTimes, 95),
      errorRate: this.totalErrors / this.totalOperations
    };
    
    this.allResults.push(phase);
    service.resetAll();
    
    logger.info(`✅ Phase 3 完成: ${opsInPhase} 操作`);
  }

  private async phase4_HighPressure() {
    const phase: PhaseResult = {
      phaseName: 'Phase 4: 高压力（10分钟）',
      duration: 0,
      passed: true,
      observations: [],
      issues: [],
      metrics: {}
    };
    
    const startTime = Date.now();
    const phaseDuration = 10 * 60 * 1000;
    const endTime = startTime + phaseDuration;
    
    logger.info('\n🔥 Phase 4: 高压力（10分钟）');
    logger.info('─'.repeat(60));
    logger.info('目标：接近系统极限，观察性能边界');
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    const qe = service.getQueryEngine();
    
    let opsInPhase = 0;
    let lastObservation = startTime;
    const responseTimes: number[] = [];
    
    while (Date.now() < endTime) {
      const queryStart = Date.now();
      
      try {
        const random = Math.random();
        if (random < 0.15) {
          qe.getEntitiesByType(CodeEntityType.CLASS);
        } else if (random < 0.3) {
          qe.getEntitiesByType(CodeEntityType.FUNCTION);
        } else if (random < 0.45) {
          qe.searchEntitiesByName('Service');
        } else if (random < 0.6) {
          qe.searchEntitiesByName('Manager');
        } else if (random < 0.75) {
          qe.getStatistics();
        } else {
          // 偶尔清理缓存
          service.clearCache();
        }
        
        const responseTime = Date.now() - queryStart;
        responseTimes.push(responseTime);
        opsInPhase++;
        this.totalOperations++;
        
      } catch (error) {
        this.totalErrors++;
        phase.issues.push(`查询错误: ${error}`);
      }
      
      // 每60秒记录一次
      if (Date.now() - lastObservation > 60000) {
        const observation: ObservationPoint = {
          timestamp: Date.now() - this.startTime,
          phase: '高压力',
          memoryMB: this.getMemoryMB(),
          operations: this.totalOperations,
          errors: this.totalErrors,
          avgResponseTime: responseTimes.reduce((a,b) => a+b, 0) / responseTimes.length,
          notes: `QPS: ${(opsInPhase / ((Date.now() - startTime)/1000)).toFixed(1)}`
        };
        phase.observations.push(observation);
        this.allObservations.push(observation);
        
        logger.info(`  观察点 [${(observation.timestamp/1000).toFixed(0)}s]: ` +
                   `内存 ${observation.memoryMB.toFixed(1)}MB, ` +
                   `延迟 ${observation.avgResponseTime.toFixed(2)}ms`);
        
        lastObservation = Date.now();
      }
      
      await this.sleep(10);
    }
    
    phase.duration = Date.now() - startTime;
    phase.metrics = {
      totalOperations: opsInPhase,
      avgResponseTime: responseTimes.reduce((a,b) => a+b, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      p95ResponseTime: this.percentile(responseTimes, 95),
      errorRate: this.totalErrors / this.totalOperations
    };
    
    this.allResults.push(phase);
    service.resetAll();
    
    logger.info(`✅ Phase 4 完成: ${opsInPhase} 操作`);
  }

  private async phase5_PeakPressure() {
    const phase: PhaseResult = {
      phaseName: 'Phase 5: 峰值压力（5分钟）',
      duration: 0,
      passed: true,
      observations: [],
      issues: [],
      metrics: {}
    };
    
    const startTime = Date.now();
    const phaseDuration = 5 * 60 * 1000;
    const endTime = startTime + phaseDuration;
    
    logger.info('\n⚡ Phase 5: 峰值压力（5分钟）');
    logger.info('─'.repeat(60));
    logger.info('目标：极限负载，观察系统极限表现');
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    const qe = service.getQueryEngine();
    
    let opsInPhase = 0;
    let lastObservation = startTime;
    const responseTimes: number[] = [];
    
    while (Date.now() < endTime) {
      const queryStart = Date.now();
      
      try {
        // 尽可能快地发送查询
        qe.getEntitiesByType(CodeEntityType.CLASS);
        qe.getEntitiesByType(CodeEntityType.FUNCTION);
        qe.getStatistics();
        qe.searchEntitiesByName('Service');
        
        const responseTime = Date.now() - queryStart;
        responseTimes.push(responseTime);
        opsInPhase += 4;
        this.totalOperations += 4;
        
      } catch (error) {
        this.totalErrors++;
        phase.issues.push(`查询错误: ${error}`);
      }
      
      // 每30秒记录一次
      if (Date.now() - lastObservation > 30000) {
        const observation: ObservationPoint = {
          timestamp: Date.now() - this.startTime,
          phase: '峰值压力',
          memoryMB: this.getMemoryMB(),
          operations: this.totalOperations,
          errors: this.totalErrors,
          avgResponseTime: responseTimes.reduce((a,b) => a+b, 0) / responseTimes.length,
          notes: `QPS: ${(opsInPhase / ((Date.now() - startTime)/1000)).toFixed(1)}`
        };
        phase.observations.push(observation);
        this.allObservations.push(observation);
        
        logger.info(`  观察点 [${(observation.timestamp/1000).toFixed(0)}s]: ` +
                   `内存 ${observation.memoryMB.toFixed(1)}MB, ` +
                   `延迟 ${observation.avgResponseTime.toFixed(2)}ms`);
        
        lastObservation = Date.now();
      }
      
      await this.sleep(5);
    }
    
    phase.duration = Date.now() - startTime;
    phase.metrics = {
      totalOperations: opsInPhase,
      avgResponseTime: responseTimes.reduce((a,b) => a+b, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      p95ResponseTime: this.percentile(responseTimes, 95),
      errorRate: this.totalErrors / this.totalOperations
    };
    
    this.allResults.push(phase);
    service.resetAll();
    
    logger.info(`✅ Phase 5 完成: ${opsInPhase} 操作`);
  }

  private async phase6_CoolDown() {
    const phase: PhaseResult = {
      phaseName: 'Phase 6: 冷却恢复（5分钟）',
      duration: 0,
      passed: true,
      observations: [],
      issues: [],
      metrics: {}
    };
    
    const startTime = Date.now();
    const phaseDuration = 5 * 60 * 1000;
    const endTime = startTime + phaseDuration;
    
    logger.info('\n❄️ Phase 6: 冷却恢复（5分钟）');
    logger.info('─'.repeat(60));
    logger.info('目标：观察系统恢复和内存释放');
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    const qe = service.getQueryEngine();
    
    let opsInPhase = 0;
    let lastObservation = startTime;
    const responseTimes: number[] = [];
    const memorySnapshots: number[] = [];
    
    while (Date.now() < endTime) {
      const queryStart = Date.now();
      
      try {
        qe.getStatistics();
        qe.getEntitiesByType(CodeEntityType.CLASS);
        
        const responseTime = Date.now() - queryStart;
        responseTimes.push(responseTime);
        opsInPhase++;
        this.totalOperations++;
        
      } catch (error) {
        this.totalErrors++;
        phase.issues.push(`查询错误: ${error}`);
      }
      
      // 每30秒记录一次
      if (Date.now() - lastObservation > 30000) {
        const currentMem = this.getMemoryMB();
        memorySnapshots.push(currentMem);
        
        const observation: ObservationPoint = {
          timestamp: Date.now() - this.startTime,
          phase: '冷却恢复',
          memoryMB: currentMem,
          operations: this.totalOperations,
          errors: this.totalErrors,
          avgResponseTime: responseTimes.reduce((a,b) => a+b, 0) / responseTimes.length,
          notes: memorySnapshots.length > 1 ? 
            `内存变化: ${(currentMem - memorySnapshots[0]).toFixed(1)}MB` : ''
        };
        phase.observations.push(observation);
        this.allObservations.push(observation);
        
        logger.info(`  观察点 [${(observation.timestamp/1000).toFixed(0)}s]: ` +
                   `内存 ${observation.memoryMB.toFixed(1)}MB, ` +
                   `延迟 ${observation.avgResponseTime.toFixed(2)}ms, ` +
                   observation.notes);
        
        lastObservation = Date.now();
      }
      
      await this.sleep(100);
    }
    
    phase.duration = Date.now() - startTime;
    phase.metrics = {
      totalOperations: opsInPhase,
      avgResponseTime: responseTimes.reduce((a,b) => a+b, 0) / responseTimes.length,
      memorySnapshots,
      memoryReleased: this.initialMemoryMB - memorySnapshots[memorySnapshots.length - 1]
    };
    
    this.allResults.push(phase);
    service.resetAll();
    
    logger.info(`✅ Phase 6 完成: ${opsInPhase} 操作, ` +
               `内存释放: ${phase.metrics.memoryReleased.toFixed(1)}MB`);
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

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async generateDetailedReport() {
    const totalDuration = Date.now() - this.startTime;
    const finalMemoryMB = this.getMemoryMB();
    const memoryGrowth = finalMemoryMB - this.initialMemoryMB;
    
    logger.info('\n' + '═'.repeat(80));
    logger.info('🐢🐌🦊🔥⚡❄️ 慢工出细活 - 精细化渐进测试 - 最终报告');
    logger.info('═'.repeat(80));
    
    logger.info('\n📊 测试概览:');
    logger.info(`  总测试时长: ${(totalDuration / 60000).toFixed(1)} 分钟`);
    logger.info(`  总操作数: ${this.totalOperations.toLocaleString()}`);
    logger.info(`  总错误数: ${this.totalErrors}`);
    logger.info(`  平均QPS: ${(this.totalOperations / (totalDuration / 1000)).toFixed(1)}`);
    
    logger.info('\n💾 内存分析:');
    logger.info(`  初始内存: ${this.initialMemoryMB.toFixed(1)} MB`);
    logger.info(`  最终内存: ${finalMemoryMB.toFixed(1)} MB`);
    logger.info(`  内存变化: ${memoryGrowth >= 0 ? '+' : ''}${memoryGrowth.toFixed(1)} MB`);
    
    logger.info('\n📈 各阶段详细结果:');
    for (const result of this.allResults) {
      const status = result.passed ? '✅' : '❌';
      logger.info(`\n${status} ${result.phaseName}`);
      logger.info(`   时长: ${(result.duration / 60000).toFixed(1)} 分钟`);
      logger.info(`   操作数: ${result.metrics.totalOperations?.toLocaleString() || 'N/A'}`);
      logger.info(`   平均延迟: ${result.metrics.avgResponseTime?.toFixed(2) || 'N/A'} ms`);
      logger.info(`   P95延迟: ${result.metrics.p95ResponseTime?.toFixed(2) || 'N/A'} ms`);
      logger.info(`   错误数: ${result.issues.length}`);
      
      if (result.issues.length > 0) {
        logger.info(`   ⚠️  问题:`);
        for (const issue of result.issues.slice(0, 5)) {
          logger.info(`      • ${issue}`);
        }
      }
    }
    
    logger.info('\n📊 延迟趋势分析:');
    const phaseAvgDelays = this.allResults
      .filter(r => r.metrics.avgResponseTime)
      .map(r => r.metrics.avgResponseTime);
    
    if (phaseAvgDelays.length >= 2) {
      const firstDelay = phaseAvgDelays[0];
      const lastDelay = phaseAvgDelays[phaseAvgDelays.length - 1];
      const delayDegradation = ((lastDelay - firstDelay) / firstDelay * 100).toFixed(1);
      logger.info(`  初始平均延迟: ${firstDelay.toFixed(2)} ms`);
      logger.info(`  最终平均延迟: ${lastDelay.toFixed(2)} ms`);
      logger.info(`  延迟变化: ${delayDegradation}%`);
      
      if (parseFloat(delayDegradation) > 50) {
        logger.warn(`  ⚠️  警告: 延迟退化超过50%，可能存在性能问题！`);
      } else if (parseFloat(delayDegradation) < 0) {
        logger.info(`  ✅ 优秀: 延迟有所改善！`);
      }
    }
    
    logger.info('\n💾 内存趋势分析:');
    if (this.allObservations.length >= 2) {
      const firstMem = this.allObservations[0].memoryMB;
      const lastMem = this.allObservations[this.allObservations.length - 1].memoryMB;
      const memGrowth = lastMem - firstMem;
      logger.info(`  初始内存: ${firstMem.toFixed(1)} MB`);
      logger.info(`  最终内存: ${lastMem.toFixed(1)} MB`);
      logger.info(`  内存增长: ${memGrowth >= 0 ? '+' : ''}${memGrowth.toFixed(1)} MB`);
      
      if (memGrowth > 200) {
        logger.warn(`  ⚠️  警告: 内存增长较大，可能存在内存泄漏！`);
      } else if (memGrowth < 0) {
        logger.info(`  ✅ 优秀: 内存有所下降！`);
      }
    }
    
    logger.info('\n🎯 最终评估:');
    const passedPhases = this.allResults.filter(r => r.passed).length;
    const totalPhases = this.allResults.length;
    const errorRate = this.totalErrors / this.totalOperations;
    
    if (passedPhases === totalPhases && errorRate < 0.01 && memoryGrowth < 300) {
      logger.info('🎉 🚀 完美！系统通过了所有阶段的精细化测试！');
      logger.info('🎉 🚀 系统已经可以投入生产环境使用！');
    } else if (passedPhases / totalPhases >= 0.8) {
      logger.info('✅ 良好！大部分阶段通过，系统稳定');
    } else {
      logger.warn('⚠️  需要关注测试结果');
    }
    
    logger.info('═'.repeat(80));
    
    // 输出关键指标供后续使用
    console.log('\n--- 关键指标 ---');
    console.log(`totalDuration:${totalDuration}`);
    console.log(`totalOperations:${this.totalOperations}`);
    console.log(`totalErrors:${this.totalErrors}`);
    console.log(`avgQPS:${(this.totalOperations / (totalDuration / 1000)).toFixed(2)}`);
    console.log(`initialMemoryMB:${this.initialMemoryMB.toFixed(2)}`);
    console.log(`finalMemoryMB:${finalMemoryMB.toFixed(2)}`);
    console.log(`memoryGrowthMB:${memoryGrowth.toFixed(2)}`);
    console.log(`passedPhases:${passedPhases}/${totalPhases}`);
  }
}

(async () => {
  const test = new SlowAndSteadyTestFramework();
  await test.runSlowAndSteadyTest();
})().catch(error => {
  console.error('慢工出细活测试执行异常:', error);
  process.exit(1);
});
