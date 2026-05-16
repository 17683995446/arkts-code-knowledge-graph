import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

export interface BenchmarkConfig {
  name: string;
  warmupIterations: number;
  testIterations: number;
  timeout: number;
  enableProfiling: boolean;
  reportFormat: 'json' | 'html' | 'md';
  outputDir: string;
}

export interface BenchmarkResult {
  name: string;
  iterations: number;
  duration: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  throughput: number;
  memoryUsed: number;
  timestamp: Date;
}

export interface BenchmarkSuite {
  name: string;
  benchmarks: Benchmark[];
  config: BenchmarkConfig;
}

export class Benchmark extends EventEmitter {
  private config: BenchmarkConfig;
  private results: Map<string, BenchmarkResult> = new Map();
  private metrics: number[] = [];

  constructor(config: Partial<BenchmarkConfig> = {}) {
    super();
    this.config = {
      name: 'default',
      warmupIterations: 5,
      testIterations: 100,
      timeout: 60000,
      enableProfiling: false,
      reportFormat: 'json',
      outputDir: './benchmark-results',
      ...config,
    };
  }

  public async run(name: string, fn: () => Promise<void> | void): Promise<BenchmarkResult> {
    console.log(`\n🔬 Running benchmark: ${name}`);
    console.log(`   Warmup iterations: ${this.config.warmupIterations}`);
    console.log(`   Test iterations: ${this.config.testIterations}`);

    this.metrics = [];
    const initialMemory = process.memoryUsage().heapUsed;

    for (let i = 0; i < this.config.warmupIterations; i++) {
      await this.execute(fn);
    }

    for (let i = 0; i < this.config.testIterations; i++) {
      const duration = await this.execute(fn);
      this.metrics.push(duration);
    }

    const result = this.calculateResults(name, initialMemory);
    this.results.set(name, result);

    this.printResult(result);

    return result;
  }

  private async execute(fn: () => Promise<void> | void): Promise<number> {
    const start = performance.now();
    await fn();
    const end = performance.now();
    return end - start;
  }

  private calculateResults(name: string, initialMemory: number): BenchmarkResult {
    const sorted = [...this.metrics].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / sorted.length;
    const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / sorted.length;
    const stdDev = Math.sqrt(variance);
    const median = sorted[Math.floor(sorted.length / 2)];

    const pIndex = (p: number) => Math.floor(sorted.length * p);
    const finalMemory = process.memoryUsage().heapUsed;

    return {
      name,
      iterations: this.config.testIterations,
      duration: sorted[sorted.length - 1] - sorted[0],
      mean,
      median,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      stdDev,
      p50: sorted[pIndex(0.5)],
      p90: sorted[pIndex(0.9)],
      p95: sorted[pIndex(0.95)],
      p99: sorted[pIndex(0.99)],
      throughput: 1000 / mean,
      memoryUsed: finalMemory - initialMemory,
      timestamp: new Date(),
    };
  }

  private printResult(result: BenchmarkResult): void {
    console.log(`\n📊 Results for ${result.name}:`);
    console.log(`   Mean: ${result.mean.toFixed(4)} ms`);
    console.log(`   Median: ${result.median.toFixed(4)} ms`);
    console.log(`   Min: ${result.min.toFixed(4)} ms`);
    console.log(`   Max: ${result.max.toFixed(4)} ms`);
    console.log(`   StdDev: ${result.stdDev.toFixed(4)} ms`);
    console.log(`   P50: ${result.p50.toFixed(4)} ms`);
    console.log(`   P90: ${result.p90.toFixed(4)} ms`);
    console.log(`   P95: ${result.p95.toFixed(4)} ms`);
    console.log(`   P99: ${result.p99.toFixed(4)} ms`);
    console.log(`   Throughput: ${result.throughput.toFixed(2)} ops/sec`);
    console.log(`   Memory: ${(result.memoryUsed / 1024 / 1024).toFixed(2)} MB`);
  }

  public async runSuite(suite: {
    name: string;
    benchmarks: Array<{ name: string; fn: () => Promise<void> | void }>;
  }): Promise<BenchmarkResult[]> {
    console.log(`\n🚀 Running benchmark suite: ${suite.name}`);
    console.log(`   Total benchmarks: ${suite.benchmarks.length}`);

    const results: BenchmarkResult[] = [];

    for (const benchmark of suite.benchmarks) {
      const result = await this.run(benchmark.name, benchmark.fn);
      results.push(result);
    }

    return results;
  }

