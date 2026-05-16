#!/usr/bin/env node

import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import * as fs from 'fs';
import * as path from 'path';

interface PerformanceMetrics {
  filesProcessed: number;
  totalLinesOfCode: number;
  entitiesCreated: number;
  relationsCreated: number;
  duration: number;
  memoryUsed: number;
  peakMemory: number;
  throughput: number;
}

class PerformanceBenchmark {
  private service: EnhancedCodeKnowledgeGraphService;
  private startMemory: number;
  private peakMemory: number;

  constructor() {
    this.service = new EnhancedCodeKnowledgeGraphService();
    this.startMemory = 0;
    this.peakMemory = 0;
  }

  async initialize(): Promise<void> {
    await this.service.initialize();
    this.startMemory = process.memoryUsage().heapUsed;
    this.peakMemory = this.startMemory;
  }

  trackMemory(): void {
    const currentMemory = process.memoryUsage().heapUsed;
    if (currentMemory > this.peakMemory) {
      this.peakMemory = currentMemory;
    }
  }

  formatBytes(bytes: number): string {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  }

  async benchmarkProject(projectPath: string): Promise<PerformanceMetrics> {
    console.log(`\n🔬 开始性能基准测试...`);
    console.log(`📁 项目路径: ${projectPath}`);

    if (!fs.existsSync(projectPath)) {
      throw new Error(`项目路径不存在: ${projectPath}`);
    }

    const startTime = Date.now();
    this.peakMemory = process.memoryUsage().heapUsed;

    try {
      console.log(`\n⏳ 正在分析项目...`);
      const result = await this.service.analyzeProject(projectPath);

      const endTime = Date.now();
      const duration = endTime - startTime;

      const stats = result.knowledgeGraph.getStatistics();
      
      const memoryUsed = process.memoryUsage().heapUsed - this.startMemory;
      const peakMemoryUsed = this.peakMemory - this.startMemory;

      const metrics: PerformanceMetrics = {
        filesProcessed: stats.fileEntityCount || 0,
        totalLinesOfCode: this.estimateTotalLinesOfCode(projectPath),
        entitiesCreated: stats.totalEntityCount,
        relationsCreated: stats.totalRelationCount,
        duration,
        memoryUsed,
        peakMemory: peakMemoryUsed,
        throughput: 0,
      };

      metrics.throughput = (metrics.totalLinesOfCode / duration) * 1000;

      return metrics;
    } catch (error) {
      console.error(`\n❌ 分析失败:`, error);
      throw error;
    }
  }

  private estimateTotalLinesOfCode(projectPath: string): number {
    let totalLines = 0;

    const countLines = (dir: string): void => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
            countLines(fullPath);
          }
        } else if (['.ts', '.tsx', '.js', '.jsx', '.ets'].some(ext => entry.name.endsWith(ext))) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            totalLines += content.split('\n').length;
          } catch {
            // Skip files that can't be read
          }
        }
      }
    };

    countLines(projectPath);
    return totalLines;
  }

  printMetrics(metrics: PerformanceMetrics): void {
    console.log(`\n📊 性能基准测试结果:`);
    console.log(`═══════════════════════════════════════════════════════`);
    console.log(`  文件处理数:     ${metrics.filesProcessed}`);
    console.log(`  代码总行数:     ${metrics.totalLinesOfCode.toLocaleString()}`);
    console.log(`  实体创建数:     ${metrics.entitiesCreated}`);
    console.log(`  关系创建数:     ${metrics.relationsCreated}`);
    console.log(`  总耗时:         ${metrics.duration} ms (${(metrics.duration / 1000).toFixed(2)} s)`);
    console.log(`  内存使用:       ${this.formatBytes(metrics.memoryUsed)}`);
    console.log(`  峰值内存:       ${this.formatBytes(metrics.peakMemory)}`);
    console.log(`  吞吐量:         ${metrics.throughput.toFixed(0)} 行/秒`);
    console.log(`═══════════════════════════════════════════════════════`);

    this.analyzePerformance(metrics);
  }

  private analyzePerformance(metrics: PerformanceMetrics): void {
    console.log(`\n🔍 性能分析:`);

    const issues: string[] = [];

    if (metrics.throughput < 10000) {
      issues.push(`⚠️  吞吐量过低 (${metrics.throughput.toFixed(0)} 行/秒)，建议优化解析速度`);
    }

    if (metrics.duration > 60000) {
      issues.push(`⚠️  处理时间过长 (${(metrics.duration / 60000).toFixed(1)} 分钟)，千万行代码可能需要数小时`);
    }

    if (metrics.memoryUsed > 500 * 1024 * 1024) {
      issues.push(`⚠️  内存使用过高 (${this.formatBytes(metrics.memoryUsed)})，可能导致内存溢出`);
    }

    const memoryPerThousandLines = metrics.memoryUsed / (metrics.totalLinesOfCode / 1000);
    if (memoryPerThousandLines > 50 * 1024 * 1024) {
      issues.push(`⚠️  每千行代码消耗内存过高 (${this.formatBytes(memoryPerThousandLines)})`);
    }

    if (issues.length === 0) {
      console.log(`  ✅ 性能表现良好，可以处理当前规模`);
    } else {
      console.log(`\n  发现的性能问题:`);
      issues.forEach(issue => console.log(`    ${issue}`));
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`\n🚀 ArkTS 代码知识图谱 - 性能基准测试`);
    console.log(`\n用法:`);
    console.log(`  node dist/scripts/performance-benchmark.js <项目路径>`);
    console.log(`\n示例:`);
    console.log(`  node dist/scripts/performance-benchmark.js ./examples/sample-project`);
    console.log(`  node dist/scripts/performance-benchmark.js /path/to/harmonyos/project`);
    process.exit(1);
  }

  const projectPath = args[0];
  
  const benchmark = new PerformanceBenchmark();
  
  try {
    await benchmark.initialize();
    const metrics = await benchmark.benchmarkProject(projectPath);
    benchmark.printMetrics(metrics);
    
    console.log(`\n✨ 基准测试完成!\n`);
  } catch (error) {
    console.error(`\n❌ 基准测试失败:`, error);
    process.exit(1);
  }
}

main().catch(console.error);
