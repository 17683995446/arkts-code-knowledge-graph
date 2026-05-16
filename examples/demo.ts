#!/usr/bin/env node
/**
 * ArkTS 代码知识图谱系统 - 使用示例
 */

import { CodeKnowledgeGraphService } from '../src/index.js';
import chalk from 'chalk';
import * as path from 'path';

async function main() {
  console.log(chalk.bold.cyan('\n🚀 ArkTS 代码知识图谱系统 - 使用示例'));
  console.log(chalk.gray('='.repeat(60)));

  // 1. 创建服务
  console.log(chalk.yellow('\n1. 创建服务...'));
  const service = new CodeKnowledgeGraphService();
  await service.initialize();
  console.log(chalk.green('   ✓ 服务创建成功！'));

  // 2. 解析项目
  console.log(chalk.yellow('\n2. 解析示例项目...'));
  const projectPath = path.join(process.cwd(), 'examples', 'sample-project');
  const result = await service.analyzeProject(projectPath);
  console.log(chalk.green(`   ✓ 项目解析完成！(耗时: ${result.duration}ms)`));

  // 3. 获取统计信息
  console.log(chalk.yellow('\n3. 获取图统计信息...'));
  const stats = result.knowledgeGraph.getStatistics();
  
  console.log(chalk.white('\n   📊 知识图谱统计:'));
  console.log(`      - 总实体数: ${chalk.cyan(stats.totalEntityCount)}`);
  console.log(`      - 总关系数: ${chalk.cyan(stats.totalRelationCount)}`);
  console.log(`      - 文件数: ${chalk.green(stats.fileEntityCount)}`);
  console.log(`      - 类数: ${chalk.green(stats.classEntityCount)}`);
  console.log(`      - 函数数: ${chalk.green(stats.functionEntityCount)}`);

  // 4. 查找类
  console.log(chalk.yellow('\n4. 查找所有类...'));
  const classes = result.knowledgeGraph.getCodeEntitiesByType('Class');
  console.log(chalk.white('   📦 找到的类:'));
  classes.forEach(c => {
    const className = (c.entityData as any).className || (c.entityData as any).name || 'Unknown';
    console.log(`      - ${chalk.magenta(className)}`);
  });

  // 5. 查找函数
  console.log(chalk.yellow('\n5. 查找所有函数...'));
  const functions = result.knowledgeGraph.getCodeEntitiesByType('Function');
  console.log(chalk.white('   🔧 找到的函数:'));
  functions.forEach(f => {
    const funcName = (f.entityData as any).functionName || (f.entityData as any).name || 'Unknown';
    console.log(`      - ${chalk.blue(funcName)}`);
  });

  // 6. 语义搜索
  console.log(chalk.yellow('\n6. 语义搜索 "calculator"...'));
  const searchResults = await service.getSemanticSearch().searchEntities('calculator', 5);
  console.log(chalk.white('   🔍 搜索结果:'));
  searchResults.forEach((resultItem, index) => {
    const entityName = 
      (resultItem.entityData as any)?.className ||
      (resultItem.entityData as any)?.functionName ||
      (resultItem.entityData as any)?.fileName ||
      'Unknown';
    const score = resultItem.relevanceScore !== undefined ? resultItem.relevanceScore.toFixed(4) : 'N/A';
    console.log(`      ${index + 1}. ${chalk.cyan(entityName)} [${(resultItem.entityData as any).type}] (Score: ${score})`);
  });

  // 7. 项目指标
  console.log(chalk.yellow('\n7. 项目质量指标...'));
  console.log(chalk.white('   📈 质量评估:'));
  console.log(`      - 质量分数: ${chalk.cyan(result.metrics.quality.overallScore.toFixed(1))} / 100`);
  console.log(`      - 复杂度水平: ${chalk.yellow(result.metrics.quality.complexityLevel)}`);
  
  // 8. 代码统计
  console.log(chalk.yellow('\n8. 项目代码统计...'));
  console.log(chalk.white('   📊 统计数据:'));
  console.log(`      - 总文件数: ${chalk.cyan(result.metrics.overview.totalFiles)}`);
  console.log(`      - 总代码行数: ${chalk.cyan(result.metrics.overview.totalLinesOfCode)}`);

  console.log(chalk.bold.green('\n✅ 示例演示完成！'));
  console.log(chalk.gray('='.repeat(60)) + '\n');
}

main().catch(error => {
  console.error(chalk.red('Error:'), error);
  process.exit(1);
});
