#!/usr/bin/env node

import { OptimizedProjectCodeParser } from '../src/core/code-parser/OptimizedProjectCodeParser.js';
import { SymbolTableManager } from '../src/core/symbol-table/SymbolTableManager.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 只测试解析性能的简化脚本
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`\n🚀 ArkTS 代码知识图谱 - 解析性能测试`);
    console.log(`\n用法:`);
    console.log(`  node dist/scripts/parse-performance-test.js <项目路径> [选项]`);
    console.log(`\n选项:`);
    console.log(`  --workers <n>    Worker 线程数 (默认: CPU 核心数 - 1)`);
    console.log(`  --batch <n>      批量处理大小 (默认: 50)`);
    console.log(`\n示例:`);
    console.log(`  node dist/scripts/parse-performance-test.js ./examples/sample-project`);
    process.exit(1);
  }

  const projectPath = args[0];
  
  // 解析选项
  let maxWorkers: number | undefined;
  let batchSize: number | undefined;
  
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--workers' && args[i + 1]) {
      maxWorkers = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--batch' && args[i + 1]) {
      batchSize = parseInt(args[i + 1]);
      i++;
    }
  }

  console.log(`\n📊 解析性能测试`);
  console.log(`═══════════════════════════════════════════════════════════`);
  console.log(`📁 项目: ${projectPath}`);
  console.log(`⚙️  配置:`);
  console.log(`  • Workers: ${maxWorkers ?? 'CPU 核心数 - 1'}`);
  console.log(`  • 批量大小: ${batchSize ?? 50}`);

  // 统计文件
  console.log(`\n📊 正在统计项目信息...`);
  let fileCount = 0;
  let totalLines = 0;
  const countFiles = (dir: string) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
            countFiles(fullPath);
          }
        } else if (['.ts', '.tsx', '.js', '.jsx', '.ets'].some(ext => entry.name.endsWith(ext))) {
          fileCount++;
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            totalLines += content.split('\n').length;
          } catch {}
        }
      }
    } catch {}
  };
  countFiles(projectPath);
  
  console.log(`✅ 项目信息:`);
  console.log(`  • 文件数: ${fileCount}`);
  console.log(`  • 代码行数: ${totalLines.toLocaleString()}`);

  console.log(`\n⏳ 开始测试优化版解析器...`);
  const symbolTable = new SymbolTableManager();
  const parser = new OptimizedProjectCodeParser(
    {
      parser: {
        include: ['**/*.{ts,tsx,js,jsx,ets}'],
        exclude: ['node_modules/**', 'dist/**', 'build/**', '.git/**'],
      },
      graph: {},
      vector: {},
      logging: {},
    },
    symbolTable,
    { maxWorkers, batchSize, streamProcessing: true }
  );

  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;
  
  let processedCount = 0;
  const result = await parser.parseProject(projectPath, (progress) => {
    processedCount = progress.processed;
    if (progress.processed % 100 === 0) {
      console.log(`  进度: ${progress.processed}/${progress.total} files...`);
    }
  });
  
  const endTime = Date.now();
  const endMemory = process.memoryUsage().heapUsed;

  const duration = endTime - startTime;
  const memoryUsed = (endMemory - startMemory) / 1024 / 1024;
  const throughput = (totalLines / duration) * 1000;

  console.log(`\n✅ 解析完成！`);
  console.log(`\n📈 性能指标:`);
  console.log(`═══════════════════════════════════════════════════════════`);
  console.log(`  • 文件数:   ${processedCount}`);
  console.log(`  • 实体数:   ${result.codeEntities.length}`);
  console.log(`  • 关系数:   ${result.codeRelations.length}`);
  console.log(`  • 耗时:     ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
  console.log(`  • 内存:     ${memoryUsed.toFixed(2)}MB`);
  console.log(`  • 吞吐量:   ${throughput.toFixed(0)} 行/秒`);
  console.log(`═══════════════════════════════════════════════════════════`);
  
  console.log(`\n📊 大规模项目估算:`);
  const scales = [
    { name: '小型项目', lines: 10000 },
    { name: '中型项目', lines: 100000 },
    { name: '大型项目', lines: 1000000 },
    { name: '千万级代码', lines: 10000000 },
  ];
  
  scales.forEach(scale => {
    const estimatedTime = (scale.lines / throughput);
    let status = '✅';
    if (estimatedTime > 3600) {
      status = '⚠️';
    } else if (estimatedTime > 60) {
      status = '🟢';
    }
    
    const timeStr = estimatedTime > 60 
      ? `${(estimatedTime / 60).toFixed(1)} 分钟` 
      : `${estimatedTime.toFixed(1)} 秒`;
    
    console.log(`  ${status} ${scale.name} (${scale.lines.toLocaleString()} 行): ${timeStr}`);
  });
  
  console.log(`\n✨ 测试完成！\n`);
}

main().catch(console.error);
