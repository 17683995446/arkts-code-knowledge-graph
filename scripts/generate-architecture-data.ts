import fs from 'fs';
import path from 'path';

interface ModuleInfo {
  name: string;
  path: string;
  type: 'folder' | 'file';
  size?: string;
  children?: ModuleInfo[];
}

function getFiles(dir: string, basePath: string = ''): ModuleInfo[] {
  const items: ModuleInfo[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      // Skip certain directories
      if (['node_modules', '.git', 'dist', 'build', 'coverage', '__tests__'].includes(entry.name)) {
        continue;
      }
      
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name);
      
      if (entry.isDirectory()) {
        const children = getFiles(fullPath, relativePath);
        if (children.length > 0) {
          items.push({
            name: entry.name,
            path: relativePath,
            type: 'folder',
            children,
          });
        }
      } else {
        // Check if it's a code file
        const ext = path.extname(entry.name);
        if (['.ts', '.tsx', '.js', '.jsx', '.json'].includes(ext)) {
          try {
            const stats = fs.statSync(fullPath);
            items.push({
              name: entry.name,
              path: relativePath,
              type: 'file',
              size: formatBytes(stats.size),
            });
          } catch {
            items.push({
              name: entry.name,
              path: relativePath,
              type: 'file',
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return items;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function generateArchitectureFromCode(srcPath: string) {
  const modules = getFiles(srcPath);
  
  // Count statistics
  let totalFiles = 0;
  let totalLines = 0;
  
  function countStats(items: ModuleInfo[]) {
    for (const item of items) {
      if (item.type === 'file') {
        totalFiles++;
        if (item.path.endsWith('.ts') || item.path.endsWith('.tsx')) {
          try {
            const content = fs.readFileSync(path.join(srcPath, item.path), 'utf-8');
            totalLines += content.split('\n').length;
          } catch {}
        }
      } else if (item.children) {
        countStats(item.children);
      }
    }
  }
  
  countStats(modules);
  
  // Find module structure
  function findModule(name: string): ModuleInfo | null {
    function search(items: ModuleInfo[]): ModuleInfo | null {
      for (const item of items) {
        if (item.name === name) return item;
        if (item.children) {
          const found = search(item.children);
          if (found) return found;
        }
      }
      return null;
    }
    return search(modules);
  }
  
  const result = {
    project: {
      name: 'ArkTS 代码知识图谱系统',
      totalFiles,
      totalLines,
      lastUpdated: new Date().toISOString(),
    },
    modules,
    statistics: {
      totalFiles,
      totalLines,
      byType: {
        TypeScript: modules.filter(m => m.name.endsWith('.ts')).length,
        React: modules.filter(m => m.name.endsWith('.tsx')).length,
        Config: modules.filter(m => m.name.endsWith('.json')).length,
      },
    },
  };
  
  return result;
}

// Main execution
const srcPath = path.join(process.cwd(), 'src');
const outputPath = path.join(process.cwd(), 'src', 'data', 'architecture.json');

console.log('🔍 扫描源代码目录...');
console.log(`📁 源路径: ${srcPath}`);

const result = generateArchitectureFromCode(srcPath);

console.log(`\n✅ 分析完成!`);
console.log(`📊 项目统计:`);
console.log(`   • 总文件数: ${result.project.totalFiles}`);
console.log(`   • 总代码行数: ${result.project.totalLines.toLocaleString()}`);
console.log(`   • TypeScript 文件: ${result.statistics.byType.TypeScript}`);
console.log(`   • React 组件: ${result.statistics.byType.React}`);
console.log(`   • 配置文件: ${result.statistics.byType.Config}`);

// Create data directory if it doesn't exist
const dataDir = path.dirname(outputPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Write output
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log(`\n💾 架构数据已保存到: ${outputPath}`);