  public saveResults(format?: 'json' | 'html' | 'md'): void {
    const fmt = format || this.config.reportFormat;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `benchmark-results-${timestamp}.${fmt}`;
    const filepath = path.join(this.config.outputDir, filename);

    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    if (fmt === 'json') {
      const data = Object.fromEntries(this.results);
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    } else if (fmt === 'md') {
      const content = this.generateMarkdownReport();
      fs.writeFileSync(filepath, content);
    } else if (fmt === 'html') {
      const content = this.generateHtmlReport();
      fs.writeFileSync(filepath, content);
    }

    console.log(`\n✅ Results saved to: ${filepath}`);
  }

  private generateMarkdownReport(): string {
    let md = `# Benchmark Results\n\n`;
    md += `Generated: ${new Date().toISOString()}\n\n`;
    md += `## Summary\n\n`;
    md += `| Benchmark | Mean (ms) | Median (ms) | P95 (ms) | Throughput (ops/s) |\n`;
    md += `|-----------|-----------|-------------|----------|-------------------|\n`;

    for (const [name, result] of this.results) {
      md += `| ${name} | ${result.mean.toFixed(2)} | ${result.median.toFixed(2)} | ${result.p95.toFixed(2)} | ${result.throughput.toFixed(2)} |\n`;
    }

    md += `\n## Detailed Results\n\n`;

    for (const [name, result] of this.results) {
      md += `### ${name}\n\n`;
      md += `- **Iterations**: ${result.iterations}\n`;
      md += `- **Mean**: ${result.mean.toFixed(4)} ms\n`;
      md += `- **Median**: ${result.median.toFixed(4)} ms\n`;
      md += `- **Min**: ${result.min.toFixed(4)} ms\n`;
      md += `- **Max**: ${result.max.toFixed(4)} ms\n`;
      md += `- **StdDev**: ${result.stdDev.toFixed(4)} ms\n`;
      md += `- **P50**: ${result.p50.toFixed(4)} ms\n`;
      md += `- **P90**: ${result.p90.toFixed(4)} ms\n`;
      md += `- **P95**: ${result.p95.toFixed(4)} ms\n`;
      md += `- **P99**: ${result.p99.toFixed(4)} ms\n`;
      md += `- **Throughput**: ${result.throughput.toFixed(2)} ops/sec\n`;
      md += `- **Memory**: ${(result.memoryUsed / 1024 / 1024).toFixed(2)} MB\n\n`;
    }

    return md;
  }

  private generateHtmlReport(): string {
    let html = `<!DOCTYPE html>
<html>
<head>
  <title>Benchmark Results</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    .metric { font-weight: bold; }
  </style>
</head>
<body>
  <h1>Benchmark Results</h1>
  <p>Generated: ${new Date().toISOString()}</p>
  <table>
    <tr>
      <th>Benchmark</th>
      <th>Mean (ms)</th>
      <th>Median (ms)</th>
      <th>P95 (ms)</th>
      <th>Throughput (ops/s)</th>
    </tr>`;

    for (const [name, result] of this.results) {
      html += `
    <tr>
      <td>${name}</td>
      <td>${result.mean.toFixed(2)}</td>
      <td>${result.median.toFixed(2)}</td>
      <td>${result.p95.toFixed(2)}</td>
      <td>${result.throughput.toFixed(2)}</td>
    </tr>`;
    }

    html += `
  </table>
</body>
</html>`;

    return html;
  }

  public getResults(): Map<string, BenchmarkResult> {
    return this.results;
  }

  public compareResults(baseline: Map<string, BenchmarkResult>): Map<string, { name: string; improvement: number; percentage: number }> {
    const comparison = new Map<string, { name: string; improvement: number; percentage: number }>();

    for (const [name, result] of this.results) {
      const baselineResult = baseline.get(name);
      if (baselineResult) {
        const improvement = baselineResult.mean - result.mean;
        const percentage = (improvement / baselineResult.mean) * 100;
        comparison.set(name, { name, improvement, percentage });
      }
    }

    return comparison;
  }
}

export default Benchmark;
