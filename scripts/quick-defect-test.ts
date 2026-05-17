#!/usr/bin/env node
/**
 * 快速缺陷发现测试
 */
import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import chalk from 'chalk';

console.log(chalk.bold.cyan('🚀 快速缺陷发现测试\n'));

async function quickTest() {
  console.log('📦 测试1: 基本功能');
  const service = new EnhancedCodeKnowledgeGraphService();
  await service.initialize();
  
  try {
    const result = await service.analyzeProject('./nest.js/packages/common');
    console.log(chalk.green(`   ✅ 基本分析: ${result.knowledgeGraph.getStatistics().totalEntityCount} 实体`));
  } catch (e: any) {
    console.log(chalk.red(`   ❌ 基本分析失败: ${e.message}`));
  }
  
  console.log('\n📦 测试2: clearCache');
  try {
    service.clearCache();
    console.log(chalk.green('   ✅ clearCache成功'));
  } catch (e: any) {
    console.log(chalk.red(`   ❌ clearCache失败: ${e.message}`));
  }
  
  console.log('\n📦 测试3: 查询');
  try {
    const engine = service.getQueryEngine();
    const results = engine.searchEntitiesByName('Module');
    console.log(chalk.green(`   ✅ 查询成功: ${results.length} 结果`));
  } catch (e: any) {
    console.log(chalk.red(`   ❌ 查询失败: ${e.message}`));
  }
  
  console.log('\n📦 测试4: 再次分析');
  try {
    const result = await service.analyzeProject('./examples/sample-project');
    console.log(chalk.green(`   ✅ 再次分析: ${result.knowledgeGraph.getStatistics().totalEntityCount} 实体`));
  } catch (e: any) {
    console.log(chalk.red(`   ❌ 再次分析失败: ${e.message}`));
  }
  
  console.log('\n📦 测试5: resetAll');
  try {
    service.resetAll();
    console.log(chalk.green('   ✅ resetAll成功'));
  } catch (e: any) {
    console.log(chalk.red(`   ❌ resetAll失败: ${e.message}`));
  }
  
  console.log('\n✅ 快速测试完成！\n');
}

quickTest().catch(console.error);
