#!/usr/bin/env node
/**
 * 性能优化测试 - 对比顺序和并行处理
 */
import { MultiLanguageParser } from '../src/core/code-parser/MultiLanguageParser.js';
import chalk from 'chalk';

console.log(chalk.bold.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ⚡ 性能优化对比测试                                        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));

async function testParsingPerformance() {
  const parser = new MultiLanguageParser();
  
  console.log(chalk.bold.magenta('\n📦 测试文件解析性能...\n'));
  
  const testPaths = [
    './nest.js/packages/common',
    './nest.js/packages/core',
    './vue-core/packages/shared',
  ];
  
  for (const testPath of testPaths) {
    console.log(chalk.cyan(`\n测试路径: ${testPath}`));
    
    const start = Date.now();
    const memStart = process.memoryUsage().heapUsed;
    
    try {
      const result = parser.parseDirectory(testPath);
      const duration = Date.now() - start;
      const memUsed = (process.memoryUsage().heapUsed - memStart) / 1024 / 1024;
      
      const fileCount = result.codeEntities.filter(e => e.entityType === 'file').length;
      const filesPerSecond = fileCount / (duration / 1000);
      
      console.log(chalk.green(`   ✅ 解析成功`));
      console.log(`      - 文件数: ${fileCount}`);
      console.log(`      - 实体数: ${result.codeEntities.length}`);
      console.log(`      - 关系数: ${result.codeRelations.length}`);
      console.log(`      - 耗时: ${duration}ms`);
      console.log(`      - 速度: ${filesPerSecond.toFixed(2)} 文件/秒`);
      console.log(`      - 内存: ${memUsed.toFixed(2)}MB`);
      
      if (filesPerSecond < 15) {
        console.log(chalk.yellow(`      ⚠️  速度较慢，建议优化`));
      }
      
    } catch (error: any) {
      console.log(chalk.red(`   ❌ 解析失败: ${error.message}`));
    }
  }
  
  console.log(chalk.bold.magenta('\n═══════════════════════════════════════════════════════════'));
  console.log(chalk.bold.magenta('💡 优化建议:'));
  console.log(chalk.bold.magenta('═══════════════════════════════════════════════════════════\n'));
  
  console.log('1. 当前问题:');
  console.log('   - parseDirectory() 使用顺序处理');
  console.log('   - findAllSourceFiles() 递归遍历无缓存');
  console.log('   - 没有使用 worker_threads 进行并行处理\n');
  
  console.log('2. 优化方案:');
  console.log('   - 方案A: 使用 Promise.all() 并行处理文件');
  console.log('   - 方案B: 使用 worker_threads 线程池');
  console.log('   - 方案C: 批量处理 + 流式处理');
  console.log('   - 方案D: 添加文件缓存避免重复解析\n');
  
  console.log('3. 预期效果:');
  console.log('   - 预期速度提升: 3-5倍');
  console.log('   - CPU 利用率提升: 50-80%');
  console.log('   - 内存占用可能增加: 20-30%');
}

testParsingPerformance().catch(console.error);
