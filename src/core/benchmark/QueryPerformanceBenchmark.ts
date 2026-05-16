import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';
import * as crypto from 'crypto';
import Benchmark, { BenchmarkResult } from './Benchmark';

const readFile = promisify(fs.readFile);

export interface QueryBenchmarkConfig {
  indexSize: number;
  queryTypes: QueryType[];
  warmupIterations: number;
  testIterations: number;
}

export type QueryType = 'simple' | 'complex' | 'wildcard' | 'regex' | 'fuzzy';

export interface QueryTestCase {
  type: QueryType;
  query: string;
  description: string;
}

export class QueryPerformanceBenchmark {
  private benchmark: Benchmark;
  private config: QueryBenchmarkConfig;
  private indexData: Map<string, any> = new Map();

  constructor(config: QueryBenchmarkConfig) {
    this.config = config;
    this.benchmark = new Benchmark({
      name: 'query-performance',
      warmupIterations: config.warmupIterations,
      testIterations: config.testIterations,
      reportFormat: 'json',
      outputDir: './benchmark-results/query',
    });

    this.initializeIndex();
  }

  private initializeIndex(): void {
    console.log(`\n📊 Initializing index with ${this.config.indexSize} entries...`);

    for (let i = 0; i < this.config.indexSize; i++) {
      const key = `symbol_${i}`;
      this.indexData.set(key, {
        id: key,
        name: `Symbol${i}`,
        type: ['function', 'class', 'interface', 'variable', 'type'][i % 5],
        file: `file_${i % 100}.ts`,
        line: Math.floor(Math.random() * 1000) + 1,
        content: this.generateMockContent(i),
        metadata: {
          complexity: Math.floor(Math.random() * 10) + 1,
          dependencies: Array.from({ length: Math.floor(Math.random() * 5) }, () =>
            `symbol_${Math.floor(Math.random() * this.config.indexSize)}`
          ),
        },
      });
    }

    console.log(`   ✅ Index initialized with ${this.indexData.size} entries`);
  }

  private generateMockContent(index: number): string {
    const templates = [
      `export function symbol${index}() { return ${index}; }`,
      `export class Symbol${index} { constructor() {} }`,
      `export interface ISymbol${index} { value: number; }`,
      `export const symbol${index} = ${index};`,
      `export type Symbol${index} = { value: number };`,
    ];
    return templates[index % templates.length];
  }

  public async runQueryTypeTests(): Promise<Map<QueryType, BenchmarkResult>> {
    const results = new Map<QueryType, BenchmarkResult>();

    for (const queryType of this.config.queryTypes) {
      console.log(`\n🔍 Running ${queryType} query benchmark...`);

      const testCases = this.getTestCasesForType(queryType);

      for (const testCase of testCases) {
        const result = await this.benchmark.run(`${queryType}-${testCase.description}`, async () => {
          this.executeQuery(queryType, testCase.query);
        });
        results.set(queryType, result);
      }
    }

    return results;
  }

  private getTestCasesForType(type: QueryType): QueryTestCase[] {
    switch (type) {
      case 'simple':
        return [
          { type: 'simple', query: 'symbol_500', description: 'exact-match' },
          { type: 'simple', query: 'Symbol100', description: 'case-variant' },
        ];
      case 'complex':
        return [
          { type: 'complex', query: 'symbol_* AND type:function', description: 'and-query' },
          { type: 'complex', query: 'symbol_1* OR symbol_2*', description: 'or-query' },
        ];
      case 'wildcard':
        return [
          { type: 'wildcard', query: 'symbol_*', description: 'prefix-wildcard' },
          { type: 'wildcard', query: '*Symbol*', description: 'contains-wildcard' },
        ];
      case 'regex':
        return [
          { type: 'regex', query: '/symbol_[0-9]+/', description: 'numeric-pattern' },
          { type: 'regex', query: '/Symbol\\d+/', description: 'escaped-pattern' },
        ];
      case 'fuzzy':
        return [
          { type: 'fuzzy', query: 'smybol_100', description: 'typo-correction' },
          { type: 'fuzzy', query: 'Symbooo', description: 'heavy-typo' },
        ];
      default:
        return [];
    }
  }

  private executeQuery(type: QueryType, query: string): any[] {
    const results: any[] = [];

    switch (type) {
      case 'simple':
        const exactMatch = this.indexData.get(query);
        if (exactMatch) results.push(exactMatch);
        break;

      case 'complex':
        if (query.includes('AND')) {
          const [term1, term2] = query.split(' AND ');
          const key = term1.trim();
          const entry = this.indexData.get(key);
          if (entry && entry.type === term2.trim().split(':')[1]) {
            results.push(entry);
          }
        } else if (query.includes('OR')) {
          const parts = query.split(' OR ');
          for (const part of parts) {
            const key = part.trim();
            const entry = this.indexData.get(key);
            if (entry) results.push(entry);
          }
        }
        break;

      case 'wildcard':
        if (query.endsWith('*')) {
          const prefix = query.slice(0, -1);
          for (const [key, value] of this.indexData) {
            if (key.startsWith(prefix)) {
              results.push(value);
            }
          }
        } else if (query.startsWith('*') && query.endsWith('*')) {
          const contains = query.slice(1, -1);
          for (const [key, value] of this.indexData) {
            if (key.includes(contains)) {
              results.push(value);
            }
          }
        }
        break;

      case 'regex':
        const regex = new RegExp(query.slice(1, -1));
        for (const [key, value] of this.indexData) {
          if (regex.test(key)) {
            results.push(value);
          }
        }
        break;

      case 'fuzzy':
        const threshold = 2;
        for (const [key, value] of this.indexData) {
          if (this.calculateLevenshteinDistance(query, key) <= threshold) {
            results.push(value);
          }
        }
        break;
    }

    return results;
  }

  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  public async runConcurrentQueries(concurrencyLevels: number[]): Promise<Map<number, BenchmarkResult>> {
    const results = new Map<number, BenchmarkResult>();

    for (const concurrency of concurrencyLevels) {
      console.log(`\n⚡ Concurrent query test: ${concurrency} parallel queries`);

      const result = await this.benchmark.run(`concurrent-${concurrency}`, async () => {
        const queries = Array.from({ length: concurrency }, (_, i) => ({
          type: 'simple' as QueryType,
          query: `symbol_${Math.floor(Math.random() * this.config.indexSize)}`,
        }));

        await Promise.all(queries.map((q) => this.executeQuery(q.type, q.query)));
      });

      results.set(concurrency, result);
    }

    return results;
  }

  public async runBatchQueries(batchSizes: number[]): Promise<Map<number, BenchmarkResult>> {
    const results = new Map<number, BenchmarkResult>();

    for (const batchSize of batchSizes) {
      console.log(`\n📦 Batch query test: ${batchSize} queries`);

      const result = await this.benchmark.run(`batch-${batchSize}`, async () => {
        for (let i = 0; i < batchSize; i++) {
          const query = `symbol_${Math.floor(Math.random() * this.config.indexSize)}`;
          this.executeQuery('simple', query);
        }
      });

      results.set(batchSize, result);
    }

    return results;
  }

  public getBenchmark(): Benchmark {
    return this.benchmark;
  }

  public getIndexSize(): number {
    return this.indexData.size;
  }
}

export default QueryPerformanceBenchmark;
