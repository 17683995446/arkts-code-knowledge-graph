import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';
import * as crypto from 'crypto';
import Benchmark, { BenchmarkConfig, BenchmarkResult } from './Benchmark';

const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);

export interface ParseBenchmarkConfig {
  projectPath: string;
  extensions: string[];
  sizes: {
    small: number;
    medium: number;
    large: number;
    xlarge: number;
  };
  warmupIterations: number;
  testIterations: number;
}

export class ParsePerformanceBenchmark {
  private benchmark: Benchmark;
  private config: ParseBenchmarkConfig;

  constructor(config: ParseBenchmarkConfig) {
    this.config = config;
    this.benchmark = new Benchmark({
      name: 'parse-performance',
      warmupIterations: config.warmupIterations,
      testIterations: config.testIterations,
      reportFormat: 'json',
      outputDir: './benchmark-results/parse',
    });
  }

  public async runAllSizes(): Promise<Map<string, BenchmarkResult>> {
    const results = new Map<string, BenchmarkResult>();

    const smallFiles = await this.getFilesBySize(this.config.sizes.small);
    const mediumFiles = await this.getFilesBySize(this.config.sizes.medium);
    const largeFiles = await this.getFilesBySize(this.config.sizes.large);
    const xlargeFiles = await this.getFilesBySize(this.config.sizes.xlarge);

    if (smallFiles.length > 0) {
      console.log(`\n🟢 Small files benchmark (${smallFiles.length} files, <${this.config.sizes.small}KB)`);
      const result = await this.benchmark.run('small-files', async () => {
        await this.parseFiles(smallFiles);
      });
      results.set('small', result);
    }

    if (mediumFiles.length > 0) {
      console.log(`\n🟡 Medium files benchmark (${mediumFiles.length} files, ${this.config.sizes.small}-${this.config.sizes.medium}KB)`);
      const result = await this.benchmark.run('medium-files', async () => {
        await this.parseFiles(mediumFiles);
      });
      results.set('medium', result);
    }

    if (largeFiles.length > 0) {
      console.log(`\n🟠 Large files benchmark (${largeFiles.length} files, ${this.config.sizes.medium}-${this.config.sizes.large}KB)`);
      const result = await this.benchmark.run('large-files', async () => {
        await this.parseFiles(largeFiles);
      });
      results.set('large', result);
    }

    if (xlargeFiles.length > 0) {
      console.log(`\n🔴 XLarge files benchmark (${xlargeFiles.length} files, >${this.config.sizes.large}KB)`);
      const result = await this.benchmark.run('xlarge-files', async () => {
        await this.parseFiles(xlargeFiles);
      });
      results.set('xlarge', result);
    }

    return results;
  }

  private async getFilesBySize(maxSize: number): Promise<string[]> {
    const pattern = path.join(this.config.projectPath, '**/*.{ts,tsx,js,jsx}');
    const files = globSync(pattern, { ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'] });

    const result: string[] = [];
    for (const file of files) {
      try {
        const stats = await stat(file);
        if (stats.size <= maxSize * 1024) {
          result.push(file);
        }
      } catch (err) {
        continue;
      }
    }

    return result;
  }

  private async parseFiles(files: string[]): Promise<void> {
    for (const file of files) {
      try {
        const content = await readFile(file, 'utf-8');
        const hash = crypto.createHash('md5').update(content).digest('hex');
        const lines = content.split('\n');
        const tokens = content.split(/\s+/).length;
      } catch (err) {
        continue;
      }
    }
  }

  public async runConcurrencyTest(
    fileCount: number,
    concurrencyLevels: number[]
  ): Promise<Map<number, BenchmarkResult>> {
    const files = await this.getFilesBySize(this.config.sizes.large);
    const selectedFiles = files.slice(0, Math.min(fileCount, files.length));

    const results = new Map<number, BenchmarkResult>();

    for (const concurrency of concurrencyLevels) {
      console.log(`\n⚡ Concurrency test: ${concurrency} parallel operations`);

      const result = await this.benchmark.run(`concurrency-${concurrency}`, async () => {
        const chunks = this.chunkArray(selectedFiles, concurrency);
        for (const chunk of chunks) {
          await Promise.all(chunk.map((file) => this.parseFiles([file])));
        }
      });

      results.set(concurrency, result);
    }

    return results;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  public async runBatchTest(
    batchSizes: number[]
  ): Promise<Map<number, BenchmarkResult>> {
    const files = await this.getFilesBySize(this.config.sizes.large);

    const results = new Map<number, BenchmarkResult>();

    for (const batchSize of batchSizes) {
      console.log(`\n📦 Batch size test: ${batchSize} files per batch`);

      const result = await this.benchmark.run(`batch-${batchSize}`, async () => {
        const batches = this.chunkArray(files, batchSize);
        for (const batch of batches) {
          await this.parseFiles(batch);
        }
      });

      results.set(batchSize, result);
    }

    return results;
  }

  public getBenchmark(): Benchmark {
    return this.benchmark;
  }
}

export default ParsePerformanceBenchmark;
