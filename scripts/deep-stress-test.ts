#!/usr/bin/env node
/**
 * 深度压力测试 - 特复杂高难度实践
 */
import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

console.log(chalk.bold.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🚀 深度压力测试 - 特复杂高难度实践                          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));

interface IssueFound {
  severity: 'critical' | 'high' | 'medium' | 'low';
  component: string;
  issue: string;
  recommendation: string;
}

const issuesFound: IssueFound[] = [];

function logIssue(severity: string, component: string, issue: string, recommendation: string) {
  const issueObj: IssueFound = {
    severity: severity as any,
    component,
    issue,
    recommendation,
  };
  issuesFound.push(issueObj);
  
  const colorFn = severity === 'critical' ? chalk.red : 
                  severity === 'high' ? chalk.yellow : 
                  severity === 'medium' ? chalk.blue : chalk.gray;
  
  console.log(colorFn(`\n⚠️  [${severity.toUpperCase()}] ${component}`));
  console.log(colorFn(`   问题: ${issue}`));
  console.log(chalk.cyan(`   建议: ${recommendation}`));
}

async function testUltraLargeProject() {
  console.log(chalk.bold.magenta('\n📦 测试1: 超大规模项目解析 (完整 Vue 3)'));
  
  const service = new EnhancedCodeKnowledgeGraphService();
  await service.initialize();
  
  const startMem = process.memoryUsage().heapUsed;
  const start = Date.now();
  
  try {
    const result = await service.analyzeProject('./vue-core/packages');
    const stats = result.knowledgeGraph.getStatistics();
    const duration = Date.now() - start;
    const endMem = process.memoryUsage().heapUsed;
    const memUsed = (endMem - startMem) / 1024 / 1024;
    
    console.log(chalk.green(`\n✅ 解析成功:`));
    console.log(`   - 文件数: ${stats.fileEntityCount}`);
    console.log(`   - 节点数: ${stats.totalEntityCount}`);
    console.log(`   - 关系数: ${stats.totalRelationCount}`);
    console.log(`   - 耗时: ${duration}ms`);
    console.log(`   - 内存: ${memUsed.toFixed(2)}MB`);
    
    // 性能评估
    const filesPerSecond = stats.fileEntityCount / (duration / 1000);
    if (filesPerSecond < 10) {
      logIssue('medium', 'Performance', 
        `文件解析速度较慢: ${filesPerSecond.toFixed(2)} 文件/秒`,
        '考虑优化解析器或使用并行处理'
      );
    }
    
    // 内存评估
    const memPerFile = memUsed / stats.fileEntityCount;
    if (memPerFile > 1) {
      logIssue('medium', 'Memory', 
        `单个文件内存占用较高: ${memPerFile.toFixed(2)}MB/文件`,
        '检查内存泄漏或优化数据结构'
      );
    }
    
    return result;
  } catch (error: any) {
    logIssue('critical', 'EnhancedCodeKnowledgeGraphService',
      `超大规模项目解析失败: ${error.message}`,
      '检查内存限制和解析器稳定性'
    );
    throw error;
  }
}

async function testMemoryStability() {
  console.log(chalk.bold.magenta('\n📦 测试2: 内存稳定性测试'));
  
  const service = new EnhancedCodeKnowledgeGraphService();
  await service.initialize();
  
  const initialMem = process.memoryUsage().heapUsed / 1024 / 1024;
  const memorySnapshots: number[] = [];
  
  console.log(chalk.gray('   初始内存:', initialMem.toFixed(2), 'MB'));
  
  for (let i = 0; i < 5; i++) {
    await service.analyzeProject('./nest.js/packages/common');
    const mem = process.memoryUsage().heapUsed / 1024 / 1024;
    memorySnapshots.push(mem);
    console.log(chalk.gray(`   第 ${i + 1} 次: ${mem.toFixed(2)} MB`));
    
    // 清理缓存
    service.clearCache();
  }
  
  const finalMem = memorySnapshots[memorySnapshots.length - 1];
  const memGrowth = ((finalMem - initialMem) / initialMem * 100);
  
  console.log(chalk.green(`\n   内存增长: ${memGrowth.toFixed(2)}%`));
  
  if (memGrowth > 50) {
    logIssue('high', 'Memory',
      `内存增长过高: ${memGrowth.toFixed(2)}% (初始 ${initialMem.toFixed(2)}MB -> 最终 ${finalMem.toFixed(2)}MB)`,
      '检查 clearCache 实现和内存泄漏'
    );
  }
  
  return { initialMem, finalMem, memGrowth };
}

