#!/usr/bin/env node
/**
 * 长期压力测试 - 发现系统缺陷
 */
import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import chalk from 'chalk';
import * as fs from 'fs';

console.log(chalk.bold.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🚀 长期压力测试 - 发现系统缺陷                             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));

interface SystemIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  description: string;
  location?: string;
  recommendation: string;
  discovered: boolean;
}

const issues: SystemIssue[] = [];
let testCount = 0;
let passCount = 0;
let failCount = 0;

function logIssue(issue: SystemIssue) {
  issues.push(issue);
  
  const colors = {
    critical: chalk.red,
    high: chalk.yellow,
    medium: chalk.blue,
    low: chalk.gray
  };
  
  const colorFn = colors[issue.severity];
  console.log(colorFn(`\n⚠️  [${issue.severity.toUpperCase()}] ${issue.category}`));
  console.log(colorFn(`   问题: ${issue.description}`));
  if (issue.location) {
    console.log(chalk.cyan(`   位置: ${issue.location}`));
  }
  console.log(chalk.green(`   建议: ${issue.recommendation}`));
  
  failCount++;
}

async function test1_BasicFunctionality() {
  console.log(chalk.bold.magenta('\n📦 测试1: 基本功能测试'));
  testCount++;
  
  try {
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.initialize();
    
    const result = await service.analyzeProject('./nest.js/packages/common');
    const stats = result.knowledgeGraph.getStatistics();
    
    if (stats.totalEntityCount === 0) {
      logIssue({
        severity: 'critical',
        category: 'CoreFunctionality',
        description: '项目分析后实体数量为0',
        location: 'EnhancedCodeKnowledgeGraphService.analyzeProject',
        recommendation: '检查代码解析器实现'
      });
      return false;
    }
    
    console.log(chalk.green(`   ✅ 通过: ${stats.totalEntityCount} 实体`));
    passCount++;
    return true;
  } catch (error: any) {
    logIssue({
      severity: 'critical',
      category: 'CoreFunctionality',
      description: `基本功能测试失败: ${error.message}`,
      location: 'EnhancedCodeKnowledgeGraphService.analyzeProject',
      recommendation: '检查服务初始化和依赖'
    });
    return false;
  }
}

async function test2_CacheClearing() {
  console.log(chalk.bold.magenta('\n📦 测试2: 缓存清理测试'));
  testCount++;
  
  try {
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.initialize();
    
    await service.analyzeProject('./nest.js/packages/common');
    const beforeStats = service.getQueryEngine().searchEntitiesByName('Module');
    
    service.clearCache();
    
    const afterClear = service.getQueryEngine().searchEntitiesByName('Module');
    
    if (afterClear.length !== beforeClear.length) {
      logIssue({
        severity: 'high',
        category: 'CacheManagement',
        description: 'clearCache 后实体数量不一致',
        location: 'EnhancedCodeKnowledgeGraphService.clearCache',
        recommendation: '检查缓存清理逻辑'
      });
      return false;
    }
    
    console.log(chalk.green(`   ✅ 通过: 缓存清理功能正常`));
    passCount++;
    return true;
  } catch (error: any) {
    logIssue({
      severity: 'high',
      category: 'CacheManagement',
      description: `缓存清理测试失败: ${error.message}`,
      location: 'EnhancedCodeKnowledgeGraphService.clearCache',
      recommendation: '检查clearCache实现'
    });
    return false;
  }
}

async function test3_QueryPerformance() {
  console.log(chalk.bold.magenta('\n📦 测试3: 查询性能测试'));
  testCount++;
  
  try {
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.initialize();
    await service.analyzeProject('./nest.js/packages');
    
    const queries = ['Module', 'Service', 'Interface', 'export'];
    const durations: number[] = [];
    
    for (const query of queries) {
      const start = Date.now();
      service.getQueryEngine().searchEntitiesByName(query);
      const duration = Date.now() - start;
      durations.push(duration);
    }
    
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    
    if (avgDuration > 100) {
      logIssue({
        severity: 'medium',
        category: 'Performance',
        description: `平均查询时间过长: ${avgDuration.toFixed(2)}ms`,
        location: 'GraphQueryEngine.searchEntitiesByName',
        recommendation: '优化查询算法或添加索引'
      });
      return false;
    }
    
    console.log(chalk.green(`   ✅ 通过: 平均查询时间 ${avgDuration.toFixed(2)}ms`));
    passCount++;
    return true;
  } catch (error: any) {
    logIssue({
      severity: 'medium',
      category: 'Performance',
      description: `查询性能测试失败: ${error.message}`,
      location: 'GraphQueryEngine',
      recommendation: '检查查询引擎实现'
    });
    return false;
  }
}

