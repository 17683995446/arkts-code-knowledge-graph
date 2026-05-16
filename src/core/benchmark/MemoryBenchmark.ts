import { EventEmitter } from 'events';
import * as v8 from 'v8';
import * as process from 'process';

export interface MemoryMetrics {
  timestamp: Date;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
}

export interface MemorySnapshot {
  timestamp: Date;
  heapsnapshot?: string;
  metrics: MemoryMetrics;
}

export interface MemoryBenchmarkResult {
  testName: string;
  initialMemory: number;
  peakMemory: number;
  finalMemory: number;
  memoryIncrease: number;
  gcCount: number;
  heapStatistics: v8.HeapSpaceStatistics[];
  timestamp: Date;
}

export class MemoryBenchmark extends EventEmitter {
  private snapshots: MemorySnapshot[] = [];
  private initialMetrics: MemoryMetrics | null = null;
  private peakHeapUsed: number = 0;
  private gcCount: number = 0;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private monitoringIntervalMs: number = 100;

  constructor() {
    super();

    this.setupGCTracking();
  }

  private setupGCTracking(): void {
    if (global.gc) {
      console.log('   ✅ GC tracking enabled');
      this.gcCount = 0;
    } else {
      console.log('   ⚠️  Run with --expose-gc to enable GC tracking');
    }
  }

  public startMonitoring(intervalMs: number = 100): void {
    this.initialMetrics = this.getCurrentMetrics();
    this.peakHeapUsed = this.initialMetrics.heapUsed;
    this.snapshots = [];

    this.monitoringIntervalMs = intervalMs;
    this.monitoringInterval = setInterval(() => {
      this.captureSnapshot();
    }, intervalMs);

    console.log(`   📊 Memory monitoring started (interval: ${intervalMs}ms)`);
  }

  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('   📊 Memory monitoring stopped');
  }

  private captureSnapshot(): void {
    const metrics = this.getCurrentMetrics();
    this.snapshots.push({
      timestamp: new Date(),
      metrics,
    });

    if (metrics.heapUsed > this.peakHeapUsed) {
      this.peakHeapUsed = metrics.heapUsed;
    }

    this.emit('snapshot', metrics);
  }

  public getCurrentMetrics(): MemoryMetrics {
    const usage = process.memoryUsage();
    return {
      timestamp: new Date(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
      arrayBuffers: usage.arrayBuffers || 0,
    };
  }

  public async measureOperation<T>(
    operationName: string,
    operation: () => Promise<T> | T
  ): Promise<{ result: T; benchmark: MemoryBenchmarkResult }> {
    console.log(`\n📈 Measuring memory for: ${operationName}`);

    const initialMemory = this.getCurrentMetrics();
    const initialHeapUsed = initialMemory.heapUsed;

    global.gc?.();

    const startMetrics = this.getCurrentMetrics();
    this.startMonitoring();

    let result: T;
    try {
      result = await operation();
    } finally {
      this.stopMonitoring();
    }

    global.gc?.();
    this.gcCount++;

    const finalMemory = this.getCurrentMetrics();
    const peakSnapshot = this.getPeakSnapshot();

    const benchmarkResult: MemoryBenchmarkResult = {
      testName: operationName,
      initialMemory: initialHeapUsed,
      peakMemory: peakSnapshot?.metrics.heapUsed || this.peakHeapUsed,
      finalMemory: finalMemory.heapUsed,
      memoryIncrease: finalMemory.heapUsed - initialHeapUsed,
      gcCount: this.gcCount,
      heapStatistics: this.getHeapStatistics(),
      timestamp: new Date(),
    };

    this.printMemoryResult(benchmarkResult);

    return { result, benchmark: benchmarkResult };
  }

  private getPeakSnapshot(): MemorySnapshot | null {
    if (this.snapshots.length === 0) return null;
    return this.snapshots.reduce((peak, current) =>
      current.metrics.heapUsed > peak.metrics.heapUsed ? current : peak
    );
  }

  private getHeapStatistics(): any[] {
    try {
      // 尝试使用 getHeapSpaceStatistics 或回退到基本统计
      if (typeof (v8 as any).getHeapSpaceStatistics === 'function') {
        return (v8 as any).getHeapSpaceStatistics();
      } else if (typeof (v8 as any).getHeapSpaces === 'function') {
        return (v8 as any).getHeapSpaces();
      }
    } catch (e) {
      // 忽略错误，返回空数组
    }
    
    // 返回简化的基本统计
    const usage = process.memoryUsage();
    return [{
      space_name: 'total',
      space_size: usage.heapTotal,
      space_used_size: usage.heapUsed,
      space_available_size: usage.heapTotal - usage.heapUsed,
      physical_space_size: usage.rss
    }];
  }

  private printMemoryResult(result: MemoryBenchmarkResult): void {
    console.log(`\n📊 Memory Results for ${result.testName}:`);
    console.log(`   Initial Memory: ${(result.initialMemory / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Peak Memory: ${(result.peakMemory / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Final Memory: ${(result.finalMemory / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Memory Increase: ${(result.memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   GC Count: ${result.gcCount}`);

    const heapStats = result.heapStatistics;
    if (heapStats && heapStats.length > 0) {
      console.log(`\n   Heap Spaces:`);
      for (const space of heapStats) {
        console.log(`     ${space.space_name}:`);
        console.log(`       Size: ${(space.space_size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`       Used: ${(space.space_used_size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`       Available: ${(space.space_available_size / 1024 / 1024).toFixed(2)} MB`);
      }
    }
  }

  public async runMemoryLeakTest(
    iterations: number,
    operation: () => Promise<void> | void
  ): Promise<void> {
    console.log(`\n🔍 Running memory leak test (${iterations} iterations)`);

    const initialMemory = this.getCurrentMetrics();
    const memoryReadings: number[] = [];

    for (let i = 0; i < iterations; i++) {
      await operation();

      if (i % 10 === 0) {
        global.gc?.();
        const metrics = this.getCurrentMetrics();
        memoryReadings.push(metrics.heapUsed);
        console.log(`   Iteration ${i}: ${(metrics.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      }
    }

    global.gc?.();
    const finalMemory = this.getCurrentMetrics();

    console.log(`\n📈 Memory Leak Analysis:`);
    console.log(`   Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Increase: ${((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Growth Rate: ${((finalMemory.heapUsed / initialMemory.heapUsed - 1) * 100).toFixed(2)}%`);

    if (memoryReadings.length > 1) {
      const trend = this.calculateTrend(memoryReadings);
      console.log(`   Trend: ${trend > 0 ? '📈 Increasing' : '📉 Stable/Decreasing'}`);
    }
  }

  private calculateTrend(readings: number[]): number {
    if (readings.length < 2) return 0;
    const first = readings[0];
    const last = readings[readings.length - 1];
    return (last - first) / first;
  }

  public generateHeapSnapshot(filename?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotFilename = filename || `heap-snapshot-${timestamp}.heapsnapshot`;
    const snapshotPath = v8.writeHeapSnapshot(snapshotFilename);
    console.log(`\n📸 Heap snapshot saved: ${snapshotPath}`);
    return snapshotPath;
  }

  public getSnapshots(): MemorySnapshot[] {
    return this.snapshots;
  }

  public getPeakMemory(): number {
    return this.peakHeapUsed;
  }

  public reset(): void {
    this.snapshots = [];
    this.initialMetrics = null;
    this.peakHeapUsed = 0;
    this.gcCount = 0;
    this.stopMonitoring();
  }
}

export default MemoryBenchmark;
