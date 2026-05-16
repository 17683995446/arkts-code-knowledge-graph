import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';

export interface ArchitectureDocConfig {
  outputDir: string;
  title: string;
  description: string;
  includeDiagrams: boolean;
}

export interface ModuleInfo {
  name: string;
  path: string;
  description?: string;
  exports: string[];
  dependencies: string[];
  publicApi: PublicApi[];
}

export interface PublicApi {
  name: string;
  type: 'class' | 'interface' | 'function' | 'type' | 'enum';
  signature: string;
  description?: string;
}

export interface ArchitectureDocument {
  title: string;
  description: string;
  generatedAt: Date;
  modules: ModuleInfo[];
  dependencies: DependencyGraph;
  overview: {
    totalModules: number;
    totalExports: number;
    maxDepth: number;
  };
}

export interface DependencyGraph {
  nodes: string[];
  edges: Array<{ from: string; to: string; type: string }>;
}

export class ArchitectureDocumentationGenerator {
  private config: ArchitectureDocConfig;
  private modules: Map<string, ModuleInfo> = new Map();

  constructor(config: Partial<ArchitectureDocConfig> = {}) {
    this.config = {
      outputDir: './docs/architecture',
      title: 'ArkTS Knowledge Graph System',
      description: 'Architecture Documentation',
      includeDiagrams: true,
      ...config,
    };
  }

  public generate(sourcePaths: string[]): ArchitectureDocument {
    console.log(`\n🏗️  Generating Architecture Documentation...`);
    console.log(`   Source paths: ${sourcePaths.join(', ')}`);

    this.modules.clear();
    this.analyzeModules(sourcePaths);

    const doc: ArchitectureDocument = {
      title: this.config.title,
      description: this.config.description,
      generatedAt: new Date(),
      modules: Array.from(this.modules.values()),
      dependencies: this.buildDependencyGraph(),
      overview: this.calculateOverview(),
    };

    console.log(`   ✅ Analyzed ${doc.modules.length} modules`);
    console.log(`   ✅ Identified ${doc.overview.totalExports} public APIs`);

    return doc;
  }

  private analyzeModules(sourcePaths: string[]): void {
    for (const sourcePath of sourcePaths) {
      const pattern = path.isAbsolute(sourcePath)
        ? path.join(sourcePath, '**/index.ts')
        : path.join(process.cwd(), sourcePath, '**/index.ts');

      const indexFiles = globSync(pattern, {
        ignore: ['**/node_modules/**', '**/dist/**'],
      });

      for (const indexFile of indexFiles) {
        this.analyzeModule(indexFile);
      }
    }
  }

  private analyzeModule(indexFile: string): void {
    const modulePath = path.dirname(indexFile);
    const content = fs.readFileSync(indexFile, 'utf-8');

    const moduleName = this.extractModuleName(modulePath);
    const exports = this.extractExports(content);
    const dependencies = this.extractDependencies(content, modulePath);
    const publicApi = this.extractPublicApi(indexFile, exports);

    const moduleInfo: ModuleInfo = {
      name: moduleName,
      path: modulePath,
      description: this.generateModuleDescription(moduleName),
      exports: exports,
      dependencies: dependencies,
      publicApi: publicApi,
    };

    this.modules.set(moduleName, moduleInfo);
  }

  private extractModuleName(modulePath: string): string {
    const relativePath = path.relative(process.cwd(), modulePath);
    const parts = relativePath.split(path.sep);
    return parts.join('/');
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];

    const exportAllMatches = content.match(/export\s*\*\s*from\s*['"]([^'"]+)['"]/g);
    if (exportAllMatches) {
      for (const match of exportAllMatches) {
        const importMatch = match.match(/import\s*\*\s*as\s+(\w+)/);
        if (importMatch) {
          exports.push(importMatch[1]);
        }
      }
    }

