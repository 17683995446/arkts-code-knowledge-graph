#!/usr/bin/env node

import { OptimizedCodeKnowledgeGraphService } from '../src/services/OptimizedCodeKnowledgeGraphService.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 优化版本的性能测试脚本
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`\n🚀 ArkTS 代码知识图谱 - 优化后性能测试`);
    console.log(`\n用法:`);
    console.log(`  node dist/scripts/optimized-performance-test.js <项目路径> [选项]`);
    console.log(`\n选项:`);
    console.log(`  --workers <n>    Worker 线程数 (默认: CPU 核心数 - 1)`);
    console.log(`  --batch <n>      批量处理大小 (默认: 50)`);
    console.log(`  --no-stream      禁用流式处理`);
    console.log(`\n示例:`);
    console.log(`  node dist/scripts/optimized-performance-test.js ./examples/sample-project`);
    process.exit(1);
  }

  const projectPath = args[0];
  
  // 解析选项
  let maxWorkers: number | undefined;
  let batchSize: number | undefined;
  let streamProcessing = true;
  
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--workers' && args[i + 1]) {
      maxWorkers = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--batch' && args[i + 1]) {
      batchSize = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--no-stream') {
      streamProcessing = false;
    }
  }

  console.log(`\n📊 优化后性能测试`);
  console.log(`═══════════════════════════════════════════════════════════`);
  console.log(`📁 项目: ${projectPath}`);
  console.log(`⚙️  配置:`);
  console.log(`  • Workers: ${maxWorkers ?? 'CPU 核心数 - 1'}`);
  console.log(`  • 批量大小: ${batchSize ?? 50}`);
  console.log(`  • 流式处理: ${streamProcessing ? '启用' : '禁用'}`);

  const service = new OptimizedCodeKnowledgeGraphService({
    maxWorkers,
    batchSize,
    streamProcessing,
  });

  try {
    await service.initialize();
    
    console.log(`\n⏳ 开始分析...`);
    const result = await service.analyzeProject(projectPath);
    
    console.log(`\n✅ 分析完成！`);
    console.log(`\n📈 优化后性能指标:`);
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`  • 处理文件:   ${result.filesProcessed}`);
    console.log(`  • 实体数量:   ${result.entitiesCreated}`);
    console.log(`  • 关系数量:   ${result.relationsCreated}`);
    console.log(`  • 总耗时:     ${result.duration}ms (${(result.duration / 1000).toFixed(2)}s)`);
    console.log(`  • 内存使用:   ${result.memoryUsed.toFixed(2)}MB`);
    console.log(`  • 吞吐量:     ${result.throughput.toFixed(0)} 行/秒`);
    console.log(`═══════════════════════════════════════════════════════════`);
    
    console.log(`\n🎯 优化效果分析:`);
    
    // 估算项目大小
    let estimatedLines = 0;
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
            try {
              const content = fs.readFileSync(fullPath, 'utf-8');
              estimatedLines += content.split('\n').length;
            } catch {}
          }
        }
      } catch {}
    };
    countFiles(projectPath);
    
    console.log(`  • 估计项目代码行数: ${estimatedLines.toLocaleString()}`);
    console.log(`  • 当前吞吐量: ${result.throughput.toFixed(0)} 行/秒`);
    
    console.log(`\n📊 大规模项目估算:`);
    
    const scales = [
      { name: '小型项目', lines: 10000 },
      { name: '中型项目', lines: 100000 },
      { name: '大型项目', lines: 1000000 },
      { name: '千万级代码', lines: 10000000 },
    ];
    
    scales.forEach(scale => {
      const estimatedTime = (scale.lines / result.throughput).toFixed(1);
      let status = '✅';
      if (parseFloat(estimatedTime) > 3600) {
        status = '⚠️';
      } else if (parseFloat(estimatedTime) > 60) {
        status = '🟢';
      }
      
      const timeStr = parseFloat(estimatedTime) > 60 
        ? `${(parseFloat(estimatedTime) / 60).toFixed(1)} 分钟` 
        : `${estimatedTime} 秒`;
      
      console.log(`  ${status} ${scale.name} (${scale.lines.toLocaleString()} 行): ${timeStr}`);
    });
    
    console.log(`\n✨ 测试完成！`);
    console.log(`\n💡 建议优化：`);
    if (result.throughput < 1000) {
      console.log(`  ⚠️  吞吐量较低，考虑增加 Worker 数量`);
    }
    if (result.memoryUsed > 500) {
      console.log(`  ⚠️  内存使用较高，确保已启用流式处理`);
    }
    console.log(`\n`);
    
  } catch (error) {
    console.error(`\n❌ 测试失败:`, error);
    process.exit(1);
  }
}

main().catch(console.error);
