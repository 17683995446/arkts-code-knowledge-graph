/**
 * 🚀 终极慢工出细活混乱测试 - 真·长时间·真·大规模·真·混乱
 * 特点：
 * - 超长时间运行（数小时级）
 * - 超大规模代码库解析
 * - 超混乱的错误注入
 * - 每步都有详细日志记录
 * - 真正的极限挑战
 */

import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import { ApplicationLogger } from '../src/infrastructure/logger/Logger.js';
import { CodeEntityType, CodeRelationType } from '../src/shared/index.js';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const logger = ApplicationLogger.getInstance();

interface DetailedMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  memorySpikes: number;
  timeouts: number;
  recoveredErrors: number;
  entitiesProcessed: number;
  relationsProcessed: number;
  filesParsed: number;
  queriesExecuted: number;
  cacheHits: number;
  cacheMisses: number;
  events: Array<{timestamp: number, type: string, message: string}>;
  memoryHistory: Array<{timestamp: number, memoryMB: number}>;
  errors: Array<{timestamp: number, error: string, stack?: string}>;
}

class UltimateSlowAndSteadyChaosTest {
  private metrics: DetailedMetrics = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    memorySpikes: 0,
    timeouts: 0,
    recoveredErrors: 0,
    entitiesProcessed: 0,
    relationsProcessed: 0,
    filesParsed: 0,
    queriesExecuted: 0,
    cacheHits: 0,
    cacheMisses: 0,
    events: [],
    memoryHistory: [],
    errors: []
  };
  
  private startTime = 0;
  private initialMemory = 0;
  private maxMemory = 0;
  private previousMemory = 0;
  private testRound = 0;

  log(level: 'info' | 'warn' | 'error' | 'debug', message: string, ...args: any[]) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    this.metrics.events.push({
      timestamp: Date.now(),
      type: level,
      message: logMessage
    });
    
    switch(level) {
      case 'info':
        logger.info(logMessage, ...args);
        break;
      case 'warn':
        logger.warn(logMessage, ...args);
        break;
      case 'error':
        logger.error(logMessage, ...args);
        break;
      case 'debug':
        logger.debug(logMessage, ...args);
        break;
    }
  }

  recordError(error: any) {
    const timestamp = Date.now();
    this.metrics.errors.push({
      timestamp,
      error: error.message || String(error),
      stack: error.stack
    });
    this.log('error', `❌ 错误记录: ${error.message}`);
  }

  recordMemory() {
    const currentMemory = this.getMemoryMB();
    const timestamp = Date.now();
    
    this.metrics.memoryHistory.push({
      timestamp,
      memoryMB: currentMemory
    });
    
    // 检测内存尖峰
    if (this.previousMemory > 0 && currentMemory - this.previousMemory > 50) {
      this.metrics.memorySpikes++;
      this.log('warn', `⚠️ 内存尖峰检测: ${currentMemory.toFixed(1)}MB (增长${(currentMemory - this.previousMemory).toFixed(1)}MB)`);
    }
    
    this.previousMemory = currentMemory;
    
    if (currentMemory > this.maxMemory) {
      this.maxMemory = currentMemory;
    }
    
    return currentMemory;
  }

  getMemoryMB(): number {
    const memUsage = process.memoryUsage();
    return memUsage.heapUsed / 1024 / 1024;
  }

  async runUltimateTest() {
    this.log('info', '═══════════════════════════════════════════════════════════');
    this.log('info', '🚀 终极慢工出细活混乱测试 - 真·极限挑战');
    this.log('info', '═══════════════════════════════════════════════════════════');
    
    this.startTime = Date.now();
    this.initialMemory = this.getMemoryMB();
    this.previousMemory = this.initialMemory;
    
    this.log('info', `📊 初始内存: ${this.initialMemory.toFixed(1)} MB`);
    this.log('info', `⏰ 开始时间: ${new Date().toISOString()}`);
    
    try {
      // Phase 1: 基础稳定性测试
      await this.phase1_BasicStability();
      
      // Phase 2: 多项目并行解析
      await this.phase2_MultiProjectParsing();
      
      // Phase 3: 疯狂错误注入
      await this.phase3_InsaneErrorInjection();
      
      // Phase 4: 持久化压力测试
      await this.phase4_PersistencePressure();
      
      // Phase 5: 长时间持续运行
      await this.phase5_LongRunning();
      
      // Phase 6: 混合混乱攻击
      await this.phase6_HybridChaos();
      
    } catch (error: any) {
      this.recordError(error);
      this.log('error', '❌ 灾难性错误中断测试:', error);
    } finally {
      await this.generateFinalReport();
    }
  }

  async phase1_BasicStability() {
    this.testRound++;
    const phaseName = `📦 Phase ${this.testRound}: 基础稳定性测试`;
    this.log('info', `\n${phaseName}`);
    this.log('info', '─'.repeat(70));
    
    const ITERATIONS = 100;
    const projects = ['src', 'nest.js', 'vue-core'];
    
    for (let i = 0; i < ITERATIONS; i++) {
      this.log('debug', `🔄 稳定性迭代 ${i + 1}/${ITERATIONS}`);
      
      for (const project of projects) {
        const service = new EnhancedCodeKnowledgeGraphService();
        try {
          await service.initialize();
          this.metrics.successfulOperations++;
          
          const result = await service.analyzeProject(path.join(process.cwd(), project));
          this.metrics.entitiesProcessed += result.knowledgeGraph.getStatistics().totalEntityCount;
          this.metrics.relationsProcessed += result.knowledgeGraph.getStatistics().totalRelationCount;
          this.metrics.filesParsed++;
          
          // 执行一些查询
          const qe = service.getQueryEngine();
          qe.getStatistics();
          qe.getEntitiesByType(CodeEntityType.CLASS);
          qe.searchEntitiesByName('Service');
          this.metrics.queriesExecuted += 3;
          
          this.metrics.successfulOperations += 3;
          
          // 清理
          service.clearCache();
          service.resetAll();
          
        } catch (error) {
          this.recordError(error);
          this.metrics.failedOperations++;
        }
        
        this.metrics.totalOperations++;
      }
      
      if (i % 20 === 0) {
        const mem = this.recordMemory();
        this.log('info', `  进度 ${i + 1}/${ITERATIONS}, 内存 ${mem.toFixed(1)} MB, 已处理 ${this.metrics.entitiesProcessed} 实体`);
      }
    }
    
    this.log('info', `✅ ${phaseName} 完成`);
  }

  async phase2_MultiProjectParsing() {
    this.testRound++;
    const phaseName = `🏗️ Phase ${this.testRound}: 多项目并行解析`;
    this.log('info', `\n${phaseName}`);
    this.log('info', '─'.repeat(70));
    
    const PARALLEL_INSTANCES = 15;
    const projects = ['src', 'nest.js', 'vue-core'];
    
    this.log('info', `🚀 启动 ${PARALLEL_INSTANCES} 个并行服务实例`);
    
    const services: EnhancedCodeKnowledgeGraphService[] = [];
    for (let i = 0; i < PARALLEL_INSTANCES; i++) {
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.initialize();
      services.push(service);
    }
    
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < services.length; i++) {
      const service = services[i];
      const project = projects[i % projects.length];
      
      promises.push((async () => {
        try {
          this.log('debug', `🔄 服务 ${i} 解析项目: ${project}`);
          const result = await service.analyzeProject(path.join(process.cwd(), project));
          
          this.metrics.entitiesProcessed += result.knowledgeGraph.getStatistics().totalEntityCount;
          this.metrics.relationsProcessed += result.knowledgeGraph.getStatistics().totalRelationCount;
          this.metrics.filesParsed++;
          this.metrics.successfulOperations++;
          
          // 并行查询
          const qe = service.getQueryEngine();
          for (let q = 0; q < 100; q++) {
            qe.getStatistics();
            qe.getEntitiesByType(CodeEntityType.FUNCTION);
            qe.searchEntitiesByName('test');
            this.metrics.queriesExecuted += 3;
          }
          
          this.metrics.successfulOperations += 300;
          
        } catch (error) {
          this.recordError(error);
          this.metrics.failedOperations++;
        }
      })());
      
      this.metrics.totalOperations++;
    }
    
    await Promise.allSettled(promises);
    
    // 清理
    for (const service of services) {
      try {
        service.clearCache();
        service.resetAll();
      } catch {}
    }
    
    const mem = this.recordMemory();
    this.log('info', `📊 多项目解析完成，当前内存: ${mem.toFixed(1)} MB`);
    this.log('info', `✅ ${phaseName} 完成`);
  }

  async phase3_InsaneErrorInjection() {
    this.testRound++;
    const phaseName = `💥 Phase ${this.testRound}: 疯狂错误注入`;
    this.log('info', `\n${phaseName}`);
    this.log('info', '─'.repeat(70));
    
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.initialize();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    
    const qe = service.getQueryEngine();
    const INSANE_ITERATIONS = 500;
    
    this.log('info', `🔥 开始 ${INSANE_ITERATIONS} 次疯狂错误注入`);
    
    for (let i = 0; i < INSANE_ITERATIONS; i++) {
      try {
        const chaosType = Math.random();
        
        if (chaosType < 0.1) {
          // 空字符串查询
          qe.searchEntitiesByName('');
        } else if (chaosType < 0.2) {
          // 超长字符串
          qe.searchEntitiesByName('x'.repeat(50000));
        } else if (chaosType < 0.3) {
          // 特殊字符攻击
          qe.searchEntitiesByName('!@#$%^&*()_+-=[]{}|;:,.<>?/\\`~"\'');
        } else if (chaosType < 0.4) {
          // Unicode 攻击
          qe.searchEntitiesByName('你好世界🌍こんにちはمرحبا');
        } else if (chaosType < 0.5) {
          // 无效类型查询
          (qe as any).getEntitiesByType('INVALID_TYPE_THAT_SHOULD_NOT_EXIST');
        } else if (chaosType < 0.6) {
          // null/undefined
          (qe as any).getEntity(null);
          (qe as any).getEntity(undefined);
        } else if (chaosType < 0.7) {
          // 大量连续查询
          for (let j = 0; j < 50; j++) {
            qe.getStatistics();
            this.metrics.queriesExecuted++;
          }
        } else if (chaosType < 0.8) {
          // 混合正常和异常查询
          qe.getEntitiesByType(CodeEntityType.CLASS);
          (qe as any).searchEntitiesByName(null);
          qe.getEntitiesByType(CodeEntityType.FILE);
          this.metrics.queriesExecuted += 3;
        } else if (chaosType < 0.9) {
          // 缓存清理攻击
          service.clearCache();
          qe.getStatistics();
          service.clearCache();
          this.metrics.queriesExecuted++;
        } else {
          // 正常查询
          qe.getStatistics();
          qe.getEntitiesByType(CodeEntityType.CLASS);
          qe.searchEntitiesByName('KnowledgeGraph');
          this.metrics.queriesExecuted += 3;
        }
        
        this.metrics.successfulOperations++;
        
      } catch (error) {
        this.metrics.recoveredErrors++;
        this.metrics.failedOperations++;
      }
      
      this.metrics.totalOperations++;
      
      if (i % 100 === 0) {
        const mem = this.recordMemory();
        this.log('info', `  错误注入 ${i}/${INSANE_ITERATIONS}, 内存 ${mem.toFixed(1)} MB, 恢复 ${this.metrics.recoveredErrors} 次`);
      }
    }
    
    // 验证系统仍然正常工作
    try {
      const stats = qe.getStatistics();
      this.log('info', `✅ 系统验证通过: ${stats.totalEntityCount} 实体, ${stats.totalRelationCount} 关系`);
    } catch (error) {
      this.recordError(error);
    }
    
    service.resetAll();
    this.log('info', `✅ ${phaseName} 完成`);
  }

  async phase4_PersistencePressure() {
    this.testRound++;
    const phaseName = `💾 Phase ${this.testRound}: 持久化压力测试`;
    this.log('info', `\n${phaseName}`);
    this.log('info', '─'.repeat(70));
    
    const PERSISTENCE_CYCLES = 50;
    
    for (let cycle = 0; cycle < PERSISTENCE_CYCLES; cycle++) {
      this.log('debug', `💾 持久化周期 ${cycle + 1}/${PERSISTENCE_CYCLES}`);
      
      const service = new EnhancedCodeKnowledgeGraphService();
      await service.initialize();
      
      try {
        await service.analyzeProject(path.join(process.cwd(), 'src'));
        this.metrics.successfulOperations++;
        
        await service.saveToDisk();
        this.metrics.successfulOperations++;
        
        const stats = service.getKnowledgeGraph().getStatistics();
        this.metrics.entitiesProcessed += stats.totalEntityCount;
        this.metrics.relationsProcessed += stats.totalRelationCount;
        
        // 清理并重新加载
        service.resetAll();
        
        const loaded = await service.loadFromDisk();
        if (loaded) {
          this.metrics.successfulOperations++;
        }
        
      } catch (error) {
        this.recordError(error);
        this.metrics.failedOperations++;
      }
      
      this.metrics.totalOperations++;
      
      if (cycle % 10 === 0) {
        const mem = this.recordMemory();
        this.log('info', `  持久化周期 ${cycle + 1}/${PERSISTENCE_CYCLES}, 内存 ${mem.toFixed(1)} MB`);
      }
    }
    
    this.log('info', `✅ ${phaseName} 完成`);
  }

  async phase5_LongRunning() {
    this.testRound++;
    const phaseName = `⏱️ Phase ${this.testRound}: 长时间持续运行`;
    this.log('info', `\n${phaseName}`);
    this.log('info', '─'.repeat(70));
    
    const LONG_RUN_MINUTES = 2; // 测试时用2分钟，实际可以更长
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.initialize();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    
    const endTime = Date.now() + LONG_RUN_MINUTES * 60 * 1000;
    const qe = service.getQueryEngine();
    
    this.log('info', `🚀 开始 ${LONG_RUN_MINUTES} 分钟持续运行`);
    
    let iteration = 0;
    
    while (Date.now() < endTime) {
      try {
        // 各种操作混合
        qe.getStatistics();
        qe.getEntitiesByType(CodeEntityType.CLASS);
        qe.getEntitiesByType(CodeEntityType.FUNCTION);
        qe.getEntitiesByType(CodeEntityType.FILE);
        qe.searchEntitiesByName('Test');
        qe.searchEntitiesByName('Service');
        qe.searchEntitiesByName('Graph');
        
        this.metrics.queriesExecuted += 7;
        this.metrics.successfulOperations += 7;
        
        // 随机缓存清理
        if (Math.random() < 0.1) {
          service.clearCache();
        }
        
        // 随机内存记录
        if (iteration % 100 === 0) {
          this.recordMemory();
        }
        
      } catch (error) {
        this.recordError(error);
        this.metrics.failedOperations++;
      }
      
      this.metrics.totalOperations++;
      iteration++;
      
      // 短暂休息防止CPU过载
      if (iteration % 1000 === 0) {
        const mem = this.recordMemory();
        const elapsed = ((Date.now() - this.startTime) / 1000 / 60).toFixed(1);
        this.log('info', `  持续运行 ${elapsed} 分钟, 迭代 ${iteration}, 内存 ${mem.toFixed(1)} MB`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    service.resetAll();
    this.log('info', `✅ ${phaseName} 完成`);
  }

  async phase6_HybridChaos() {
    this.testRound++;
    const phaseName = `🌪️ Phase ${this.testRound}: 混合混乱攻击`;
    this.log('info', `\n${phaseName}`);
    this.log('info', '─'.repeat(70));
    
    const CHAOS_CYCLES = 25;
    
    for (let cycle = 0; cycle < CHAOS_CYCLES; cycle++) {
      this.log('debug', `🌪️ 混合混乱周期 ${cycle + 1}/${CHAOS_CYCLES}`);
      
      const chaosMode = Math.floor(Math.random() * 5);
      
      switch (chaosMode) {
        case 0:
          await this.chaosMode0_ConcurrentCreation();
          break;
        case 1:
          await this.chaosMode1_RapidPersistence();
          break;
        case 2:
          await this.chaosMode2_QueryFlood();
          break;
        case 3:
          await this.chaosMode3_MemoryHammer();
          break;
        case 4:
          await this.chaosMode4_AllInOne();
          break;
      }
      
      this.metrics.totalOperations++;
      
      if (cycle % 5 === 0) {
        const mem = this.recordMemory();
        this.log('info', `  混合混乱周期 ${cycle + 1}/${CHAOS_CYCLES}, 内存 ${mem.toFixed(1)} MB`);
      }
    }
    
    this.log('info', `✅ ${phaseName} 完成`);
  }

  async chaosMode0_ConcurrentCreation() {
    const services: EnhancedCodeKnowledgeGraphService[] = [];
    
    // 疯狂创建服务
    for (let i = 0; i < 10; i++) {
      const service = new EnhancedCodeKnowledgeGraphService();
      services.push(service);
    }
    
    // 并行初始化和解析
    const promises = services.map(async (s, i) => {
      try {
        await s.initialize();
        await s.analyzeProject(path.join(process.cwd(), i % 2 === 0 ? 'src' : 'nest.js'));
        this.metrics.successfulOperations += 2;
      } catch (error) {
        this.recordError(error);
        this.metrics.failedOperations++;
      }
    });
    
    await Promise.allSettled(promises);
    
    // 疯狂清理
    for (const service of services) {
      try {
        service.clearCache();
        service.resetAll();
      } catch {}
    }
  }

  async chaosMode1_RapidPersistence() {
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.initialize();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    
    for (let i = 0; i < 30; i++) {
      try {
        await service.saveToDisk();
        await service.loadFromDisk();
        this.metrics.successfulOperations += 2;
      } catch (error) {
        this.recordError(error);
        this.metrics.failedOperations++;
      }
    }
    
    service.resetAll();
  }

  async chaosMode2_QueryFlood() {
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.initialize();
    await service.analyzeProject(path.join(process.cwd(), 'src'));
    const qe = service.getQueryEngine();
    
    const floodPromises: Promise<void>[] = [];
    
    for (let i = 0; i < 500; i++) {
      floodPromises.push((async () => {
        try {
          qe.getStatistics();
          qe.getEntitiesByType(CodeEntityType.CLASS);
          qe.searchEntitiesByName(`query${i}`);
          this.metrics.queriesExecuted += 3;
          this.metrics.successfulOperations += 3;
        } catch (error) {
          this.recordError(error);
          this.metrics.failedOperations++;
        }
      })());
    }
    
    await Promise.allSettled(floodPromises);
    service.resetAll();
  }

  async chaosMode3_MemoryHammer() {
    const services: EnhancedCodeKnowledgeGraphService[] = [];
    
    // 创建大量实例
    for (let i = 0; i < 8; i++) {
      const service = new EnhancedCodeKnowledgeGraphService();
      services.push(service);
    }
    
    // 全部加载同一个大项目
    const promises = services.map(async (s) => {
      try {
        await s.initialize();
        await s.analyzeProject(path.join(process.cwd(), 'nest.js'));
        this.metrics.successfulOperations += 2;
      } catch (error) {
        this.recordError(error);
        this.metrics.failedOperations++;
      }
    });
    
    await Promise.allSettled(promises);
    
    // 全部清理
    for (const service of services) {
      try {
        service.resetAll();
      } catch {}
    }
    
    this.recordMemory();
  }

  async chaosMode4_AllInOne() {
    // 所有功能一起上
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.initialize();
    await service.analyzeProject(path.join(process.cwd(), 'vue-core'));
    
    const qe = service.getQueryEngine();
    
    for (let i = 0; i < 100; i++) {
      try {
        qe.getStatistics();
        qe.getEntitiesByType(CodeEntityType.CLASS);
        qe.getEntitiesByType(CodeEntityType.FUNCTION);
        qe.getEntitiesByType(CodeEntityType.FILE);
        qe.searchEntitiesByName('Component');
        qe.searchEntitiesByName('Vue');
        qe.searchEntitiesByName('App');
        
        if (i % 10 === 0) {
          service.clearCache();
        }
        
        this.metrics.queriesExecuted += 7;
        this.metrics.successfulOperations += 7;
      } catch (error) {
        this.recordError(error);
        this.metrics.failedOperations++;
      }
    }
    
    service.resetAll();
  }

  async generateFinalReport() {
    const totalDuration = Date.now() - this.startTime;
    const finalMemory = this.getMemoryMB();
    const memoryGrowth = finalMemory - this.initialMemory;
    
    this.log('info', '\n' + '═'.repeat(80));
    this.log('info', '🎉 🚀 终极慢工出细活混乱测试 - 最终报告');
    this.log('info', '═'.repeat(80));
    
    this.log('info', '\n📊 基本信息:');
    this.log('info', `  总时长: ${(totalDuration / 1000 / 60).toFixed(2)} 分钟`);
    this.log('info', `  测试阶段: ${this.testRound}`);
    this.log('info', `  开始时间: ${new Date(this.startTime).toISOString()}`);
    this.log('info', `  结束时间: ${new Date().toISOString()}`);
    
    this.log('info', '\n💾 内存分析:');
    this.log('info', `  初始内存: ${this.initialMemory.toFixed(1)} MB`);
    this.log('info', `  峰值内存: ${this.maxMemory.toFixed(1)} MB`);
    this.log('info', `  最终内存: ${finalMemory.toFixed(1)} MB`);
    this.log('info', `  内存变化: ${memoryGrowth >= 0 ? '+' : ''}${memoryGrowth.toFixed(1)} MB`);
    this.log('info', `  内存尖峰: ${this.metrics.memorySpikes} 次`);
    this.log('info', `  内存快照: ${this.metrics.memoryHistory.length} 个`);
    
    this.log('info', '\n🎯 操作统计:');
    this.log('info', `  总操作数: ${this.metrics.totalOperations.toLocaleString()}`);
    this.log('info', `  成功操作: ${this.metrics.successfulOperations.toLocaleString()}`);
    this.log('info', `  失败操作: ${this.metrics.failedOperations}`);
    this.log('info', `  恢复错误: ${this.metrics.recoveredErrors}`);
    this.log('info', `  实体处理: ${this.metrics.entitiesProcessed.toLocaleString()}`);
    this.log('info', `  关系处理: ${this.metrics.relationsProcessed.toLocaleString()}`);
    this.log('info', `  文件解析: ${this.metrics.filesParsed}`);
    this.log('info', `  查询执行: ${this.metrics.queriesExecuted.toLocaleString()}`);
    
    const successRate = this.metrics.totalOperations > 0 
      ? (this.metrics.successfulOperations / this.metrics.totalOperations * 100).toFixed(2)
      : '0.00';
    
    this.log('info', `  成功率: ${successRate}%`);
    
    if (this.metrics.errors.length > 0) {
      this.log('info', '\n❌ 错误记录:');
      this.log('info', `  总错误数: ${this.metrics.errors.length}`);
      for (let i = 0; i < Math.min(this.metrics.errors.length, 10); i++) {
        const err = this.metrics.errors[i];
        const time = new Date(err.timestamp).toISOString();
        this.log('info', `  ${i + 1}. [${time}] ${err.error}`);
      }
      if (this.metrics.errors.length > 10) {
        this.log('info', `  ... 还有 ${this.metrics.errors.length - 10} 个错误`);
      }
    }
    
    this.log('info', '\n🎯 最终评估:');
    
    let score = 100;
    
    // 成功率评分
    const failRate = this.metrics.failedOperations / Math.max(1, this.metrics.totalOperations);
    if (failRate > 0.2) score -= 40;
    else if (failRate > 0.1) score -= 20;
    else if (failRate > 0.05) score -= 10;
    else if (failRate > 0.01) score -= 5;
    
    // 内存评分
    if (memoryGrowth > 1000) score -= 40;
    else if (memoryGrowth > 500) score -= 20;
    else if (memoryGrowth > 200) score -= 10;
    else if (memoryGrowth > 100) score -= 5;
    
    // 错误数量评分
    if (this.metrics.errors.length > 50) score -= 30;
    else if (this.metrics.errors.length > 20) score -= 15;
    else if (this.metrics.errors.length > 10) score -= 5;
    
    if (score >= 90) {
      this.log('info', `  🎉 🚀 完美！终极测试得分 ${score}/100`);
      this.log('info', `  🎉 🚀 系统经受住了真正的极限挑战！`);
    } else if (score >= 70) {
      this.log('info', `  ✅ 良好！终极测试得分 ${score}/100`);
      this.log('info', `  ✅ 系统表现出色，可以投入生产使用`);
    } else if (score >= 50) {
      this.log('info', `  ⚠️ 合格！终极测试得分 ${score}/100`);
      this.log('info', `  ⚠️ 系统基本可用，但建议进一步优化`);
    } else {
      this.log('warn', `  ❌ 需要改进！终极测试得分 ${score}/100`);
    }
    
    this.log('info', '═'.repeat(80));
    
    // 输出关键指标
    console.log('\n--- 终极测试关键指标 ---');
    console.log(`totalDurationMinutes:${(totalDuration / 1000 / 60).toFixed(2)}`);
    console.log(`totalOperations:${this.metrics.totalOperations}`);
    console.log(`successfulOperations:${this.metrics.successfulOperations}`);
    console.log(`failedOperations:${this.metrics.failedOperations}`);
    console.log(`recoveredErrors:${this.metrics.recoveredErrors}`);
    console.log(`entitiesProcessed:${this.metrics.entitiesProcessed}`);
    console.log(`relationsProcessed:${this.metrics.relationsProcessed}`);
    console.log(`filesParsed:${this.metrics.filesParsed}`);
    console.log(`queriesExecuted:${this.metrics.queriesExecuted}`);
    console.log(`errorCount:${this.metrics.errors.length}`);
    console.log(`memorySpikes:${this.metrics.memorySpikes}`);
    console.log(`initialMemoryMB:${this.initialMemory.toFixed(2)}`);
    console.log(`maxMemoryMB:${this.maxMemory.toFixed(2)}`);
    console.log(`finalMemoryMB:${finalMemory.toFixed(2)}`);
    console.log(`memoryGrowthMB:${memoryGrowth.toFixed(2)}`);
    console.log(`successRate:${successRate}%`);
    console.log(`ultimateScore:${score}`);
    
    // 保存报告到文件
    const reportData = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      performance: {
        totalDurationMs: totalDuration,
        initialMemoryMB: this.initialMemory,
        maxMemoryMB: this.maxMemory,
        finalMemoryMB: finalMemory,
        memoryGrowthMB: memoryGrowth,
        successRate: parseFloat(successRate),
        ultimateScore: score
      }
    };
    
    const reportPath = path.join(process.cwd(), 'ultimate-chaos-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    this.log('info', `\n📄 详细报告已保存到: ${reportPath}`);
  }
}

// 启动测试
(async () => {
  console.log('🚀 准备启动终极慢工出细活混乱测试...');
  console.log('⏰ 请耐心等待，这将是一个漫长而彻底的测试\n');
  
  const test = new UltimateSlowAndSteadyChaosTest();
  await test.runUltimateTest();
})().catch(error => {
  console.error('❌ 终极测试执行异常:', error);
  process.exit(1);
});
