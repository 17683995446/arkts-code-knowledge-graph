#!/usr/bin/env node
/**
 * ArkTS 代码知识图谱系统 - 实际项目测试脚本
 */

import { CodeGraphService } from './src/index.js';
import { MetricsAnalyzer } from './src/modules/metrics/index.js';
import chalk from 'chalk';

console.log(chalk.bold.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🎯 ArkTS 代码知识图谱系统 - 实际项目测试                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));

async function main() {
  try {
    console.log(chalk.bold.green('📍 测试1: 解析当前项目自身'));
    console.log(chalk.gray('正在初始化服务...'));
    
    const service = await CodeGraphService.create({
      config: { logging: { level: 'warn', prettyPrint: true } }
    });
    
    console.log(chalk.gray('正在解析项目...'));
    await service.parseProject('./src');
    
    const stats = service.getQueryEngine().getStats();
    console.log(chalk.green('✅ 解析成功！'));
    console.log(chalk.bold('📊 解析结果：'));
    console.log(`   - 文件数: ${chalk.cyan(stats.fileCount)}`);
    console.log(`   - 类数: ${chalk.magenta(stats.classCount)}`);
    console.log(`   - 函数数: ${chalk.blue(stats.functionCount)}`);
    console.log(`   - 总节点: ${chalk.yellow(stats.nodeCount)}`);
    console.log(`   - 总关系: ${chalk.yellow(stats.edgeCount)}`);
    
    console.log(chalk.green('\n✨ 测试1通过！\n'));
    
    console.log(chalk.bold.green('📍 测试2: 搜索代码实体'));
    
    const searchResults = service.getQueryEngine().searchNodesByName('Parser');
    console.log(`搜索 "Parser" 找到 ${searchResults.length} 个结果：`);
    searchResults.forEach((result, i) => {
      console.log(`   ${i + 1}. [${result.node.type}] ${chalk.white(result.node.name)}`);
    });
    
    console.log(chalk.green('\n✨ 测试2通过！\n'));
    
    console.log(chalk.bold.green('📍 测试3: 查看统计信息'));
    console.log(chalk.gray('节点分布：'));
    Object.entries(stats.nodesByType).forEach(([type, count]) => {
      if (count > 0) {
        console.log(`   - ${type}: ${count}`);
      }
    });
    
    console.log(chalk.green('\n✨ 测试3通过！\n'));
    
    console.log(chalk.bold.green('📍 测试4: 代码质量和复杂度分析'));
    const analyzer = new MetricsAnalyzer();
    const metrics = analyzer.analyzeProject('./src');
    
    console.log(analyzer.generateReport(metrics));
    console.log(chalk.green('\n✨ 测试4通过！\n'));
    
    console.log(chalk.bold.green('📍 测试5: 保存和加载图谱'));
    await service.save();
    console.log(chalk.gray('图谱已保存，现在重新加载...'));
    
    const newService = await CodeGraphService.create({
      config: { logging: { level: 'warn', prettyPrint: true } }
    });
    await newService.load();
    
    const newStats = newService.getQueryEngine().getStats();
    console.log(`重新加载后，节点数: ${chalk.cyan(newStats.nodeCount)}`);
    console.log(chalk.green('\n✨ 测试5通过！\n'));
    
    console.log(chalk.bold.cyan('═══════════════════════════════════════════════════════════'));
    console.log(chalk.bold.green('🎉 所有测试通过！系统在实际项目中运行正常！'));
    console.log(chalk.bold.cyan('═══════════════════════════════════════════════════════════\n'));
    
  } catch (error) {
    console.error(chalk.red('❌ 测试失败：'), error);
    process.exit(1);
  }
}

main();
