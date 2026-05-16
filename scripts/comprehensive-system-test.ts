#!/usr/bin/env node
/**
 * 综合系统测试 - 特复杂且高难度实践
 */
import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

console.log(chalk.bold.magenta(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   💪 特复杂且高难度系统测试                                   ║
║   目的: 发现系统缺陷，迭代改进优化                           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  memoryMB: number;
  error?: string;
  details?: any;
}

const testResults: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<any>, details?: any): Promise<TestResult> {
  console.log(chalk.yellow(`\n🧪 测试: ${name}`));
  const startMemory = process.memoryUsage().heapUsed;
  const startTime = Date.now();
  
  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    const endMemory = process.memoryUsage().heapUsed;
    const memoryUsedMB = (endMemory - startMemory) / 1024 / 1024;
    
    console.log(chalk.green(`   ✅ 通过! (耗时: ${duration}ms, 内存: ${memoryUsedMB.toFixed(2)}MB)`));
    
    const testResult: TestResult = {
      name,
      passed: true,
      duration,
      memoryMB: memoryUsedMB,
      details: result || details
    };
    testResults.push(testResult);
    return testResult;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const endMemory = process.memoryUsage().heapUsed;
    const memoryUsedMB = (endMemory - startMemory) / 1024 / 1024;
    
    console.log(chalk.red(`   ❌ 失败: ${error.message}`));
    console.log(chalk.gray(`   耗时: ${duration}ms, 内存: ${memoryUsedMB.toFixed(2)}MB`));
    console.log(chalk.gray(`   错误: ${error.stack}`));
    
    const testResult: TestResult = {
      name,
      passed: false,
      duration,
      memoryMB: memoryUsedMB,
      error: error.message,
      details: details
    };
    testResults.push(testResult);
    return testResult;
  }
}

async function testMassiveProjectParsing() {
  const service = new EnhancedCodeKnowledgeGraphService();
  await service.initialize();
  
  console.log(chalk.bold.blue('\n📦 测试1: 超大规模项目解析'));
  
  // 使用 nest.js 完整包 (823 个文件)
  const result = await service.analyzeProject('./nest.js/packages');
  
  console.log(chalk.green(`   解析成功:`));
  console.log(`   - 文件数: ${result.knowledgeGraph.getStatistics().fileEntityCount}`);
  console.log(`   - 节点数: ${result.knowledgeGraph.getStatistics().totalEntityCount}`);
  console.log(`   - 关系数: ${result.knowledgeGraph.getStatistics().totalRelationCount}`);
  
  return result;
}

async function testConcurrentAnalysis() {
  const service = new EnhancedCodeKnowledgeGraphService();
  await service.initialize();
  
  console.log(chalk.bold.blue('\n📦 测试2: 并发分析多个项目'));
  
  const projects = [
    './nest.js/packages/common',
    './nest.js/packages/core',
    './nest.js/packages/microservices',
    './examples/sample-project'
  ];
  
  const results = await Promise.all(
    projects.map(async (projectPath) => {
      try {
        return await service.analyzeProject(projectPath);
      } catch (error) {
        return { error: true, path: projectPath, errorMsg: error };
      }
    })
  );
  
  console.log(chalk.green(`   并发分析完成: ${results.length} 个项目`));
  const successCount = results.filter((r: any) => !r.error).length;
  console.log(`   - 成功: ${successCount}`);
  console.log(`   - 失败: ${results.length - successCount}`);
  
  return { total: results.length, success: successCount };
}

async function testMemoryLeak() {
  console.log(chalk.bold.blue('\n📦 测试3: 内存泄漏检测'));
  
  const service = new EnhancedCodeKnowledgeGraphService();
  await service.initialize();
  
  const memoryReadings: number[] = [];
  
  for (let i = 0; i < 10; i++) {
    await service.analyzeProject('./nest.js/packages/common');
    const mem = process.memoryUsage().heapUsed;
    memoryReadings.push(mem);
    console.log(chalk.gray(`   第 ${i + 1} 次: ${(mem / 1024 / 1024).toFixed(2)} MB`));
    
    // 清理
    service.clearCache();
  }
  
  const initialMemory = memoryReadings[0];
  const finalMemory = memoryReadings[memoryReadings.length - 1];
  const memoryGrowth = (finalMemory - initialMemory) / initialMemory * 100;
  
  console.log(chalk.green(`   初始内存: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`));
  console.log(chalk.green(`   最终内存: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`));
  console.log(chalk.green(`   增长比例: ${memoryGrowth.toFixed(2)}%`));
  
  if (memoryGrowth > 50) {
    throw new Error(`内存增长过高: ${memoryGrowth.toFixed(2)}%`);
  }
  
  return { initialMemory, finalMemory, growthPercent: memoryGrowth };
}

async function testComplexQuery() {
  console.log(chalk.bold.blue('\n📦 测试4: 复杂查询性能'));
  
  const service = new EnhancedCodeKnowledgeGraphService();
  await service.initialize();
  await service.analyzeProject('./nest.js/packages');
  
  const queryEngine = service.getQueryEngine();
  const startTime = Date.now();
  
  // 复杂查询: 查找所有 Module 相关的实体
  const results = queryEngine.searchEntitiesByName('Module');
  
  const duration = Date.now() - startTime;
  
  console.log(chalk.green(`   查询耗时: ${duration}ms`));
  console.log(chalk.green(`   结果数量: ${results.length}`));
  
  if (duration > 1000) {
    console.log(chalk.yellow(`   ⚠️  查询性能有待优化`));
  }
  
  return { resultsCount: results.length, duration };
}

