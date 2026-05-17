#!/usr/bin/env node
/**
 * 性能瓶颈深度分析
 */
import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import chalk from 'chalk';
import * as fs from 'fs';

console.log(chalk.bold.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🔍 性能瓶颈深度分析                                        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));

interface PerformanceMetric {
  phase: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memory?: number;
}

async function analyzePerformance() {
  console.log(chalk.bold.magenta('\n📊 开始性能分析...\n'));
  
  const service = new EnhancedCodeKnowledgeGraphService();
  
  const metrics: PerformanceMetric[] = [];
  
  console.log(chalk.cyan('阶段1: 初始化服务'));
  const initStart = Date.now();
  await service.initialize();
  metrics.push({
    phase: 'Service Initialization',
    startTime: initStart,
    endTime: Date.now(),
    duration: Date.now() - initStart,
    memory: process.memoryUsage().heapUsed / 1024 / 1024,
  });
  console.log(chalk.green(`   ✅ 完成: ${metrics[0].duration}ms, 内存: ${metrics[0].memory?.toFixed(2)}MB\n`));
  
  console.log(chalk.cyan('阶段2: 项目分析'));
  const analysisStart = Date.now();
  const result = await service.analyzeProject('./nest.js/packages/common');
  metrics.push({
    phase: 'Project Analysis',
    startTime: analysisStart,
    endTime: Date.now(),
    duration: Date.now() - analysisStart,
    memory: process.memoryUsage().heapUsed / 1024 / 1024,
  });
  
  const stats = result.knowledgeGraph.getStatistics();
  console.log(chalk.green(`   ✅ 完成: ${metrics[1].duration}ms`));
  console.log(chalk.gray(`      - 文件数: ${stats.fileEntityCount}`));
  console.log(chalk.gray(`      - 节点数: ${stats.totalEntityCount}`));
  console.log(chalk.gray(`      - 关系数: ${stats.totalRelationCount}`));
  console.log(chalk.gray(`      - 内存: ${metrics[1].memory?.toFixed(2)}MB\n`));
  
  console.log(chalk.cyan('阶段3: 知识图谱构建'));
  const graphStart = Date.now();
  await service.analyzeProject('./nest.js/packages/core');
  metrics.push({
    phase: 'Knowledge Graph Building',
    startTime: graphStart,
    endTime: Date.now(),
    duration: Date.now() - graphStart,
    memory: process.memoryUsage().heapUsed / 1024 / 1024,
  });
  console.log(chalk.green(`   ✅ 完成: ${metrics[2].duration}ms, 内存: ${metrics[2].memory?.toFixed(2)}MB\n`));
  
  console.log(chalk.cyan('阶段4: 查询性能'));
  const queryStart = Date.now();
  const engine = service.getQueryEngine();
  const queries = ['Module', 'Service', 'export', 'Interface'];
  const queryResults: number[] = [];
  
  for (const query of queries) {
    const qStart = Date.now();
    const results = engine.searchEntitiesByName(query);
    queryResults.push(Date.now() - qStart);
    console.log(chalk.gray(`      "${query}": ${queryResults[queryResults.length - 1]}ms (${results.length} 结果)`));
  }
  
  metrics.push({
    phase: 'Query Performance',
    startTime: queryStart,
    endTime: Date.now(),
    duration: Date.now() - queryStart,
    memory: process.memoryUsage().heapUsed / 1024 / 1024,
  });
  console.log(chalk.green(`   ✅ 完成: ${metrics[3].duration}ms (平均: ${(queryResults.reduce((a, b) => a + b, 0) / queryResults.length).toFixed(2)}ms)\n`));
  
  console.log(chalk.cyan('阶段5: 缓存清理'));
  const cacheStart = Date.now();
  service.clearCache();
  metrics.push({
    phase: 'Cache Clear',
    startTime: cacheStart,
    endTime: Date.now(),
    duration: Date.now() - cacheStart,
    memory: process.memoryUsage().heapUsed / 1024 / 1024,
  });
  console.log(chalk.green(`   ✅ 完成: ${metrics[4].duration}ms, 内存: ${metrics[4].memory?.toFixed(2)}MB\n`));
  
  console.log(chalk.cyan('阶段6: 再次分析'));
  const reanalysisStart = Date.now();
  await service.analyzeProject('./examples/sample-project');
  metrics.push({
    phase: 'Re-analysis',
    startTime: reanalysisStart,
    endTime: Date.now(),
    duration: Date.now() - reanalysisStart,
    memory: process.memoryUsage().heapUsed / 1024 / 1024,
  });
  console.log(chalk.green(`   ✅ 完成: ${metrics[5].duration}ms, 内存: ${metrics[5].memory?.toFixed(2)}MB\n`));
  
  // 性能分析报告
  console.log(chalk.bold.magenta('\n═══════════════════════════════════════════════════════════'));
  console.log(chalk.bold.magenta('📊 性能分析报告'));
  console.log(chalk.bold.magenta('═══════════════════════════════════════════════════════════\n'));
  
  metrics.forEach((metric, idx) => {
    const bar = '█'.repeat(Math.min(50, Math.floor(metric.duration! / 500)));
    const percentage = ((metric.duration! / metrics.reduce((sum, m) => sum + (m.duration || 0), 0)) * 100).toFixed(1);
    
    console.log(`${idx + 1}. ${metric.phase}`);
    console.log(`   ⏱  时间: ${metric.duration}ms (${percentage}%)`);
    console.log(`   💾 内存: ${metric.memory?.toFixed(2)}MB`);
    console.log(`   📊 ${bar}`);
    
    if (metric.duration! > 10000) {
      console.log(chalk.yellow(`   ⚠️  耗时较长，建议优化`));
    }
    console.log();
  });
  
  // 识别瓶颈
  const totalDuration = metrics.reduce((sum, m) => sum + (m.duration || 0), 0);
  const bottlenecks = metrics.filter(m => (m.duration || 0) / totalDuration > 0.4);
  
  console.log(chalk.bold.cyan('\n🎯 性能瓶颈识别:'));
  if (bottlenecks.length > 0) {
    bottlenecks.forEach(b => {
      console.log(chalk.red(`   ❌ ${b.phase}: ${b.duration}ms (${((b.duration! / totalDuration) * 100).toFixed(1)}% of total)`));
    });
  } else {
    console.log(chalk.green('   ✅ 未发现明显瓶颈'));
  }
  
  // 优化建议
  console.log(chalk.bold.cyan('\n💡 优化建议:'));
  const analysisMetric = metrics.find(m => m.phase === 'Project Analysis');
  if (analysisMetric && analysisMetric.duration && stats.fileEntityCount) {
    const filesPerSecond = stats.fileEntityCount / (analysisMetric.duration / 1000);
    console.log(`   - 当前解析速度: ${filesPerSecond.toFixed(2)} 文件/秒`);
    
    if (filesPerSecond < 10) {
      console.log(chalk.yellow('   - ⚠️  建议: 优化解析器或使用并行处理'));
    }
    
    const msPerFile = analysisMetric.duration / stats.fileEntityCount;
    console.log(`   - 每文件平均耗时: ${msPerFile.toFixed(2)}ms`);
    
    if (msPerFile > 100) {
      console.log(chalk.yellow('   - ⚠️  建议: 检查文件解析复杂度'));
    }
  }
  
  // 保存报告
  const report = {
    timestamp: new Date().toISOString(),
    metrics: metrics.map(m => ({
      phase: m.phase,
      duration: m.duration,
      memory: m.memory,
      percentage: ((m.duration || 0) / totalDuration * 100).toFixed(2) + '%',
    })),
    statistics: stats,
    bottlenecks: bottlenecks.map(b => b.phase),
  };
  
  fs.writeFileSync('./performance-analysis-report.json', JSON.stringify(report, null, 2));
  console.log(chalk.green('\n📄 报告已保存: performance-analysis-report.json\n'));
}

analyzePerformance().catch(console.error);
