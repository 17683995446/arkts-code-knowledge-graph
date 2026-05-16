import {
  Benchmark,
  BenchmarkResult,
  ParsePerformanceBenchmark,
  QueryPerformanceBenchmark,
  MemoryBenchmark,
  MemoryBenchmarkResult,
} from '../core/benchmark';

export interface BenchmarkReport {
  timestamp: Date;
  system: SystemInfo;
  parse: Map<string, BenchmarkResult>;
  query: Map<string, BenchmarkResult>;
  memory: MemoryBenchmarkResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    duration: number;
  };
}

interface SystemInfo {
  platform: string;
  arch: string;
  nodeVersion: string;
  cpuCores: number;
  totalMemory: number;
}

class ComprehensiveBenchmarkRunner {
  private benchmark: Benchmark;
  private parseBenchmark: ParsePerformanceBenchmark | null = null;
  private queryBenchmark: QueryPerformanceBenchmark | null = null;
  private memoryBenchmark: MemoryBenchmark;
  private startTime: number = 0;
  private endTime: number = 0;

  constructor() {
    this.benchmark = new Benchmark({
      name: 'comprehensive',
      warmupIterations: 3,
      testIterations: 50,
      reportFormat: 'json',
      outputDir: './benchmark-results/comprehensive',
    });

    this.memoryBenchmark = new MemoryBenchmark();
  }

  public async runAllBenchmarks(options: {
    projectPath?: string;
    indexSize?: number;
    includeParse?: boolean;
    includeQuery?: boolean;
    includeMemory?: boolean;
  } = {}): Promise<BenchmarkReport> {
    this.startTime = Date.now();

    console.log('🚀 Starting Comprehensive Benchmark Suite');
    console.log('='.repeat(50));

    const systemInfo = this.getSystemInfo();
    this.printSystemInfo(systemInfo);

    const report: BenchmarkReport = {
      timestamp: new Date(),
      system: systemInfo,
      parse: new Map(),
      query: new Map(),
      memory: [],
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        duration: 0,
      },
    };

    if (options.includeParse !== false && options.projectPath) {
      console.log('\n📦 Running Parse Performance Benchmarks...\n');
      this.parseBenchmark = new ParsePerformanceBenchmark({
        projectPath: options.projectPath,
        extensions: ['ts', 'tsx', 'js', 'jsx'],
        sizes: {
          small: 10,
          medium: 50,
          large: 200,
          xlarge: 500,
        },
        warmupIterations: 2,
        testIterations: 30,
      });

      try {
        const parseResults = await this.parseBenchmark.runAllSizes();
        for (const [key, value] of parseResults) {
          report.parse.set(key, value);
          report.summary.totalTests++;
          report.summary.passed++;
        }

        const concurrencyResults = await this.parseBenchmark.runConcurrencyTest(100, [1, 5, 10, 20]);
        for (const [key, value] of concurrencyResults) {
          report.parse.set(`concurrency-${key}`, value);
          report.summary.totalTests++;
          report.summary.passed++;
        }
      } catch (error) {
        console.error('Parse benchmark failed:', error);
        report.summary.failed++;
      }
    }

    if (options.includeQuery !== false) {
      console.log('\n🔍 Running Query Performance Benchmarks...\n');
      this.queryBenchmark = new QueryPerformanceBenchmark({
        indexSize: options.indexSize || 1000,
        queryTypes: ['simple', 'complex', 'wildcard', 'regex', 'fuzzy'],
        warmupIterations: 2,
        testIterations: 30,
      });

      try {
        const queryResults = await this.queryBenchmark.runQueryTypeTests();
        for (const [key, value] of queryResults) {
          report.query.set(key, value);
          report.summary.totalTests++;
          report.summary.passed++;
        }

        const concurrentResults = await this.queryBenchmark.runConcurrentQueries([1, 5, 10, 20]);
        for (const [key, value] of concurrentResults) {
          report.query.set(`concurrent-${key}`, value);
          report.summary.totalTests++;
          report.summary.passed++;
        }
      } catch (error) {
        console.error('Query benchmark failed:', error);
        report.summary.failed++;
      }
    }

    if (options.includeMemory !== false) {
      console.log('\n💾 Running Memory Benchmarks...\n');

      try {
        const { result: _parseResult, result: parseMemoryResult } =
          await this.memoryBenchmark.measureOperation('parse-operation', async () => {
            const data: string[] = [];
            for (let i = 0; i < 1000; i++) {
              data.push(`item_${i}_${Math.random().toString(36)}`);
            }
            return data;
          });
        report.memory.push(parseMemoryResult);
        report.summary.totalTests++;
        report.summary.passed++;

        const { result: _queryResult, result: queryMemoryResult } =
          await this.memoryBenchmark.measureOperation('query-operation', async () => {
            const map = new Map<string, any>();
            for (let i = 0; i < 1000; i++) {
              map.set(`key_${i}`, { value: i, data: 'x'.repeat(100) });
            }
            for (let i = 0; i < 500; i++) {
              map.get(`key_${i}`);
            }
            return map;
          });
        report.memory.push(queryMemoryResult);
        report.summary.totalTests++;
        report.summary.passed++;
      } catch (error) {
        console.error('Memory benchmark failed:', error);
        report.summary.failed++;
      }
    }

