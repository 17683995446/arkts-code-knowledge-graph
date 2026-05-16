import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { EnhancedCodeKnowledgeGraphService } from '../../src/services/EnhancedCodeKnowledgeGraphService.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('EnhancedCodeKnowledgeGraphService Unit', () => {
  let service: EnhancedCodeKnowledgeGraphService;
  let tempDir: string;

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'enhanced-test-'));
    
    // Create test files
    const testFile1 = path.join(tempDir, 'Calculator.ts');
    fs.writeFileSync(testFile1, `
export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
  
  multiply(a: number, b: number): number {
    return a * b;
  }
  
  formatResult(num: number): string {
    return num.toFixed(2); // This uses built-in toFixed
  }
}

export function createCalculator(): Calculator {
  return new Calculator();
}
`);

    const testFile2 = path.join(tempDir, 'utils.ts');
    fs.writeFileSync(testFile2, `
import { Calculator } from './Calculator.js';

export function formatNumber(num: number): string {
  return num.toFixed(2); // This uses built-in toFixed
}

export function createAndUseCalculator(): string {
  const calc = new Calculator();
  const result = calc.add(5, 3);
  return formatNumber(result);
}

export const PI = 3.14159;
`);

    service = new EnhancedCodeKnowledgeGraphService();
    await service.initialize();
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  it('should analyze a complete project with enhanced parser', async () => {
    const result = await service.analyzeProject(tempDir);
    
    expect(result.knowledgeGraph).toBeDefined();
    expect(result.queryEngine).toBeDefined();
    expect(result.metrics).toBeDefined();
    expect(result.duration).toBeGreaterThan(0);
    expect(result.symbolTableManager).toBeDefined();
    
    const stats = result.knowledgeGraph.getStatistics();
    expect(stats.totalEntityCount).toBeGreaterThan(0);
  });

  it('should NOT create placeholder entities for built-in symbols like toFixed', async () => {
    const result = await service.analyzeProject(tempDir);
    
    const stats = result.knowledgeGraph.getStatistics();
    // Check that we have no Unknown entities!
    expect(stats.entityCountByType['Unknown'] || 0).toBe(0);
    
    // Also check no toFixed in entity IDs
    const unknownEntities = result.knowledgeGraph.getCodeEntitiesByType('Unknown' as any);
    expect(unknownEntities.length).toBe(0);
  });
});