    const namedExportMatches = content.match(/export\s+\{([^}]+)\}/g);
    if (namedExportMatches) {
      for (const match of namedExportMatches) {
        const items = match.match(/(\w+)/g);
        if (items) {
          exports.push(...items.slice(1));
        }
      }
    }

    return exports;
  }

  private extractDependencies(content: string, modulePath: string): string[] {
    const dependencies: string[] = [];

    const importMatches = content.match(/import\s+.*?from\s+['"]([^'"]+)['"]/g);
    if (importMatches) {
      for (const match of importMatches) {
        const importMatch = match.match(/from\s+['"]([^'"]+)['"]/);
        if (importMatch) {
          const importPath = importMatch[1];
          if (!importPath.startsWith('.') && !importPath.startsWith('@types')) {
            dependencies.push(importPath);
          } else if (importPath.startsWith('.')) {
            const resolvedPath = path.resolve(modulePath, importPath);
            const moduleName = this.extractModuleName(path.dirname(resolvedPath));
            if (!dependencies.includes(moduleName)) {
              dependencies.push(moduleName);
            }
          }
        }
      }
    }

    return [...new Set(dependencies)];
  }

  private extractPublicApi(indexFile: string, exports: string[]): PublicApi[] {
    const publicApi: PublicApi[] = [];

    const content = fs.readFileSync(indexFile, 'utf-8');

    for (const exportName of exports) {
      const apiMatch = content.match(
        new RegExp(`export\\s+(class|interface|type|enum|function)\\s+${exportName}`)
      );
      if (apiMatch) {
        publicApi.push({
          name: exportName,
          type: apiMatch[1] as any,
          signature: apiMatch[0],
        });
      }
    }

    return publicApi;
  }

  private generateModuleDescription(moduleName: string): string {
    const parts = moduleName.split('/');
    const lastPart = parts[parts.length - 1];

    const descriptionMap: Record<string, string> = {
      benchmark: 'Performance benchmarking and profiling tools',
      fileWatcher: 'Real-time file system monitoring and change detection',
      incremental: 'Incremental parsing and graph update mechanisms',
      monitoring: 'System metrics collection and alerting',
      parser: 'Code parsing and AST generation',
      scheduler: 'Task scheduling and execution management',
      graph: 'Graph database operations and queries',
      search: 'Full-text and semantic search capabilities',
      visualization: 'Data visualization and chart generation',
      shared: 'Shared utilities and common types',
      config: 'Configuration management and validation',
      errors: 'Error handling and custom error classes',
      cli: 'Command-line interface tools',
      services: 'Core business logic services',
    };

    return descriptionMap[lastPart] || `Module: ${lastPart}`;
  }

  private buildDependencyGraph(): DependencyGraph {
    const nodes: string[] = [];
    const edges: Array<{ from: string; to: string; type: string }> = [];

    for (const [moduleName, moduleInfo] of this.modules) {
      if (!nodes.includes(moduleName)) {
        nodes.push(moduleName);
      }

      for (const dep of moduleInfo.dependencies) {
        if (!nodes.includes(dep)) {
          nodes.push(dep);
        }
        edges.push({
          from: moduleName,
          to: dep,
          type: 'import',
        });
      }
    }

    return { nodes, edges };
  }

  private calculateOverview(): ArchitectureDocument['overview'] {
    const modules = Array.from(this.modules.values());

    let totalExports = 0;
    let maxDepth = 0;

    for (const module of modules) {
      totalExports += module.publicApi.length;
      const depth = this.calculateModuleDepth(module.name);
      if (depth > maxDepth) {
        maxDepth = depth;
      }
    }

    return {
      totalModules: modules.length,
      totalExports,
      maxDepth,
    };
  }

  private calculateModuleDepth(moduleName: string): number {
    const moduleInfo = this.modules.get(moduleName);
    if (!moduleInfo || moduleInfo.dependencies.length === 0) {
      return 0;
    }

    let maxDepth = 0;
    for (const dep of moduleInfo.dependencies) {
      const depDepth = this.calculateModuleDepth(dep);
      if (depDepth > maxDepth) {
        maxDepth = depDepth;
      }
    }

    return maxDepth + 1;
  }

  public saveDocumentation(doc: ArchitectureDocument, format: 'json' | 'md' | 'html' = 'md'): void {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    switch (format) {
      case 'json':
        this.saveJsonDocumentation(doc, timestamp);
        break;
      case 'md':
        this.saveMarkdownDocumentation(doc, timestamp);
        break;
      case 'html':
        this.saveHtmlDocumentation(doc, timestamp);
        break;
    }
  }

  private saveJsonDocumentation(doc: ArchitectureDocument, timestamp: string): void {
    const filepath = path.join(this.config.outputDir, `architecture-${timestamp}.json`);
    fs.writeFileSync(filepath, JSON.stringify(doc, null, 2));
    console.log(`   ✅ JSON architecture docs saved to: ${filepath}`);
  }

  private saveMarkdownDocumentation(doc: ArchitectureDocument, timestamp: string): void {
    const filepath = path.join(this.config.outputDir, `architecture-${timestamp}.md`);
    let md = `# ${doc.title}\n\n`;
    md += `${doc.description}\n\n`;
    md += `Generated: ${doc.generatedAt.toISOString()}\n\n`;

    md += `## Overview\n\n`;
    md += `- **Total Modules**: ${doc.overview.totalModules}\n`;
    md += `- **Total Exports**: ${doc.overview.totalExports}\n`;
    md += `- **Max Dependency Depth**: ${doc.overview.maxDepth}\n\n`;

    md += `## Module Architecture\n\n`;

    for (const module of doc.modules) {
      md += `### ${module.name}\n\n`;
      md += `${module.description}\n\n`;
      md += `**Path:** \`${module.path}\`\n\n`;

      if (module.publicApi.length > 0) {
        md += `**Public API:**\n`;
        for (const api of module.publicApi) {
          md += `- \`${api.name}\` (${api.type})\n`;
        }
        md += `\n`;
      }

      if (module.dependencies.length > 0) {
        md += `**Dependencies:** ${module.dependencies.map((d) => `\`${d}\``).join(', ')}\n\n`;
      }

      md += `---\n\n`;
    }

    md += `## Dependency Graph\n\n`;
    md += `\`\`\`\n`;
    for (const edge of doc.dependencies.edges) {
      md += `${edge.from} --> ${edge.to}\n`;
    }
    md += `\`\`\`\n\n`;

    fs.writeFileSync(filepath, md);
    console.log(`   ✅ Markdown architecture docs saved to: ${filepath}`);
  }

  private saveHtmlDocumentation(doc: ArchitectureDocument, timestamp: string): void {
    const filepath = path.join(this.config.outputDir, `architecture-${timestamp}.html`);
    let html = `<!DOCTYPE html>
<html>
<head>
  <title>${doc.title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
    h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 40px; }
    h3 { color: #666; }
    .overview { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
    .stat-card { background: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center; }
    .stat-card h3 { margin: 0; color: #666; font-size: 14px; }
    .stat-card .value { font-size: 32px; font-weight: bold; color: #4CAF50; margin: 10px 0; }
    .module { background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #4CAF50; }
    .module h3 { margin-top: 0; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    .dependency { color: #888; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏗️ ${doc.title}</h1>
    <p>${doc.description}</p>
    <p>Generated: ${doc.generatedAt.toISOString()}</p>

    <h2>Overview</h2>
    <div class="overview">
      <div class="stat-card">
        <h3>Total Modules</h3>
        <div class="value">${doc.overview.totalModules}</div>
      </div>
      <div class="stat-card">
        <h3>Total Exports</h3>
        <div class="value">${doc.overview.totalExports}</div>
      </div>
      <div class="stat-card">
        <h3>Max Depth</h3>
        <div class="value">${doc.overview.maxDepth}</div>
      </div>
    </div>

    <h2>Modules</h2>`;

    for (const module of doc.modules) {
      html += `
    <div class="module">
      <h3>${module.name}</h3>
      <p>${module.description}</p>
      <p class="dependency"><strong>Path:</strong> <code>${module.path}</code></p>`;

      if (module.publicApi.length > 0) {
        html += `<p><strong>Public API:</strong></p><ul>`;
        for (const api of module.publicApi) {
          html += `<li><code>${api.name}</code> (${api.type})</li>`;
        }
        html += `</ul>`;
      }

      if (module.dependencies.length > 0) {
        html += `<p class="dependency"><strong>Dependencies:</strong> ${module.dependencies.map((d) => `<code>${d}</code>`).join(', ')}</p>`;
      }

      html += `</div>`;
    }

    html += `
  </div>
</body>
</html>`;

    fs.writeFileSync(filepath, html);
    console.log(`   ✅ HTML architecture docs saved to: ${filepath}`);
  }

  public getModules(): Map<string, ModuleInfo> {
    return this.modules;
  }
}

export default ArchitectureDocumentationGenerator;
