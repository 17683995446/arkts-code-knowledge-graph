/**
 * 计算器类
 */
import { add, multiply } from './utils.js';

export interface CalculatorOptions {
  precision?: number;
}

/**
 * 基础计算器类
 */
export class Calculator {
  private precision: number;

  constructor(options: CalculatorOptions = {}) {
    this.precision = options.precision ?? 2;
  }

  /**
   * 加法运算
   */
  public add(a: number, b: number): number {
    return this.round(add(a, b));
  }

  /**
   * 乘法运算
   */
  public multiply(a: number, b: number): number {
    return this.round(multiply(a, b));
  }

  /**
   * 四舍五入到指定精度
   */
  private round(value: number): number {
    return Number(value.toFixed(this.precision));
  }
}

/**
 * 科学计算器类
 */
export class ScientificCalculator extends Calculator {
  constructor(options: CalculatorOptions = {}) {
    super(options);
  }

  /**
   * 计算平方
   */
  public square(x: number): number {
    return this.multiply(x, x);
  }

  /**
   * 计算立方
   */
  public cube(x: number): number {
    return this.multiply(this.multiply(x, x), x);
  }
}
