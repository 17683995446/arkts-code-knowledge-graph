#!/usr/bin/env node
/**
 * 大项目压力测试
 */
import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import chalk from 'chalk';

console.log(chalk.bold.magenta(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   💪 大项目极限压力测试                                       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));

const TEST_PROJECTS = [
  { name: 'NestJS Common', path: './nest.js/packages/common' },
  { name: '完整 NestJS', path: './nest.js/packages' },
  { name: 'Vue 3 核心', path: './vue-core/packages' },
];

async function main() {
  let totalFiles = 0;
  let totalEntities = 0;
  let totalRelations = 0;
  
  const service = new EnhancedCodeKnowledgeGraphService();
  await service.initialize();
  console.log(chalk.green('✅ 服务初始化成功\n'));

  for (const project of TEST_PROJECTS) {
    console.log(chalk.bold.yellow(`\n📦 测试项目: ${project.name}`));
    console.log(chalk.gray(`路径: ${project.path}`));
    
    try {
      const start = Date.now();
      const initialMemory = process.memoryUsage().heapUsed;
      
      const result = await service.analyzeProject(project.path);
      
      const duration = Date.now() - start;
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryUsedMB = (finalMemory - initialMemory) / 1024 / 1024;
      
      const stats = result.knowledgeGraph.getStatistics();
      
      totalFiles += stats.fileEntityCount;
      totalEntities += stats.totalEntityCount;
      totalRelations += stats.totalRelationCount;
      
      console.log(chalk.green(`   ✅ 解析成功！`));
      console.log(`   📊 文件数: ${chalk.cyan(stats.fileEntityCount)}`);
      console.log(`   📊 节点数: ${chalk.magenta(stats.totalEntityCount)}`);
      console.log(`   📊 关系数: ${chalk.blue(stats.totalRelationCount)}`);
      console.log(`   ⏱  耗时: ${chalk.yellow(duration)}ms`);
      console.log(`   💾 内存: ${chalk.magenta(memoryUsedMB.toFixed(2))}MB`);
      
    } catch (err) {
      console.log(chalk.red(`   ❌ 解析失败: ${err}`));
    }
  }
  
  console.log(chalk.bold.green('\n═══════════════════════════════════════════════════════════'));
  console.log(chalk.bold.green('🎯 压力测试总结'));
  console.log(chalk.bold.green('═══════════════════════════════════════════════════════════'));
  console.log(`   - 总文件数: ${chalk.cyan(totalFiles)}`);
  console.log(`   - 总节点数: ${chalk.magenta(totalEntities)}`);
  console.log(`   - 总关系数: ${chalk.blue(totalRelations)}`);
  console.log(chalk.green('\n🎉 系统成功处理了大型真实项目！'));
}

main().catch(err => {
  console.error(chalk.red('💥 压力测试崩溃:'), err);
  process.exit(1);
});
