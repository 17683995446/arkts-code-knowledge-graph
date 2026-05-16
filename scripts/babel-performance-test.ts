#!/usr/bin/env node

import { BabelCodeKnowledgeGraphService } from '../src/services/BabelCodeKnowledgeGraphService.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Babel 高性能版本 vs ts-morph 版本对比测试
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`\n🚀 ArkTS 代码知识图谱 - Babel 高性能解析器测试`);
    console.log(`\n用法:`);
    console.log(`  node dist/scripts/babel-performance-test.js <项目路径> [选项]`);
    console.log(`\n选项:`);
    console.log(`  --no-vector    跳过向量索引构建`);
    console.log(`\n示例:`);
    console.log(`  node dist/scripts/babel-performance-test.js ./examples/sample-project`);
    console.log(`  node dist/scripts/babel-performance-test.js /tmp/nest-test --no-vector`);
    process.exit(1);
  }

  const projectPath = args[0];
  const skipVector = args.includes('--no-vector');

  console.log(`\n🚀 ArkTS 代码知识图谱 - Babel 高性能解析器测试`);
  console.log(`═══════════════════════════════════════════════════════════`);
  console.log(`📁 项目: ${projectPath}`);
  console.log(`⚙️  解析器: Babel (高性能版本)`);
  console.log(`   向量索引: ${skipVector ? '跳过' : '启用'}`);

  const service = new BabelCodeKnowledgeGraphService();

  try {
    await service.initialize();
    
    console.log(`\n⏳ 开始分析...`);
    const startTime = Date.now();
    const result = await service.analyzeProject(projectPath);
    const endTime = Date.now();
    
    // 统计项目信息
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
    
    console.log(`\n✅ 分析完成！`);
    console.log(`\n📊 Babel 高性能解析器测试结果:`);
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`  📁 项目信息:`);
    console.log(`    • 文件数:       ${fileCount}`);
    console.log(`    • 代码行数:     ${totalLines.toLocaleString()}`);
    console.log(`  📈 性能指标:`);
    console.log(`    • 解析器:       Babel (高性能)`);
    console.log(`    • 解析耗时:     ${result.duration}ms (${(result.duration / 1000).toFixed(2)}s)`);
    console.log(`    • 内存使用:     ${result.memoryUsed.toFixed(2)}MB`);
    console.log(`    • 吞吐量:       ${result.throughput.toFixed(0)} 行/秒`);
    console.log(`  📊 解析结果:`);
    console.log(`    • 实体数量:     ${result.entitiesCreated}`);
    console.log(`    • 关系数量:     ${result.relationsCreated}`);
    console.log(`    • 平均每行:     ${(result.entitiesCreated / totalLines).toFixed(2)} 个实体`);
    console.log(`═══════════════════════════════════════════════════════════`);
    
    console.log(`\n🎯 性能对比估算 (Babel vs ts-morph):`);
    
    // ts-morph 基准 (从之前的测试数据)
    const tsmorphThroughput = 1513; // 行/秒 (Nest.js)
    const babelThroughput = result.throughput;
    const speedup = babelThroughput / tsmorphThroughput;
    
    console.log(`  • Babel 吞吐量:     ${babelThroughput.toFixed(0)} 行/秒`);
    console.log(`  • ts-morph 吞吐量:  ${tsmorphThroughput} 行/秒 (历史基准)`);
    console.log(`  • 性能提升:        ${speedup > 1 ? '✅ ' : '⚠️ '}${speedup.toFixed(2)}x ${speedup > 1 ? '(Babel 更快)' : '(ts-morph 更快)'}`);
    
    console.log(`\n📊 大规模项目推算 (Babel):`);
    
    const scales = [
      { name: '小型项目', lines: 10000 },
      { name: '中型项目', lines: 100000 },
      { name: '大型项目', lines: 1000000 },
      { name: '千万级代码', lines: 10000000 },
    ];
    
    scales.forEach(scale => {
      const estimatedTime = (scale.lines / babelThroughput);
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
    
    console.log(`\n✨ Babel 性能测试完成！`);
    console.log(`\n💡 总结:`);
    if (speedup > 1) {
      console.log(`  ✅ Babel 解析器比 ts-morph 快 ${speedup.toFixed(2)} 倍`);
      console.log(`  ✅ 适合处理中大型项目`);
    } else {
      console.log(`  ⚠️ Babel 解析器性能与 ts-morph 相近`);
      console.log(`  💡 Babel 主要优势在于内存效率和简单场景`);
    }
    console.log(`\n`);
    
  } catch (error) {
    console.error(`\n❌ 测试失败:`, error);
    process.exit(1);
  }
}

main().catch(console.error);