async function testConcurrentStress() {
  console.log(chalk.bold.magenta('\n📦 测试3: 并发压力测试'));
  
  const services: EnhancedCodeKnowledgeGraphService[] = [];
  const startMem = process.memoryUsage().heapUsed / 1024 / 1024;
  
  console.log(chalk.gray('   初始内存:', startMem.toFixed(2), 'MB'));
  console.log(chalk.gray('   启动 3 个并发服务...'));
  
  for (let i = 0; i < 3; i++) {
    services.push(new EnhancedCodeKnowledgeGraphService());
    await services[i].initialize();
  }
  
  const afterInitMem = process.memoryUsage().heapUsed / 1024 / 1024;
  console.log(chalk.gray(`   初始化后内存: ${afterInitMem.toFixed(2)} MB`));
  
  console.log(chalk.gray('   开始并发分析...'));
  
  const projects = [
    './nest.js/packages/common',
    './nest.js/packages/core',
    './nest.js/packages/microservices'
  ];
  
  try {
    const results = await Promise.all(
      projects.map((proj, idx) => services[idx].analyzeProject(proj))
    );
    
    console.log(chalk.green(`\n   ✅ 全部成功!`));
    results.forEach((r, i) => {
      const stats = r.knowledgeGraph.getStatistics();
      console.log(chalk.gray(`   项目 ${i + 1}: ${stats.fileEntityCount} 文件, ${stats.totalEntityCount} 节点`));
    });
    
    const finalMem = process.memoryUsage().heapUsed / 1024 / 1024;
    const memPerService = (finalMem - startMem) / 3;
    
    console.log(chalk.green(`   总内存: ${finalMem.toFixed(2)} MB`));
    console.log(chalk.green(`   每个服务平均内存: ${memPerService.toFixed(2)} MB`));
    
    if (memPerService > 200) {
      logIssue('medium', 'Concurrency',
        `单个服务内存占用过高: ${memPerService.toFixed(2)}MB`,
        '考虑使用单例模式或连接池'
      );
    }
  } catch (error: any) {
    logIssue('critical', 'Concurrency',
      `并发分析失败: ${error.message}`,
      '检查并发控制和资源管理'
    );
  }
  
  // 清理
  services.forEach(s => s.clearCache());
}

async function testQueryPerformance() {
  console.log(chalk.bold.magenta('\n📦 测试4: 查询性能测试'));
  
  const service = new EnhancedCodeKnowledgeGraphService();
  await service.initialize();
  await service.analyzeProject('./nest.js/packages');
  
  const queryEngine = service.getQueryEngine();
  
  const queries = [
    { name: 'Module', desc: '类名搜索' },
    { name: 'Service', desc: '接口搜索' },
    { name: 'export', desc: '导出搜索' },
    { name: 'Interface', desc: '接口类型搜索' },
  ];
  
  const durations: number[] = [];
  
  for (const query of queries) {
    const start = Date.now();
    const results = queryEngine.searchEntitiesByName(query.name);
    const duration = Date.now() - start;
    durations.push(duration);
    
    const perfColor = duration < 100 ? chalk.green : duration < 500 ? chalk.yellow : chalk.red;
    console.log(perfColor(`   ${query.desc} "${query.name}": ${duration}ms (${results.length} 结果)`));
    
    if (duration > 1000) {
      logIssue('medium', 'QueryEngine',
        `查询 "${query.name}" 性能较差: ${duration}ms`,
        '优化查询算法或添加索引'
      );
    }
  }
  
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  console.log(chalk.cyan(`   平均查询时间: ${avgDuration.toFixed(2)}ms`));
}

