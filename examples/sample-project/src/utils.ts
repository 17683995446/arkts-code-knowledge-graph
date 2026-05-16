/**
 * 工具函数集合
 */

/**
 * 计算两个数的和
 */
export function add(a: number, b: number): number {
  return a + b;
}

/**
 * 计算两个数的乘积
 */
export function multiply(a: number, b: number): number {
  return a * b;
}

/**
 * 计算数组的平均值
 */
export function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => add(sum, val), 0) / arr.length;
}
