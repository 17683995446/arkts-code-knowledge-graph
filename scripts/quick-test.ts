#!/usr/bin/env node
import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import chalk from 'chalk';

console.log(chalk.bold.cyan('🚀 快速问题发现测试\n'));

async function quickTest() {
  const issues: any[] = [];
  
  console.log('📦 测试1: 基本功能测试');
  const service = new EnhancedCodeKnowledgeGraphService();
  await service.initialize();
  
  try {
    await service.analyzeProject('./nest.js/packages/common');
    console.log('✅ 基本分析成功');
  } catch (e: any) {
    console.log('❌ 基本分析失败:', e.message);
    issues.push({ test: 'basic', error: e.message });
  }
  
  console.log('\n📦 测试2: clearCache 方法');
  try {
    service.clearCache();
    console.log('✅ clearCache 成功');
  } catch (e: any) {
    console.log('❌ clearCache 失败:', e.message);
    issues.push({ test: 'clearCache', error: e.message });
  }
  
  console.log('\n📦 测试3: 再次分析测试');
  try {
    await service.analyzeProject('./examples/sample-project');
    console.log('✅ 再次分析成功');
  } catch (e: any) {
    console.log('❌ 再次分析失败:', e.message);
    issues.push({ test: 're-analyze', error: e.message });
  }
  
  console.log('\n📦 测试4: 查询测试');
  try {
    const engine = service.getQueryEngine();
    const results = engine.searchEntitiesByName('Module');
    console.log(`✅ 查询成功: ${results.length} 结果`);
  } catch (e: any) {
    console.log('❌ 查询失败:', e.message);
    issues.push({ test: 'query', error: e.message });
  }
  
  console.log('\n📦 测试5: 错误处理测试');
  try {
    await service.analyzeProject('./non-existent-path');
    console.log('❌ 应该失败但成功了');
    issues.push({ test: 'error-handling', error: 'Should fail but succeeded' });
  } catch (e: any) {
    console.log('✅ 错误正确捕获:', e.message);
  }
  
  console.log(chalk.bold.magenta('\n═══════════════════════════════'));
  console.log(chalk.bold.magenta('测试总结'));
  console.log(chalk.bold.magenta('═══════════════════════════════'));
  console.log(`发现的问题: ${issues.length}`);
  
  if (issues.length > 0) {
    issues.forEach((issue, i) => {
      console.log(chalk.red(`\n${i + 1}. [${issue.test}] ${issue.error}`));
    });
  } else {
    console.log(chalk.green('\n✅ 所有测试通过！'));
  }
}

quickTest().catch(console.error);
