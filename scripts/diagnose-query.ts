#!/usr/bin/env node
import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import chalk from 'chalk';

console.log(chalk.bold.cyan('🔍 查询问题诊断测试\n'));

async function diagnose() {
  const service = new EnhancedCodeKnowledgeGraphService();
  await service.initialize();
  
  // 分析项目
  console.log('📦 分析项目...');
  const result = await service.analyzeProject('./nest.js/packages/common');
  const stats = result.knowledgeGraph.getStatistics();
  console.log(`   分析成功: ${stats.fileEntityCount} 文件, ${stats.totalEntityCount} 节点\n`);
  
  // 测试查询
  console.log('🔍 测试查询 (分析后):');
  const engine = service.getQueryEngine();
  const results1 = engine.searchEntitiesByName('Module');
  console.log(`   搜索 "Module": ${results1.length} 结果`);
  
  if (results1.length > 0) {
    console.log(`   示例结果: ${results1[0].entityData.name}`);
  }
  
  const resultsByService = service.getQueryEngine().searchEntitiesByName('Service');
  console.log(`   搜索 "Service": ${resultsByService.length} 结果\n`);
  
  // 测试 clearCache
  console.log('🗑️  执行 clearCache...');
  service.clearCache();
  
  // 再次查询
  console.log('🔍 测试查询 (clearCache 后):');
  const results2 = engine.searchEntitiesByName('Module');
  console.log(`   搜索 "Module": ${results2.length} 结果\n`);
  
  // 再次分析
  console.log('📦 再次分析项目...');
  const result2 = await service.analyzeProject('./nest.js/packages/common');
  const stats2 = result2.knowledgeGraph.getStatistics();
  console.log(`   分析成功: ${stats2.fileEntityCount} 文件, ${stats2.totalEntityCount} 节点\n`);
  
  // 查询
  console.log('🔍 测试查询 (再次分析后):');
  const results3 = engine.searchEntitiesByName('Module');
  console.log(`   搜索 "Module": ${results3.length} 结果`);
  
  const resultsByService2 = service.getQueryEngine().searchEntitiesByName('Service');
  console.log(`   搜索 "Service": ${resultsByService2.length} 结果\n`);
  
  // 问题分析
  console.log(chalk.bold.magenta('══════════════════════════════════'));
  console.log(chalk.bold.magenta('问题分析'));
  console.log(chalk.bold.magenta('══════════════════════════════════'));
  
  if (results1.length > 0 && results2.length === 0) {
    console.log(chalk.red('❌ 问题确认: clearCache 后查询失效！'));
    console.log(chalk.yellow('\n原因分析:'));
    console.log('   clearCache() 清空了图数据库但查询引擎未重新加载数据');
    console.log('   或者 clearCache() 清空了查询引擎的缓存但图数据还在');
    
    console.log(chalk.green('\n✅ 解决方案:'));
    console.log('   1. 方案A: clearCache 不应该清空知识图谱，只清空缓存');
    console.log('   2. 方案B: clearCache 后查询引擎需要重新加载数据');
    console.log('   3. 方案C: 分离"清理缓存"和"清空数据"的接口');
  } else if (results1.length === 0) {
    console.log(chalk.red('❌ 问题确认: 即使首次分析后查询也返回0结果！'));
    console.log(chalk.yellow('\n这说明查询引擎的实现有问题。'));
  } else {
    console.log(chalk.green('✅ 未发现问题，查询功能正常。'));
  }
}

diagnose().catch(console.error);
