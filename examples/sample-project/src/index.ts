/**
 * 示例项目的主入口
 */
import { ScientificCalculator } from './calculator.js';
import { average } from './utils.js';

function main() {
  console.log('ArkTS 代码知识图谱系统 - 示例项目');
  console.log('================================');
  
  const calc = new ScientificCalculator({ precision: 3 });
  
  console.log('\n1. 基础计算:');
  console.log(`   2 + 3 = ${calc.add(2, 3)}`);
  console.log(`   5 * 4 = ${calc.multiply(5, 4)}`);
  
  console.log('\n2. 科学计算:');
  console.log(`   5² = ${calc.square(5)}`);
  console.log(`   3³ = ${calc.cube(3)}`);
  
  console.log('\n3. 数组平均:');
  const numbers = [1, 2, 3, 4, 5];
  console.log(`   平均值: ${average(numbers)}`);
}

main();
