import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CodeKnowledgeGraphService } from '../../src/services/CodeKnowledgeGraphService.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('CodeKnowledgeGraphService Integration', () => {
  let service: CodeKnowledgeGraphService;
  let tempDir: string;

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'integration-test-'));
    
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
  
  complexCalculation(x: number, y: number, z: number): number {
    let result = x;
    for (let i = 0; i < y; i++) {
      result = result * z + x;
    }
    return result;
  }
}

export function createCalculator(): Calculator {
  return new Calculator();
}
`);

    const testFile2 = path.join(tempDir, 'utils.ts');
    fs.writeFileSync(testFile2, `
export function formatNumber(num: number): string {
  return num.toFixed(2);
}

export const PI = 3.14159;
`);

    service = new CodeKnowledgeGraphService();
    await service.initialize();
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  it('should analyze a complete project', async () => {
    const result = await service.analyzeProject(tempDir);
    
    expect(result.knowledgeGraph).toBeDefined();
    expect(result.queryEngine).toBeDefined();
    expect(result.metrics).toBeDefined();
    expect(result.duration).toBeGreaterThan(0);
    
    const stats = result.knowledgeGraph.getStatistics();
    expect(stats.totalEntityCount).toBeGreaterThan(0);
  });

  it('should find entities by name', async () => {
    const result = await service.analyzeProject(tempDir);
    
    const calculatorClasses = result.queryEngine.searchEntitiesByName('Calculator');
    expect(calculatorClasses.length).toBeGreaterThan(0);
  });

  it('should get project statistics', async () => {
    const result = await service.analyzeProject(tempDir);
    
    const stats = result.queryEngine.getStatistics();
    expect(stats.totalEntityCount).toBeGreaterThan(0);
    expect(stats.fileEntityCount).toBeGreaterThan(0);
  });

  it('should perform semantic search', async () => {
    const result = await service.analyzeProject(tempDir);
    
    const searchResults = await service.getSemanticSearch().searchEntities('math calculation', 10);
    expect(searchResults).toBeDefined();
  });
});
