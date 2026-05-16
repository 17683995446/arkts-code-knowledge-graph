#!/usr/bin/env node
/**
 * ArkTS 代码知识图谱系统 - Nest.js 真实项目测试脚本
 */

import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import { OptimizedCodeKnowledgeGraphService } from '../src/services/OptimizedCodeKnowledgeGraphService.js';
import { BabelCodeKnowledgeGraphService } from '../src/services/BabelCodeKnowledgeGraphService.js';
import chalk from 'chalk';

console.log(chalk.bold.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🎯 ArkTS 代码知识图谱系统 - Nest.js 真实项目测试              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));

const NESTJS_PROJECT_PATH = './nest.js';

async function testService(name: string, serviceCreator: () => Promise<any>) {
  console.log(chalk.bold.yellow(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
  console.log(chalk.bold.yellow(`测试: ${name}`));
  console.log(chalk.bold.yellow(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`));

  try {
    const startTime = Date.now();
    const initialMemory = process.memoryUsage().heapUsed;

    console.log(chalk.gray('正在初始化服务...'));
    const service = await serviceCreator();
    await service.initialize();

    console.log(chalk.gray('正在解析 Nest.js 项目...'));
    const result = await service.analyzeProject(NESTJS_PROJECT_PATH);

    const endTime = Date.now();
    const finalMemory = process.memoryUsage().heapUsed;
    const duration = endTime - startTime;
    const memoryUsed = (finalMemory - initialMemory) / 1024 / 1024;

    const graph = service.getKnowledgeGraph();
    const stats = graph.getStats();

    console.log(chalk.green('✅ 解析成功！\n'));
    console.log(chalk.bold('📊 解析结果：'));
    console.log(`   - 总节点: ${chalk.yellow(stats.totalEntityCount)}`);
    console.log(`   - 总关系: ${chalk.yellow(stats.totalRelationCount)}`);
    console.log(`   - 文件: ${chalk.cyan(stats.fileEntityCount)}`);
    console.log(`   - 类: ${chalk.magenta(stats.classEntityCount)}`);
    console.log(`   - 函数: ${chalk.blue(stats.functionEntityCount)}`);
    console.log(`   - 耗时: ${chalk.green(`${duration}ms`)}`);
    console.log(`   - 内存使用: ${chalk.magenta(`${memoryUsed.toFixed(2)}MB`)}`);

    console.log(chalk.gray('\n节点分布：'));
    Object.entries(stats.entityCountByType || {}).forEach(([type, count]) => {
      if (count > 0) {
        console.log(`   - ${type}: ${count}`);
      }
    });

    return { success: true, duration, memoryUsed, stats, name };

  } catch (error) {
    console.error(chalk.red('❌ 测试失败：'), error);
    return { success: false, name, error };
  }
}

async function main() {
  const results: any[] = [];

  // 测试 1: 增强版服务
  results.push(await testService('EnhancedCodeKnowledgeGraphService', async () => {
    return new EnhancedCodeKnowledgeGraphService();
  }));

  // 测试 2: 优化版服务
  results.push(await testService('OptimizedCodeKnowledgeGraphService', async () => {
    return new OptimizedCodeKnowledgeGraphService();
  }));

  // 测试 3: Babel 版服务
  results.push(await testService('BabelCodeKnowledgeGraphService', async () => {
    return new BabelCodeKnowledgeGraphService();
  }));

  // 打印对比结果汇总
  console.log(chalk.bold.cyan('\n\n═══════════════════════════════════════════════════════════'));
  console.log(chalk.bold.cyan('📈 性能对比汇总'));
  console.log(chalk.bold.cyan('═══════════════════════════════════════════════════════════\n'));

  const successful = results.filter(r => r.success);
  successful.forEach(result => {
    console.log(chalk.bold(`${result.name}:`);
    console.log(`  - 耗时: ${chalk.green(`${result.duration}ms`)}`);
    console.log(`  - 内存: ${chalk.magenta(`${result.memoryUsed.toFixed(2)}MB`)}`);
    console.log(`  - 节点: ${chalk.yellow(result.stats.totalEntityCount)}`);
    console.log('');
  });

  if (successful.length > 0) {
    const fastest = successful.reduce((min, r) => r.duration < min.duration ? r : min);
    console.log(chalk.bold.green(`🏆 最快的服务: ${fastest.name} (${fastest.duration}ms)`);
  }

  console.log(chalk.bold.green('\n🎉 系统测试完成！'));
  console.log(chalk.bold.cyan('═══════════════════════════════════════════════════════════\n'));

}

main().catch(console.error);