async function testBoundaryConditions() {
  console.log(chalk.bold.magenta('\n📦 测试5: 边界条件测试'));
  
  const service = new EnhancedCodeKnowledgeGraphService();
  await service.initialize();
  
  const tests = [
    { name: '空项目', path: './examples/sample-project', expected: 'success' },
    { name: '不存在路径', path: './non-existent-path', expected: 'fail' },
  ];
  
  for (const test of tests) {
    try {
      await service.analyzeProject(test.path);
      if (test.expected === 'fail') {
        logIssue('high', 'ErrorHandling',
          `边界测试 "${test.name}" 应该失败但成功了`,
          '检查错误处理逻辑'
        );
      } else {
        console.log(chalk.green(`   ✅ ${test.name}: 正常`));
      }
    } catch (error: any) {
      if (test.expected === 'success') {
        logIssue('medium', 'ErrorHandling',
          `边界测试 "${test.name}" 应该成功但失败了: ${error.message}`,
          '修复边界条件处理'
        );
      } else {
        console.log(chalk.green(`   ✅ ${test.name}: 正确捕获错误`));
      }
    }
  }
  
  // 测试 clearCache
  try {
    await service.analyzeProject('./nest.js/packages/common');
    service.clearCache();
    console.log(chalk.green('   ✅ clearCache: 正常工作'));
  } catch (error: any) {
    logIssue('critical', 'EnhancedCodeKnowledgeGraphService',
      `clearCache 失败: ${error.message}`,
      '修复缓存清理实现'
    );
  }
}

async function generateReport() {
  console.log(chalk.bold.magenta('\n═══════════════════════════════════════════════════════════'));
  console.log(chalk.bold.magenta('📊 深度压力测试报告'));
  console.log(chalk.bold.magenta('═══════════════════════════════════════════════════════════\n'));
  
  console.log(chalk.bold(`发现的问题数量: ${issuesFound.length}`));
  
  const bySeverity = {
    critical: issuesFound.filter(i => i.severity === 'critical'),
    high: issuesFound.filter(i => i.severity === 'high'),
    medium: issuesFound.filter(i => i.severity === 'medium'),
    low: issuesFound.filter(i => i.severity === 'low'),
  };
  
  console.log(chalk.red(`\n🔴 严重问题: ${bySeverity.critical.length}`));
  bySeverity.critical.forEach((issue, i) => {
    console.log(chalk.red(`   ${i + 1}. [${issue.component}] ${issue.issue}`));
  });
  
  console.log(chalk.yellow(`\n🟡 高优先级: ${bySeverity.high.length}`));
  bySeverity.high.forEach((issue, i) => {
    console.log(chalk.yellow(`   ${i + 1}. [${issue.component}] ${issue.issue}`));
  });
  
  console.log(chalk.blue(`\n🔵 中优先级: ${bySeverity.medium.length}`));
  bySeverity.medium.forEach((issue, i) => {
    console.log(chalk.blue(`   ${i + 1}. [${issue.component}] ${issue.issue}`));
  });
  
  if (issuesFound.length === 0) {
    console.log(chalk.bold.green('\n✅ 所有测试通过! 系统表现优秀。\n'));
    return;
  }
  
  // 保存报告
  const report = {
    timestamp: new Date().toISOString(),
    totalIssues: issuesFound.length,
    bySeverity,
    recommendations: issuesFound.map(i => ({
      component: i.component,
      issue: i.issue,
      recommendation: i.recommendation,
      severity: i.severity,
    })),
  };
  
  const reportPath = './deep-stress-test-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(chalk.cyan(`\n📄 详细报告已保存: ${reportPath}`));
  
  if (bySeverity.critical.length > 0 || bySeverity.high.length > 0) {
    console.log(chalk.bold.red('\n⚠️  发现严重问题，需要优先修复！\n'));
  } else {
    console.log(chalk.bold.green('\n🎉 系统表现良好，仅有小问题需要优化。\n'));
  }
}

async function main() {
  try {
    console.log(chalk.bold.cyan('\n🚀 开始深度压力测试...\n'));
    
    await testUltraLargeProject();
    await testMemoryStability();
    await testConcurrentStress();
    await testQueryPerformance();
    await testBoundaryConditions();
    
    await generateReport();
    
    process.exit(issuesFound.filter(i => i.severity === 'critical').length > 0 ? 1 : 0);
    
  } catch (error: any) {
    console.error(chalk.red(`\n💥 测试崩溃: ${error.message}`));
    console.error(error.stack);
    process.exit(1);
  }
}

main();
