#!/usr/bin/env node
/**
 * 性能优化效果验证测试
 */
import { MultiLanguageParser } from '../src/core/code-parser/MultiLanguageParser.js';
import chalk from 'chalk';

console.log(chalk.bold.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ⚡ 性能优化效果验证测试                                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));

async function testPerformance() {
  const parser = new MultiLanguageParser();
  
  console.log(chalk.bold.magenta('\n📊 性能对比测试\n'));
  
  const testPaths = [
    { name: '小项目', path: './examples/sample-project' },
    { name: 'NestJS Common', path: './nest.js/packages/common' },
  ];
  
  for (const testCase of testPaths) {
    console.log(chalk.bold.cyan(`\n测试: ${testCase.name}`));
    
    // 测试顺序解析
    console.log(chalk.gray('   测试1: 顺序解析...'));
    const start1 = Date.now();
    const result1 = parser.parseDirectory(testCase.path);
    const duration1 = Date.now() - start1;
    const fileCount1 = result1.codeEntities.filter((e: any) => e.entityType === 'file').length;
    const speed1 = fileCount1 / (duration1 / 1000);
    console.log(chalk.gray(`      - 文件数: ${fileCount1}`));
    console.log(chalk.gray(`      - 耗时: ${duration1}ms`));
    console.log(chalk.gray(`      - 速度: ${speed1.toFixed(2)} 文件/秒`));
    
    // 测试并行解析
    if ((parser as any).parseDirectoryParallel) {
      console.log(chalk.cyan('   测试2: 并行解析 (20并发)...'));
      const start2 = Date.now();
      const result2 = await (parser as any).parseDirectoryParallel(testCase.path, 20);
      const duration2 = Date.now() - start2;
      const fileCount2 = result2.codeEntities.filter((e: any) => e.entityType === 'file').length;
      const speed2 = fileCount2 / (duration2 / 1000);
      console.log(chalk.cyan(`      - 文件数: ${fileCount2}`));
      console.log(chalk.cyan(`      - 耗时: ${duration2}ms`));
      console.log(chalk.cyan(`      - 速度: ${speed2.toFixed(2)} 文件/秒`));
      
      // 计算提升
      const improvement = ((duration1 - duration2) / duration1 * 100).toFixed(1);
      const speedImprovement = (speed2 / speed1).toFixed(2);
      
      console.log(chalk.green(`\n   🎉 性能提升:`));
      console.log(chalk.green(`      - 时间减少: ${improvement}%`));
      console.log(chalk.green(`      - 速度提升: ${speedImprovement}x`));
      
      if (parseFloat(improvement) > 30) {
        console.log(chalk.green(`      - 优化效果: 显著!`));
      } else if (parseFloat(improvement) > 10) {
        console.log(chalk.yellow(`      - 优化效果: 良好`));
      } else {
        console.log(chalk.gray(`      - 优化效果: 一般`));
      }
    } else {
      console.log(chalk.yellow('   ⚠️  并行方法未实现'));
    }
    
    console.log(chalk.gray('─'.repeat(60)));
  }
  
  console.log(chalk.bold.magenta('\n💡 并行解析优势:\n'));
  console.log('✅ 充分利用多核CPU');
  console.log('✅ 显著提升大项目解析速度');
  console.log('✅ 可配置并发度，适应不同硬件');
  console.log('✅ 分批处理避免内存溢出\n');
}

testPerformance().catch(console.error);
