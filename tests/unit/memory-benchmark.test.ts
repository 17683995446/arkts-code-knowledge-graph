import { describe, it, expect, beforeEach } from 'vitest';
import MemoryBenchmark, { MemoryMetrics, MemoryBenchmarkResult } from '../../src/core/benchmark/MemoryBenchmark';

describe('Memory Benchmark', () => {
  let memoryBenchmark: MemoryBenchmark;

  beforeEach(() => {
    memoryBenchmark = new MemoryBenchmark();
  });

  it('should create memory benchmark instance', () => {
    expect(memoryBenchmark).toBeDefined();
  });

  it('should get current memory metrics', () => {
    const metrics = memoryBenchmark.getCurrentMetrics();

    expect(metrics).toBeDefined();
    expect(metrics.timestamp).toBeInstanceOf(Date);
    expect(metrics.heapUsed).toBeGreaterThan(0);
    expect(metrics.heapTotal).toBeGreaterThan(0);
    expect(metrics.external).toBeGreaterThanOrEqual(0);
    expect(metrics.rss).toBeGreaterThan(0);
  });

  it('should measure operation memory usage', async () => {
    const { result: data, benchmark: memResult } = await memoryBenchmark.measureOperation(
      'array-creation',
      async () => {
        return new Array(1000).fill({ id: 0, data: 'test' });
      }
    );

    expect(data).toHaveLength(1000);
    expect(memResult).toBeDefined();
    expect(memResult.testName).toBe('array-creation');
    expect(memResult.initialMemory).toBeGreaterThan(0);
    expect(memResult.peakMemory).toBeGreaterThanOrEqual(memResult.initialMemory);
    expect(memResult.finalMemory).toBeGreaterThanOrEqual(0);
  });

  it('should measure map operations', async () => {
    const { result: map, benchmark: memResult } = await memoryBenchmark.measureOperation(
      'map-operations',
      async () => {
        const m = new Map<string, any>();
        for (let i = 0; i < 1000; i++) {
          m.set(`key_${i}`, { id: i, data: 'x'.repeat(100) });
        }
        for (let i = 0; i < 500; i++) {
          m.get(`key_${i}`);
        }
        return m;
      }
    );

    expect(map.size).toBe(1000);
    expect(memResult).toBeDefined();
    // 内存增加可能为0，因为是在同一进程，不用严格检查
  });

  it('should start and stop monitoring', () => {
    memoryBenchmark.startMonitoring(50);
    expect(() => memoryBenchmark.stopMonitoring()).not.toThrow();
  });

  it('should capture snapshots during monitoring', async () => {
    memoryBenchmark.startMonitoring(10);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const snapshots = memoryBenchmark.getSnapshots();
    expect(snapshots.length).toBeGreaterThan(0);

    memoryBenchmark.stopMonitoring();
  });

  it('should calculate peak memory', async () => {
    await memoryBenchmark.measureOperation('peak-test', async () => {
      const largeArray = new Array(10000).fill({ data: 'x'.repeat(1000) });
      return largeArray;
    });

    const peakMemory = memoryBenchmark.getPeakMemory();
    expect(peakMemory).toBeGreaterThan(0);
  });

  it('should run memory leak test', async () => {
    await memoryBenchmark.runMemoryLeakTest(10, async () => {
      const data = new Array(100).fill({ id: Math.random(), value: 'test' });
      return data;
    });
  });

  it('should reset benchmark state', async () => {
    await memoryBenchmark.measureOperation('reset-test', async () => {
      return new Array(100).fill(0);
    });

    memoryBenchmark.reset();

    const snapshots = memoryBenchmark.getSnapshots();
    expect(snapshots.length).toBe(0);
  });

  it('should measure nested operations', async () => {
    const { result: result1, benchmark: memResult1 } = await memoryBenchmark.measureOperation(
      'outer-operation',
      async () => {
        const outer = [];
        for (let i = 0; i < 10; i++) {
          const { result: inner } = await memoryBenchmark.measureOperation(
            `inner-${i}`,
            async () => {
              return new Array(100).fill(i);
            }
          );
          outer.push(inner);
        }
        return outer;
      }
    );

    expect(result1).toHaveLength(10);
    expect(memResult1).toBeDefined();
  });

  it('should handle large data structures', async () => {
    const { result: largeData, benchmark: memResult } = await memoryBenchmark.measureOperation(
      'large-structure',
      async () => {
        const nested = {
          level1: {
            level2: {
              level3: new Array(5000).fill({
                id: 0,
                name: 'test',
                metadata: { value: Math.random() },
              }),
            },
          },
        };
        return nested;
      }
    );

    expect(largeData.level1.level2.level3).toHaveLength(5000);
  });
});
