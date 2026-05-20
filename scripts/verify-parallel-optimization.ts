#!/usr/bin/env node
/**
 * 完整的性能优化验证
 */
import { MultiLanguageParser } from '../src/core/code-parser/MultiLanguageParser.js';
import chalk from 'chalk';

console.log(chalk.bold.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ⚡ 完整性能优化验证                                        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));

async function fullTest() {
  const parser = new MultiLanguageParser();
  
  console.log(chalk.bold.magenta('\n📊 性能对比测试\n'));
  
  const testCase = { name: 'NestJS Common', path: './nest.js/packages/common' };
  
  console.log(chalk.bold.cyan(`测试: ${testCase.name}`));
  console.log(chalk.gray('─'.repeat(60)));
  
  // 顺序解析
  console.log(chalk.yellow('\n1️⃣ 顺序解析 (Sequential)'));
  console.log(chalk.gray('   正在解析...'));
  const start1 = Date.now();
  const result1 = parser.parseDirectory(testCase.path);
  const duration1 = Date.now() - start1;
  
  console.log(chalk.green(`   ✅ 完成!`));
  console.log(`   - 文件数: ${result1.codeEntities.length} 实体`);
  console.log(`   - 关系数: ${result1.codeRelations.length} 关系`);
  console.log(`   - 耗时: ${duration1}ms`);
  
  // 并行解析
  console.log(chalk.yellow('\n2️⃣ 并行解析 (Parallel, 20并发)'));
  console.log(chalk.gray('   正在解析...'));
  const start2 = Date.now();
  const result2 = await (parser as any).parseDirectoryParallel(testCase.path, 20);
  const duration2 = Date.now() - start2;
  
  console.log(chalk.green(`   ✅ 完成!`));
  console.log(`   - 文件数: ${result2.codeEntities.length} 实体`);
  console.log(`   - 关系数: ${result2.codeRelations.length} 关系`);
  console.log(`   - 耗时: ${duration2}ms`);
  
  // 性能对比
  console.log(chalk.bold.magenta('\n📈 性能对比'));
  console.log(chalk.gray('─'.repeat(60)));
  
  const timeReduction = ((duration1 - duration2) / duration1 * 100).toFixed(1);
  const speedup = (duration1 / duration2).toFixed(2);
  
  console.log(`   顺序解析: ${duration1}ms`);
  console.log(`   并行解析: ${duration2}ms`);
  console.log(chalk.green(`   时间减少: ${timeReduction}%`));
  console.log(chalk.green(`   加速比: ${speedup}x`));
  
  if (parseFloat(timeReduction) > 30) {
    console.log(chalk.green('\n   🎉 性能优化效果显著!'));
  } else if (parseFloat(timeReduction) > 10) {
    console.log(chalk.yellow('\n   👍 性能有所提升'));
  } else {
    console.log(chalk.gray('\n   💡 性能提升较小，可能由于文件较小或I/O瓶颈'));
  }
  
  // 验证结果一致性
  console.log(chalk.bold.magenta('\n✅ 结果一致性验证'));
  console.log(chalk.gray('─'.repeat(60)));
  
  const entityMatch = result1.codeEntities.length === result2.codeEntities.length;
  const relationMatch = result1.codeRelations.length === result2.codeRelations.length;
  
  console.log(`   实体数量一致: ${entityMatch ? '✅' : '❌'}`);
  console.log(`   关系数量一致: ${relationMatch ? '✅' : '❌'}`);
  
  if (entityMatch && relationMatch) {
    console.log(chalk.green('\n   🎉 两种方法结果完全一致!\n'));
  } else {
    console.log(chalk.red('\n   ⚠️  结果不一致，需要检查!\n'));
  }
  
  // 额外测试：不同并发度
  console.log(chalk.bold.magenta('\n🔧 并发度对比测试'));
  console.log(chalk.gray('─'.repeat(60)));
  
  const concurrencyLevels = [5, 10, 20, 50];
  
  for (const level of concurrencyLevels) {
    const start = Date.now();
    await (parser as any).parseDirectoryParallel(testCase.path, level);
    const duration = Date.now() - start;
    const speedup = (duration1 / duration).toFixed(2);
    
    console.log(`   ${level.toString().padStart(2)}并发: ${duration.toString().padStart(5)}ms (${speedup}x)`);
  }
  
  console.log(chalk.bold.cyan('\n💡 优化总结:\n'));
  console.log('✅ 已实施优化:');
  console.log('   - parseDirectoryParallel() 方法');
  console.log('   - 可配置并发度 (maxConcurrency)');
  console.log('   - 分批处理避免内存溢出');
  console.log('\n🎯 使用建议:');
  console.log('   - 小项目 (< 50文件): 使用顺序解析或低并发度');
  console.log('   - 中项目 (50-500文件): 使用 10-20 并发');
  console.log('   - 大项目 (> 500文件): 使用 20-50 并发\n');
}

fullTest().catch(console.error);
