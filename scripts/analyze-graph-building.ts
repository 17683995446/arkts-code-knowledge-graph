#!/usr/bin/env node
/**
 * 知识图谱构建性能分析
 */
import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import chalk from 'chalk';

console.log(chalk.bold.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🔬 知识图谱构建深度分析                                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));

async function analyzeGraphBuilding() {
  const service = new EnhancedCodeKnowledgeGraphService();
  await service.initialize();
  
  console.log(chalk.bold.magenta('\n📦 测试不同规模的项目...\n'));
  
  const testCases = [
    { name: '小项目', path: './examples/sample-project' },
    { name: 'NestJS Common', path: './nest.js/packages/common' },
    { name: 'NestJS Core', path: './nest.js/packages/core' },
  ];
  
  const results: any[] = [];
  
  for (const testCase of testCases) {
    console.log(chalk.cyan(`\n测试: ${testCase.name}`));
    console.log(chalk.gray('   开始分析...'));
    
    const start = Date.now();
    const memStart = process.memoryUsage().heapUsed;
    
    try {
      const result = await service.analyzeProject(testCase.path);
      const stats = result.knowledgeGraph.getStatistics();
      
      const duration = Date.now() - start;
      const memUsed = (process.memoryUsage().heapUsed - memStart) / 1024 / 1024;
      
      const filesPerSecond = stats.fileEntityCount / (duration / 1000);
      const msPerFile = duration / stats.fileEntityCount;
      const nodesPerMs = stats.totalEntityCount / duration;
      
      results.push({
        name: testCase.name,
        fileCount: stats.fileEntityCount,
        nodeCount: stats.totalEntityCount,
        relationCount: stats.totalRelationCount,
        duration,
        memoryMB: memUsed,
        filesPerSecond,
        msPerFile,
        nodesPerMs,
      });
      
      console.log(chalk.green(`   ✅ 完成: ${duration}ms`));
      console.log(chalk.gray(`      - 文件: ${stats.fileEntityCount}, 节点: ${stats.totalEntityCount}, 关系: ${stats.totalRelationCount}`));
      console.log(chalk.gray(`      - 速度: ${filesPerSecond.toFixed(2)} 文件/秒`));
      console.log(chalk.gray(`      - 内存: ${memUsed.toFixed(2)}MB`));
      
    } catch (error: any) {
      console.log(chalk.red(`   ❌ 失败: ${error.message}`));
    }
    
    // 清理并重置
    service.resetAll();
  }
  
  // 分析结果
  console.log(chalk.bold.magenta('\n═══════════════════════════════════════════════════════════'));
  console.log(chalk.bold.magenta('📊 性能对比分析'));
  console.log(chalk.bold.magenta('═══════════════════════════════════════════════════════════\n'));
  
  console.log(chalk.bold('项目对比表:'));
  console.log(chalk.gray('─'.repeat(80)));
  console.log(chalk.cyan('项目'.padEnd(20)) + 
              chalk.cyan('文件'.padEnd(10)) + 
              chalk.cyan('节点'.padEnd(10)) + 
              chalk.cyan('耗时'.padEnd(10)) + 
              chalk.cyan('速度'.padEnd(15)) + 
              chalk.cyan('ms/文件'.padEnd(10)));
  console.log(chalk.gray('─'.repeat(80)));
  
  results.forEach(r => {
    console.log(
      r.name.padEnd(20) +
      r.fileCount.toString().padEnd(10) +
      r.nodeCount.toString().padEnd(10) +
      r.duration.toString().padEnd(10) +
      r.filesPerSecond.toFixed(2).padEnd(15) +
      r.msPerFile.toFixed(2).padEnd(10)
    );
  });
  
  console.log(chalk.gray('─'.repeat(80)));
  
  // 找出性能问题
  console.log(chalk.bold.magenta('\n🎯 性能问题分析:'));
  
  const slowProjects = results.filter(r => r.filesPerSecond < 20);
  if (slowProjects.length > 0) {
    console.log(chalk.yellow('\n⚠️  性能较慢的项目:'));
    slowProjects.forEach(p => {
      console.log(chalk.yellow(`   - ${p.name}: ${p.filesPerSecond.toFixed(2)} 文件/秒`));
      if (p.msPerFile > 100) {
        console.log(chalk.red(`     严重问题: 每文件耗时 ${p.msPerFile.toFixed(2)}ms`));
      }
    });
  }
  
  const fastProjects = results.filter(r => r.filesPerSecond >= 20);
  if (fastProjects.length > 0) {
    console.log(chalk.green('\n✅ 性能正常的项目:'));
    fastProjects.forEach(p => {
      console.log(chalk.green(`   - ${p.name}: ${p.filesPerSecond.toFixed(2)} 文件/秒`));
    });
  }
  
  // 找出内存问题
  console.log(chalk.bold.magenta('\n💾 内存使用分析:'));
  
  const highMemory = results.filter(r => r.memoryMB > 200);
  if (highMemory.length > 0) {
    console.log(chalk.yellow('\n⚠️  内存占用较高的项目:'));
    highMemory.forEach(p => {
      console.log(chalk.yellow(`   - ${p.name}: ${p.memoryMB.toFixed(2)}MB`));
      const memPerFile = p.memoryMB / p.fileCount;
      console.log(chalk.gray(`     每文件: ${memPerFile.toFixed(4)}MB`));
      
      if (memPerFile > 1) {
        console.log(chalk.red(`     严重问题: 每文件内存占用过高`));
      }
    });
  }
  
  // 优化建议
  console.log(chalk.bold.magenta('\n💡 优化建议:'));
  
  const avgSpeed = results.reduce((sum, r) => sum + r.filesPerSecond, 0) / results.length;
  const avgMemPerFile = results.reduce((sum, r) => sum + (r.memoryMB / r.fileCount), 0) / results.length;
  
  console.log(`   - 平均解析速度: ${avgSpeed.toFixed(2)} 文件/秒`);
  console.log(`   - 平均每文件耗时: ${(1000 / avgSpeed).toFixed(2)}ms`);
  console.log(`   - 平均每文件内存: ${avgMemPerFile.toFixed(4)}MB`);
  
  if (avgSpeed < 20) {
    console.log(chalk.yellow('\n   ⚠️  建议优化:'));
    console.log('   1. 优化代码解析器实现');
    console.log('   2. 使用并行/并发处理');
    console.log('   3. 添加文件缓存机制');
    console.log('   4. 优化知识图谱数据库操作');
  }
  
  if (avgMemPerFile > 0.5) {
    console.log(chalk.yellow('\n   ⚠️  内存优化建议:'));
    console.log('   1. 优化数据结构，减少内存占用');
    console.log('   2. 使用流式处理大型文件');
    console.log('   3. 及时释放不需要的对象');
    console.log('   4. 考虑使用数据库存储中间结果');
  }
}

analyzeGraphBuilding().catch(console.error);