async function test4_MemoryLeaks() {
  console.log(chalk.bold.magenta('\n📦 测试4: 内存泄漏测试'));
  testCount++;
  
  try {
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.initialize();
    
    const initialMemory = process.memoryUsage().heapUsed;
    
    for (let i = 0; i < 10; i++) {
      await service.analyzeProject('./nest.js/packages/common');
      service.clearCache();
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryGrowth = ((finalMemory - initialMemory) / initialMemory) * 100;
    
    if (memoryGrowth > 100) {
      logIssue({
        severity: 'high',
        category: 'MemoryManagement',
        description: `内存增长过高: ${memoryGrowth.toFixed(2)}%`,
        location: 'EnhancedCodeKnowledgeGraphService',
        recommendation: '检查内存泄漏，添加对象清理'
      });
      return false;
    }
    
    console.log(chalk.green(`   ✅ 通过: 内存增长 ${memoryGrowth.toFixed(2)}%`));
    passCount++;
    return true;
  } catch (error: any) {
    logIssue({
      severity: 'high',
      category: 'MemoryManagement',
      description: `内存泄漏测试失败: ${error.message}`,
      location: 'EnhancedCodeKnowledgeGraphService',
      recommendation: '检查服务实现'
    });
    return false;
  }
}

async function test5_ConcurrentAccess() {
  console.log(chalk.bold.magenta('\n📦 测试5: 并发访问测试'));
  testCount++;
  
  try {
    const services = [
      new EnhancedCodeKnowledgeGraphService(),
      new EnhancedCodeKnowledgeGraphService(),
      new EnhancedCodeKnowledgeGraphService()
    ];
    
    await Promise.all(services.map(s => s.initialize()));
    
    const results = await Promise.all([
      services[0].analyzeProject('./nest.js/packages/common'),
      services[1].analyzeProject('./nest.js/packages/core'),
      services[2].analyzeProject('./nest.js/packages/microservices')
    ]);
    
    const totalEntities = results.reduce((sum, r) => sum + r.knowledgeGraph.getStatistics().totalEntityCount, 0);
    
    if (totalEntities === 0) {
      logIssue({
        severity: 'medium',
        category: 'Concurrency',
        description: '并发分析后实体数量为0',
        location: 'EnhancedCodeKnowledgeGraphService',
        recommendation: '检查并发实现'
      });
      return false;
    }
    
    console.log(chalk.green(`   ✅ 通过: 并发分析成功，总计 ${totalEntities} 实体`));
    passCount++;
    return true;
  } catch (error: any) {
    logIssue({
      severity: 'medium',
      category: 'Concurrency',
      description: `并发访问测试失败: ${error.message}`,
      location: 'EnhancedCodeKnowledgeGraphService',
      recommendation: '检查并发控制和错误处理'
    });
    return false;
  }
}

async function test6_ErrorHandling() {
  console.log(chalk.bold.magenta('\n📦 测试6: 错误处理测试'));
  testCount++;
  
  try {
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.initialize();
    
    // 测试不存在的路径
    try {
      await service.analyzeProject('./non-existent-path');
      console.log(chalk.yellow(`   ⚠️  不存在的路径未抛出错误`));
    } catch (error) {
      console.log(chalk.green(`   ✅ 不存在的路径正确抛出错误`));
    }
    
    // 测试空路径
    try {
      await service.analyzeProject('');
      console.log(chalk.yellow(`   ⚠️  空路径未抛出错误`));
    } catch (error) {
      console.log(chalk.green(`   ✅ 空路径正确抛出错误`));
    }
    
    passCount++;
    return true;
  } catch (error: any) {
    logIssue({
      severity: 'low',
      category: 'ErrorHandling',
      description: `错误处理测试失败: ${error.message}`,
      location: 'EnhancedCodeKnowledgeGraphService',
      recommendation: '改进错误处理'
    });
    return false;
  }
}

async function test7_LargeScaleAnalysis() {
  console.log(chalk.bold.magenta('\n📦 测试7: 大规模分析测试'));
  testCount++;
  
  try {
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.initialize();
    
    const start = Date.now();
    const result = await service.analyzeProject('./nest.js/packages');
    const duration = Date.now() - start;
    
    const stats = result.knowledgeGraph.getStatistics();
    const filesPerSecond = stats.fileEntityCount / (duration / 1000);
    
    console.log(chalk.green(`   分析结果:`));
    console.log(chalk.gray(`      - 文件数: ${stats.fileEntityCount}`));
    console.log(chalk.gray(`      - 节点数: ${stats.totalEntityCount}`));
    console.log(chalk.gray(`      - 关系数: ${stats.totalRelationCount}`));
    console.log(chalk.gray(`      - 耗时: ${duration}ms`));
    console.log(chalk.gray(`      - 速度: ${filesPerSecond.toFixed(2)} 文件/秒`));
    
    if (filesPerSecond < 10) {
      logIssue({
        severity: 'medium',
        category: 'Performance',
        description: `大规模分析速度较慢: ${filesPerSecond.toFixed(2)} 文件/秒`,
        location: 'EnhancedCodeKnowledgeGraphService.analyzeProject',
        recommendation: '优化文件解析和图谱构建性能'
      });
      return false;
    }
    
    console.log(chalk.green(`   ✅ 通过: 大规模分析性能可接受`));
    passCount++;
    return true;
  } catch (error: any) {
    logIssue({
      severity: 'medium',
      category: 'Performance',
      description: `大规模分析测试失败: ${error.message}`,
      location: 'EnhancedCodeKnowledgeGraphService.analyzeProject',
      recommendation: '检查大规模项目处理能力'
    });
    return false;
  }
}

async function test8_ResetFunctionality() {
  console.log(chalk.bold.magenta('\n📦 测试8: 重置功能测试'));
  testCount++;
  
  try {
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.initialize();
    
    await service.analyzeProject('./nest.js/packages/common');
    
    service.resetAll();
    
    const stats = service.getQueryEngine().searchEntitiesByName('Module');
    
    if (stats.length > 0) {
      logIssue({
        severity: 'high',
        category: 'CacheManagement',
        description: 'resetAll 后仍能查询到数据',
        location: 'EnhancedCodeKnowledgeGraphService.resetAll',
        recommendation: '检查resetAll实现，确保完全重置'
      });
      return false;
    }
    
    console.log(chalk.green(`   ✅ 通过: 重置功能正常`));
    passCount++;
    return true;
  } catch (error: any) {
    logIssue({
      severity: 'high',
      category: 'CacheManagement',
      description: `重置功能测试失败: ${error.message}`,
      location: 'EnhancedCodeKnowledgeGraphService.resetAll',
      recommendation: '检查resetAll实现'
    });
    return false;
  }
}

async function generateReport() {
  console.log(chalk.bold.magenta('\n═══════════════════════════════════════════════════════════'));
  console.log(chalk.bold.magenta('📊 长期压力测试报告'));
  console.log(chalk.bold.magenta('═══════════════════════════════════════════════════════════\n'));
  
  console.log(chalk.bold(`测试统计:`));
  console.log(`   总测试数: ${testCount}`);
  console.log(chalk.green(`   通过: ${passCount}`));
  console.log(failCount > 0 ? chalk.red(`   失败: ${failCount}`) : chalk.green(`   失败: ${failCount}`));
  console.log(`   通过率: ${((passCount / testCount) * 100).toFixed(1)}%\n`);
  
  if (issues.length > 0) {
    console.log(chalk.bold.red(`\n发现的问题: ${issues.length}`));
    
    const bySeverity = {
      critical: issues.filter(i => i.severity === 'critical'),
      high: issues.filter(i => i.severity === 'high'),
      medium: issues.filter(i => i.severity === 'medium'),
      low: issues.filter(i => i.severity === 'low'),
    };
    
    console.log(chalk.red(`\n🔴 严重问题: ${bySeverity.critical.length}`));
    bySeverity.critical.forEach((issue, i) => {
      console.log(chalk.red(`   ${i + 1}. [${issue.category}] ${issue.description}`));
    });
    
    console.log(chalk.yellow(`\n🟡 高优先级: ${bySeverity.high.length}`));
    bySeverity.high.forEach((issue, i) => {
      console.log(chalk.yellow(`   ${i + 1}. [${issue.category}] ${issue.description}`));
    });
    
    console.log(chalk.blue(`\n🔵 中优先级: ${bySeverity.medium.length}`));
    bySeverity.medium.forEach((issue, i) => {
      console.log(chalk.blue(`   ${i + 1}. [${issue.category}] ${issue.description}`));
    });
    
    console.log(chalk.gray(`\n⚪ 低优先级: ${bySeverity.low.length}`));
    bySeverity.low.forEach((issue, i) => {
      console.log(chalk.gray(`   ${i + 1}. [${issue.category}] ${issue.description}`));
    });
  }
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: testCount,
      passed: passCount,
      failed: failCount,
      passRate: ((passCount / testCount) * 100).toFixed(1) + '%'
    },
    issues: issues
  };
  
  fs.writeFileSync('./stress-test-report.json', JSON.stringify(report, null, 2));
  console.log(chalk.cyan('\n📄 报告已保存: stress-test-report.json\n'));
  
  if (failCount === 0) {
    console.log(chalk.bold.green('🎉 所有测试通过！系统稳定性良好。\n'));
  } else {
    console.log(chalk.bold.red(`⚠️  ${failCount} 个测试失败，需要修复。\n`));
  }
}

async function main() {
  try {
    console.log(chalk.bold.cyan('\n🚀 开始长期压力测试...\n'));
    
    await test1_BasicFunctionality();
    await test2_CacheClearing();
    await test3_QueryPerformance();
    await test4_MemoryLeaks();
    await test5_ConcurrentAccess();
    await test6_ErrorHandling();
    await test7_LargeScaleAnalysis();
    await test8_ResetFunctionality();
    
    await generateReport();
    
    process.exit(failCount > 2 ? 1 : 0);
  } catch (error: any) {
    console.error(chalk.red(`\n💥 测试崩溃: ${error.message}`));
    console.error(error.stack);
    process.exit(1);
  }
}

main();
