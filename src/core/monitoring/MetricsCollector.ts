import { EventEmitter } from 'events';
import * as os from 'os';
import { performance } from 'perf_hooks';

export interface Metric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface MetricSummary {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timer';

export class MetricsCollector extends EventEmitter {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private timers: Map<string, number[]> = new Map();
  private metricsHistory: Metric[] = [];
  private maxHistorySize: number = 10000;

  constructor() {
    super();
  }

  public counter(name: string, value: number = 1, tags?: Record<string, string>): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
    this.recordMetric('counter', name, current + value, tags);
  }

  public gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.gauges.set(name, value);
    this.recordMetric('gauge', name, value, tags);
  }

  public histogram(name: string, value: number, tags?: Record<string, string>): void {
    const values = this.histograms.get(name) || [];
    values.push(value);
    this.histograms.set(name, values);
    this.recordMetric('histogram', name, value, tags);
  }

  public timer(name: string, durationMs: number, tags?: Record<string, string>): void {
    const durations = this.timers.get(name) || [];
    durations.push(durationMs);
    this.timers.set(name, durations);
    this.recordMetric('timer', name, durationMs, tags);
  }

  private recordMetric(type: MetricType, name: string, value: number, tags?: Record<string, string>): void {
    const metric: Metric = {
      name: `${type}.${name}`,
      value,
      unit: this.getUnit(type),
      timestamp: new Date(),
      tags,
    };

    this.metricsHistory.push(metric);
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }

    this.emit('metric', metric);
  }

  private getUnit(type: MetricType): string {
    switch (type) {
      case 'counter':
        return 'count';
      case 'gauge':
        return 'value';
      case 'histogram':
        return 'ms';
      case 'timer':
        return 'ms';
      default:
        return 'value';
    }
  }

  public getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  public getGauge(name: string): number | undefined {
    return this.gauges.get(name);
  }

  public getHistogram(name: string): number[] {
    return this.histograms.get(name) || [];
  }

  public getTimer(name: string): number[] {
    return this.timers.get(name) || [];
  }

  public getSummary(name: string, type: MetricType): MetricSummary | null {
    let values: number[];

    switch (type) {
      case 'counter':
        const counterValue = this.counters.get(name);
        if (counterValue === undefined) return null;
        values = [counterValue];
        break;
      case 'gauge':
        const gaugeValue = this.gauges.get(name);
        if (gaugeValue === undefined) return null;
        values = [gaugeValue];
        break;
      case 'histogram':
        values = this.histograms.get(name) || [];
        break;
      case 'timer':
        values = this.timers.get(name) || [];
        break;
      default:
        return null;
    }

    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const avg = sum / sorted.length;

    return {
      count: sorted.length,
      sum,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg,
      p50: this.percentile(sorted, 0.5),
      p90: this.percentile(sorted, 0.9),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
    };
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.floor(sorted.length * p);
    return sorted[Math.min(index, sorted.length - 1)];
  }

  public getAllMetrics(): {
    counters: Map<string, number>;
    gauges: Map<string, number>;
    histograms: Map<string, number[]>;
    timers: Map<string, number[]>;
  } {
    return {
      counters: new Map(this.counters),
      gauges: new Map(this.gauges),
      histograms: new Map(this.histograms),
      timers: new Map(this.timers),
    };
  }

  public getMetricsHistory(limit?: number): Metric[] {
    if (limit) {
      return this.metricsHistory.slice(-limit);
    }
    return [...this.metricsHistory];
  }

  public reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.timers.clear();
    this.metricsHistory = [];
  }

  public resetMetric(name: string, type: MetricType): void {
    switch (type) {
      case 'counter':
        this.counters.delete(name);
        break;
      case 'gauge':
        this.gauges.delete(name);
        break;
      case 'histogram':
        this.histograms.delete(name);
        break;
      case 'timer':
        this.timers.delete(name);
        break;
    }
  }
}

export class SystemMetricsCollector extends EventEmitter {
  private collector: MetricsCollector;
  private interval: NodeJS.Timeout | null = null;
  private collectionIntervalMs: number = 5000;

  constructor(metricsCollector?: MetricsCollector) {
    super();
    this.collector = metricsCollector || new MetricsCollector();
  }

  public start(autoCollect: boolean = true): void {
    if (autoCollect) {
      this.interval = setInterval(() => {
        this.collectSystemMetrics();
      }, this.collectionIntervalMs);
    }

    this.collectSystemMetrics();
  }

  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  public collectSystemMetrics(): void {
    this.collectCPUMetrics();
    this.collectMemoryMetrics();
    this.collectProcessMetrics();
    this.collectEventLoopMetrics();
  }