    this.endTime = Date.now();
    report.summary.duration = this.endTime - this.startTime;

    this.printReportSummary(report);

    this.benchmark.saveResults('json');

    return report;
  }

  private getSystemInfo(): SystemInfo {
    const os = require('os');
    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      cpuCores: os.cpus().length,
      totalMemory: os.totalmem(),
    };
  }

  private printSystemInfo(info: SystemInfo): void {
    console.log('📋 System Information:');
    console.log(`   Platform: ${info.platform} (${info.arch})`);
    console.log(`   Node.js: ${info.nodeVersion}`);
    console.log(`   CPU Cores: ${info.cpuCores}`);
    console.log(`   Total Memory: ${(info.totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log('');
  }

  private printReportSummary(report: BenchmarkReport): void {
    console.log('\n' + '='.repeat(50));
    console.log('📊 Benchmark Summary');
    console.log('='.repeat(50));
    console.log(`   Total Tests: ${report.summary.totalTests}`);
    console.log(`   Passed: ${report.summary.passed}`);
    console.log(`   Failed: ${report.summary.failed}`);
    console.log(`   Duration: ${(report.summary.duration / 1000).toFixed(2)}s`);

    if (report.parse.size > 0) {
      console.log('\n📦 Parse Performance:');
      for (const [name, result] of report.parse) {
        console.log(`   ${name}: ${result.mean.toFixed(2)}ms (P95: ${result.p95.toFixed(2)}ms)`);
      }
    }

    if (report.query.size > 0) {
      console.log('\n🔍 Query Performance:');
      for (const [name, result] of report.query) {
        console.log(`   ${name}: ${result.mean.toFixed(2)}ms (P95: ${result.p95.toFixed(2)}ms)`);
      }
    }

    if (report.memory.length > 0) {
      console.log('\n💾 Memory Usage:');
      for (const result of report.memory) {
        console.log(`   ${result.testName}:`);
        console.log(`     Peak: ${(result.peakMemory / 1024 / 1024).toFixed(2)} MB`);
        console.log(`     Increase: ${(result.memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
      }
    }

    console.log('\n' + '='.repeat(50));
  }

  public async runQuickBenchmark(): Promise<void> {
    console.log('⚡ Running Quick Benchmark...\n');

    await this.benchmark.run('simple-operation', async () => {
      const data = [];
      for (let i = 0; i < 1000; i++) {
        data.push({ id: i, value: Math.random() });
      }
      return data;
    });

    await this.benchmark.run('complex-operation', async () => {
      const map = new Map<string, any>();
      for (let i = 0; i < 1000; i++) {
        map.set(`key_${i}`, { id: i, data: 'x'.repeat(100) });
      }
      for (let i = 0; i < 500; i++) {
        map.get(`key_${i}`);
      }
      return map;
    });

    this.benchmark.saveResults('md');
  }
}

async function main() {
  const runner = new ComprehensiveBenchmarkRunner();

  const args = process.argv.slice(2);
  const mode = args[0] || 'full';

  if (mode === 'quick') {
    await runner.runQuickBenchmark();
  } else if (mode === 'full') {
    await runner.runAllBenchmarks({
      projectPath: './nest.js',
      indexSize: 1000,
      includeParse: true,
      includeQuery: true,
      includeMemory: true,
    });
  } else if (mode === 'parse') {
    await runner.runAllBenchmarks({
      projectPath: './nest.js',
      includeParse: true,
      includeQuery: false,
      includeMemory: false,
    });
  } else if (mode === 'query') {
    await runner.runAllBenchmarks({
      indexSize: 1000,
      includeParse: false,
      includeQuery: true,
      includeMemory: false,
    });
  } else if (mode === 'memory') {
    await runner.runAllBenchmarks({
      includeParse: false,
      includeQuery: false,
      includeMemory: true,
    });
  } else {
    console.log('Usage: npx ts-node scripts/run-comprehensive-benchmark.ts [quick|full|parse|query|memory]');
    console.log('  quick  - Run quick sanity checks');
    console.log('  full   - Run all benchmarks (default)');
    console.log('  parse  - Run parse performance benchmarks only');
    console.log('  query  - Run query performance benchmarks only');
    console.log('  memory - Run memory benchmarks only');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export default ComprehensiveBenchmarkRunner;
