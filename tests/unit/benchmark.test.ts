import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Benchmark, { BenchmarkResult } from '../../src/core/benchmark/Benchmark';

describe('Benchmark Framework', () => {
  let benchmark: Benchmark;

  beforeAll(() => {
    benchmark = new Benchmark({
      name: 'test-benchmark',
      warmupIterations: 2,
      testIterations: 10,
      reportFormat: 'json',
      outputDir: './benchmark-results/test',
    });
  });

  afterAll(() => {
    benchmark.reset?.();
  });

  it('should create benchmark instance', () => {
    expect(benchmark).toBeDefined();
  });

  it('should run simple benchmark', async () => {
    const result = await benchmark.run('simple-test', async () => {
      let sum = 0;
      for (let i = 0; i < 100; i++) {
        sum += i;
      }
      return sum;
    });

    expect(result).toBeDefined();
    expect(result.name).toBe('simple-test');
    expect(result.iterations).toBe(10);
    expect(result.mean).toBeGreaterThan(0);
    expect(result.median).toBeGreaterThan(0);
    expect(result.min).toBeGreaterThanOrEqual(0);
    expect(result.max).toBeGreaterThan(result.min);
  });

  it('should calculate percentiles correctly', async () => {
    const result = await benchmark.run('percentile-test', async () => {
      const data = [];
      for (let i = 0; i < 100; i++) {
        data.push(i);
      }
      return data;
    });

    expect(result.p50).toBeGreaterThanOrEqual(result.min);
    expect(result.p50).toBeLessThanOrEqual(result.p95);
    expect(result.p95).toBeLessThanOrEqual(result.p99);
    expect(result.p99).toBeLessThanOrEqual(result.max);
  });

  it('should calculate throughput correctly', async () => {
    const result = await benchmark.run('throughput-test', async () => {
      return new Array(100).fill(0).map((_, i) => i * 2);
    });

    expect(result.throughput).toBeGreaterThan(0);
    expect(result.throughput).toBeCloseTo(1000 / result.mean, 0);
  });

  it('should track memory usage', async () => {
    const result = await benchmark.run('memory-test', async () => {
      const largeArray = new Array(10000).fill({ id: Math.random(), data: 'x'.repeat(100) });
      return largeArray;
    });

    expect(result.memoryUsed).toBeGreaterThan(0);
  });

  it('should run benchmark suite', async () => {
    const suite = {
      name: 'test-suite',
      benchmarks: [
        {
          name: 'operation-a',
          fn: async () => {
            let sum = 0;
            for (let i = 0; i < 50; i++) sum += i;
          },
        },
        {
          name: 'operation-b',
          fn: async () => {
            const arr = new Array(50).fill(0);
            arr.map((_, i) => i * 2);
          },
        },
      ],
    };

    const results = await benchmark.runSuite(suite);

    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('operation-a');
    expect(results[1].name).toBe('operation-b');
  });

  it('should save results in JSON format', () => {
    benchmark.saveResults('json');
    const results = benchmark.getResults();
    expect(results.size).toBeGreaterThan(0);
  });

  it('should compare results with baseline', () => {
    const baseline = new Map<string, BenchmarkResult>();
    baseline.set('simple-test', {
      name: 'simple-test',
      iterations: 10,
      duration: 100,
      mean: 10,
      median: 9,
      min: 8,
      max: 12,
      stdDev: 1.5,
      p50: 9,
      p90: 11,
      p95: 11.5,
      p99: 12,
      throughput: 100,
      memoryUsed: 1000,
      timestamp: new Date(),
    });

    const current = benchmark.getResults();
    const comparison = benchmark.compareResults(baseline);

    expect(comparison.size).toBeGreaterThan(0);
  });

  it('should handle errors gracefully', async () => {
    const errorBenchmark = new Benchmark({
      name: 'error-test',
      warmupIterations: 0,
      testIterations: 3,
    });

    try {
      await errorBenchmark.run('error-operation', async () => {
        if (Math.random() > 0.5) {
          throw new Error('Random error');
        }
      });
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should measure concurrent operations', async () => {
    const result = await benchmark.run('concurrent-test', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        Promise.resolve(i * 2)
      );
      await Promise.all(promises);
    });

    expect(result).toBeDefined();
    expect(result.mean).toBeGreaterThan(0);
  });

  it('should measure async operations', async () => {
    const result = await benchmark.run('async-test', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(result).toBeDefined();
    expect(result.mean).toBeGreaterThanOrEqual(10);
  });
});
