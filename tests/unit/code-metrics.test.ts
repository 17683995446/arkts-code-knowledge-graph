import { describe, it, expect, beforeAll } from 'vitest';
import { ComplexityCalculator } from '../../src/core/code-metrics/ComplexityCalculator.js';
import { CodeQualityAnalyzer } from '../../src/core/code-metrics/CodeQualityAnalyzer.js';
import { ProjectMetricsAnalyzer } from '../../src/core/code-metrics/ProjectMetricsAnalyzer.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Code Metrics', () => {
  describe('ComplexityCalculator', () => {
    let calculator: ComplexityCalculator;

    beforeAll(() => {
      calculator = new ComplexityCalculator();
    });

    it('should return a complexity level', () => {
      expect(calculator.getComplexityLevel(5).level).toBe('Low');
      expect(calculator.getComplexityLevel(15).level).toBe('Moderate');
      expect(calculator.getComplexityLevel(30).level).toBe('High');
      expect(calculator.getComplexityLevel(100).level).toBe('Very High');
    });
  });

  describe('CodeQualityAnalyzer', () => {
    it('should return a quality level', () => {
      expect(CodeQualityAnalyzer.getQualityLevel(95).level).toBe('Excellent');
      expect(CodeQualityAnalyzer.getQualityLevel(80).level).toBe('Good');
      expect(CodeQualityAnalyzer.getQualityLevel(65).level).toBe('Fair');
      expect(CodeQualityAnalyzer.getQualityLevel(40).level).toBe('Poor');
    });
  });

  describe('ProjectMetricsAnalyzer', () => {
    let analyzer: ProjectMetricsAnalyzer;
    let tempDir: string;

    beforeAll(() => {
      analyzer = new ProjectMetricsAnalyzer();
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metrics-test-'));
    });

    it('should analyze a project', () => {
      const testFile = path.join(tempDir, 'test.ts');
      fs.writeFileSync(testFile, `
function simpleFunction() {
  return 42;
}

class SimpleClass {
  method1() {}
  method2() {}
}
`);

      const metrics = analyzer.analyzeProject(tempDir);
      
      expect(metrics.overview.totalFiles).toBeGreaterThan(0);
    });
  });
});
