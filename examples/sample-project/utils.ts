export function formatNumber(num: number, decimalPlaces: number = 2): string {
  return num.toFixed(decimalPlaces);
}

export function generateRandomNumber(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export const CONSTANTS = {
  PI: 3.14159265359,
  E: 2.71828182846,
  GOLDEN_RATIO: 1.61803398875,
};

export interface CalculationResult {
  value: number;
  timestamp: number;
  formatted: string;
}

export function createCalculationResult(value: number): CalculationResult {
  return {
    value,
    timestamp: Date.now(),
    formatted: formatNumber(value),
  };
}