  private collectCPUMetrics(): void {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    }

    const cpuUsage = ((totalTick - totalIdle) / totalTick) * 100;

    this.collector.gauge('system.cpu.usage', cpuUsage, { type: 'total' });
    this.collector.gauge('system.cpu.cores', cpus.length);

    for (let i = 0; i < cpus.length; i++) {
      const cpu = cpus[i];
      const idle = cpu.times.idle;
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const usage = ((total - idle) / total) * 100;

      this.collector.gauge(`system.cpu.core.${i}.usage`, usage);
    }
  }

  private collectMemoryMetrics(): void {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const usagePercent = (used / total) * 100;

    this.collector.gauge('system.memory.total', total, { unit: 'bytes' });
    this.collector.gauge('system.memory.free', free, { unit: 'bytes' });
    this.collector.gauge('system.memory.used', used, { unit: 'bytes' });
    this.collector.gauge('system.memory.usage', usagePercent);

    const processMem = process.memoryUsage();
    this.collector.gauge('process.memory.heapUsed', processMem.heapUsed, { unit: 'bytes' });
    this.collector.gauge('process.memory.heapTotal', processMem.heapTotal, { unit: 'bytes' });
    this.collector.gauge('process.memory.external', processMem.external, { unit: 'bytes' });
    this.collector.gauge('process.memory.rss', processMem.rss, { unit: 'bytes' });
  }

  private collectProcessMetrics(): void {
    const cpuUsage = process.cpuUsage();
    this.collector.gauge('process.cpu.user', cpuUsage.user, { unit: 'microseconds' });
    this.collector.gauge('process.cpu.system', cpuUsage.system, { unit: 'microseconds' });

    this.collector.gauge('process.uptime', process.uptime());
    this.collector.gauge('process.pid', process.pid);

    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    this.collector.gauge('process.memory.heapUsedMB', heapUsedMB);
    this.collector.gauge('process.memory.heapTotalMB', heapTotalMB);
  }

  private collectEventLoopMetrics(): void {
    const lag = performance.eventLoopLag();
    this.collector.gauge('process.eventLoop.lag', lag, { unit: 'ms' });

    if (performance.eventLoopUtilization) {
      const utilization = performance.eventLoopUtilization();
      this.collector.gauge('process.eventLoop.utilization.active', utilization.active);
      this.collector.gauge('process.eventLoop.utilization.idle', utilization.idle);
      this.collector.gauge('process.eventLoop.utilization.total', utilization.total);
    }
  }

  public getCollector(): MetricsCollector {
    return this.collector;
  }
}

export class ApplicationMetricsCollector {
  private collector: MetricsCollector;

  constructor(metricsCollector?: MetricsCollector) {
    this.collector = metricsCollector || new MetricsCollector();
  }

  public recordParseStart(fileCount: number): void {
    this.collector.counter('parse.started');
    this.collector.gauge('parse.fileCount', fileCount);
    this.collector.gauge('parse.active', 1);
  }

  public recordParseComplete(fileCount: number, durationMs: number): void {
    this.collector.counter('parse.completed');
    this.collector.histogram('parse.duration', durationMs);
    this.collector.gauge('parse.fileCount', fileCount);
    this.collector.gauge('parse.active', 0);
    this.collector.gauge('parse.filesPerSecond', (fileCount / durationMs) * 1000);
  }

  public recordParseError(error: string): void {
    this.collector.counter('parse.errors', 1, { error });
  }

  public recordQueryStart(query: string): void {
    this.collector.counter('query.started');
    const startTime = Date.now();
    return startTime as unknown as void;
  }

  public recordQueryComplete(durationMs: number, resultCount: number): void {
    this.collector.counter('query.completed');
    this.collector.histogram('query.duration', durationMs);
    this.collector.gauge('query.results', resultCount);
  }

  public recordQueryError(error: string): void {
    this.collector.counter('query.errors', 1, { error });
  }

  public recordCacheHit(cache: string): void {
    this.collector.counter('cache.hit', 1, { cache });
  }

  public recordCacheMiss(cache: string): void {
    this.collector.counter('cache.miss', 1, { cache });
  }

  public recordGraphOperation(operation: string, durationMs: number): void {
    this.collector.histogram(`graph.${operation}.duration`, durationMs);
    this.collector.counter(`graph.${operation}.executed`);
  }

  public getCollector(): MetricsCollector {
    return this.collector;
  }
}

export default MetricsCollector;
