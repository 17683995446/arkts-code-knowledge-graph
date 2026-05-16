#!/usr/bin/env node

import { EnhancedProjectCodeParser } from '../src/core/code-parser/EnhancedProjectCodeParser.js';
import { SymbolTableManager } from '../src/core/symbol-table/SymbolTableManager.js';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const projectPath = process.argv[2] || './examples/sample-project';
  
  console.log(`\n🚀 ArkTS 代码知识图谱 - 简化性能测试`);
  console.log(`═══════════════════════════════════════════════════════════`);
  console.log(`📁 项目路径: ${projectPath}`);

  if (!fs.existsSync(projectPath)) {
    console.error(`❌ 项目路径不存在: ${projectPath}`);
    process.exit(1);
  }

  // 统计文件
  let fileCount = 0;
  let totalLines = 0;

  const countFiles = (dir: string): void => {
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
  
  console.log(`\n📊 项目统计:`);
  console.log(`   • TypeScript 文件数: ${fileCount}`);
  console.log(`   • 代码总行数: ${totalLines.toLocaleString()}`);

  console.log(`\n⚡ 测试解析速度...`);
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;

  try {
    const symbolTable = new SymbolTableManager();
    const parser = new EnhancedProjectCodeParser(
      {
        parser: {
          include: ['**/*.{ts,tsx,js,jsx,ets}'],
          exclude: ['node_modules/**', 'dist/**', 'build/**', '.git/**'],
        },
        graph: {},
        vector: {},
        logging: {},
      },
      symbolTable
    );

    const result = parser.parseProject(projectPath);
    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;

    const duration = endTime - startTime;
    const memoryUsed = (endMemory - startMemory) / 1024 / 1024;
    const throughput = (totalLines / duration) * 1000;

    console.log(`\n✅ 解析完成!`);
    console.log(`\n📈 性能指标:`);
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`   解析耗时:     ${duration} ms (${(duration / 1000).toFixed(2)} s)`);
    console.log(`   内存使用:     ${memoryUsed.toFixed(2)} MB`);
    console.log(`   吞吐量:       ${throughput.toFixed(0)} 行/秒`);
    console.log(`   实体数:       ${result.codeEntities.length}`);
    console.log(`   关系数:       ${result.codeRelations.length}`);
    console.log(`═══════════════════════════════════════════════════════════`);

    console.log(`\n📊 大规模项目推算:`);
    const scales = [
      { name: '小型项目', lines: 10000 },
      { name: '中型项目', lines: 100000 },
      { name: '大型项目', lines: 1000000 },
      { name: '超大型项目', lines: 10000000 },
    ];

    scales.forEach(scale => {
      const estimatedTime = (scale.lines / throughput / 1000);
      const estimatedMemory = (memoryUsed * (scale.lines / totalLines));
      
      let status = '✅';
      if (estimatedTime > 3600) {
        status = '❌';
      } else if (estimatedTime > 60) {
        status = '⚠️';
      }

      const timeStr = estimatedTime > 60 ? `${(estimatedTime/60).toFixed(1)} 分钟` : `${estimatedTime.toFixed(1)} 秒`;
      console.log(`   ${status} ${scale.name} (${scale.lines.toLocaleString()} 行): ${timeStr}, ${estimatedMemory.toFixed(1)} MB`);
    });

    console.log(`\n✨ 测试完成!\n`);
  } catch (error) {
    console.error(`\n❌ 测试失败:`, error);
    process.exit(1);
  }
}

main();