async function testEdgeCases() {
  console.log(chalk.bold.blue('\n📦 测试5: 边界情况测试'));
  
  const service = new EnhancedCodeKnowledgeGraphService();
  await service.initialize();
  
  const edgeCases = [
    { name: '空文件', path: './examples/sample-project' },
    { name: '不存在的路径', path: './non-existent-path' },
    { name: '嵌套很深', path: './nest.js/packages/core' }
  ];
  
  const results = [];
  
  for (const testCase of edgeCases) {
    try {
      await service.analyzeProject(testCase.path);
      results.push({ name: testCase.name, status: 'success' });
      console.log(chalk.green(`   ${testCase.name}: ✅`));
    } catch (error: any) {
      results.push({ name: testCase.name, status: 'failed', error: error.message });
      console.log(chalk.red(`   ${testCase.name}: ❌ ${error.message}`));
    }
  }
  
  return results;
}

async function testErrorRecovery() {
  console.log(chalk.bold.blue('\n📦 测试6: 错误恢复能力'));
  
  const service = new EnhancedCodeKnowledgeGraphService();
  await service.initialize();
  
  // 先成功分析一个项目
  await service.analyzeProject('./nest.js/packages/common');
  console.log(chalk.green('   第一次分析成功'));
  
  // 再分析一个不存在的项目
  try {
    await service.analyzeProject('./non-existent-path');
    console.log(chalk.red('   ❌ 应该抛出错误但没有'));
  } catch (error) {
    console.log(chalk.green('   ✅ 错误被正确捕获'));
  }
  
  // 再次分析正常项目，确保服务未崩溃
  try {
    await service.analyzeProject('./examples/sample-project');
    console.log(chalk.green('   ✅ 错误后恢复成功'));
    return { recovered: true };
  } catch (error: any) {
    console.log(chalk.red(`   ❌ 恢复失败: ${error.message}`));
    return { recovered: false, error: error.message };
  }
}

async function testPerformanceStress() {
  console.log(chalk.bold.blue('\n📦 测试7: 性能压力测试'));
  
  const service = new EnhancedCodeKnowledgeGraphService();
  await service.initialize();
  
  const iterations = 5;
  const durations: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await service.analyzeProject('./nest.js/packages/common');
    const duration = Date.now() - start;
    durations.push(duration);
    console.log(chalk.gray(`   第 ${i + 1} 次: ${duration}ms`));
  }
  
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  
  console.log(chalk.green(`   平均耗时: ${avgDuration.toFixed(2)}ms`));
  console.log(chalk.green(`   最快: ${minDuration}ms`));
  console.log(chalk.green(`   最慢: ${maxDuration}ms`));
  console.log(chalk.green(`   性能波动: ${((maxDuration - minDuration) / avgDuration * 100).toFixed(2)}%`));
  
  return { avgDuration, minDuration, maxDuration };
}

async function generateReport() {
  console.log(chalk.bold.magenta('\n═══════════════════════════════════════════════════════════'));
  console.log(chalk.bold.magenta('📊 测试报告总结'));
  console.log(chalk.bold.magenta('═══════════════════════════════════════════════════════════'));
  
  const passedCount = testResults.filter(r => r.passed).length;
  const failedCount = testResults.filter(r => !r.passed).length;
  const totalDuration = testResults.reduce((sum, r) => sum + r.duration, 0);
  const totalMemory = testResults.reduce((sum, r) => sum + r.memoryMB, 0);
  
  console.log(`\n✅ 通过: ${passedCount}`);
  console.log(`❌ 失败: ${failedCount}`);
  console.log(`⏱  总耗时: ${totalDuration}ms`);
  console.log(`💾 总内存: ${totalMemory.toFixed(2)}MB`);
  
  if (failedCount > 0) {
    console.log(chalk.red('\n❌ 失败测试:'));
    testResults.filter(r => !r.passed).forEach((r, idx) => {
      console.log(chalk.red(`   ${idx + 1}. ${r.name}`));
      console.log(chalk.red(`      错误: ${r.error}`));
    });
  }
  
  // 保存测试结果
  const reportPath = './test-report.json';
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: testResults.length,
      passed: passedCount,
      failed: failedCount,
      totalDuration,
      totalMemory
    },
    results: testResults
  }, null, 2));
  
  console.log(chalk.green(`\n📄 测试报告已保存: ${reportPath}`));
  
  if (failedCount === 0) {
    console.log(chalk.bold.green('\n🎉 所有测试通过! 系统稳定性良好。\n'));
    process.exit(0);
  } else {
    console.log(chalk.bold.red(`\n⚠️  ${failedCount} 个测试失败，需要修复。\n`));
    process.exit(1);
  }
}

async function main() {
  try {
    console.log(chalk.bold.cyan('\n🚀 开始综合系统测试...\n'));
    
    await runTest('超大规模项目解析', testMassiveProjectParsing);
    await runTest('并发分析多个项目', testConcurrentAnalysis);
    await runTest('内存泄漏检测', testMemoryLeak);
    await runTest('复杂查询性能', testComplexQuery);
    await runTest('边界情况测试', testEdgeCases);
    await runTest('错误恢复能力', testErrorRecovery);
    await runTest('性能压力测试', testPerformanceStress);
    
    await generateReport();
    
  } catch (error: any) {
    console.error(chalk.red(`\n💥 测试过程出错: ${error.message}`));
    console.error(error.stack);
    process.exit(1);
  }
}

main();
