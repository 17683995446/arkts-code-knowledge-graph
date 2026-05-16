import * as fs from 'fs';
import * as path from 'path';
import { PluginMetadata, Plugin, PluginType } from './types.js';

export class PluginSDK {
  private outputDir: string;

  constructor(outputDir: string = './plugins') {
    this.outputDir = outputDir;
  }

  public createPluginScaffold(options: {
    name: string;
    type: PluginType;
    author: string;
    description?: string;
  }): void {
    const pluginId = this.generatePluginId(options.name);
    const pluginDir = path.join(this.outputDir, pluginId);

    if (!fs.existsSync(pluginDir)) {
      fs.mkdirSync(pluginDir, { recursive: true });
    }

    const manifest: PluginMetadata = {
      id: pluginId,
      name: options.name,
      version: '0.1.0',
      type: options.type,
      description: options.description || `A ${options.type} plugin`,
      author: options.author,
      keywords: [options.type],
      compatibility: { engineVersion: '1.0.0' },
    };

    fs.writeFileSync(
      path.join(pluginDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    const indexTs = this.generateIndexFile(options);
    fs.writeFileSync(
      path.join(pluginDir, 'index.ts'),
      indexTs
    );

    const packageJson = this.generatePackageJson(manifest);
    fs.writeFileSync(
      path.join(pluginDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    const readme = this.generateReadme(manifest);
    fs.writeFileSync(
      path.join(pluginDir, 'README.md'),
      readme
    );
  }

  private generatePluginId(name: string): string {
    return name.toLowerCase()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .replace(/^/, 'arkts-');
  }

  private generateIndexFile(options: { type: PluginType }): string {
    const typeImports = this.getTypeSpecificCode(options.type);
    return `import { Plugin, PluginContext } from '@arkts-code-graph/core/plugins';

const plugin: Plugin = {
  id: 'plugin-id',
  name: 'Plugin Name',
  version: '0.1.0',
  type: '${options.type}',
  description: 'Plugin description',
  author: 'Your Name',
  keywords: ['${options.type}'],
  compatibility: { engineVersion: '1.0.0' },
  async activate(context: PluginContext) {
    context.logger.info('Plugin activated!');
    ${typeImports}
  },
  async deactivate() {
    console.log('Plugin deactivated');
  },
};

export default plugin;
`;
  }

  private getTypeSpecificCode(type: PluginType): string {
    switch (type) {
      case 'parser':
        return `// Register custom parser logic
    context.api.registerParser({
      name: 'custom-parser',
      extensions: ['.ext'],
      parse: async (code: string) => {
        // Parse code here
      }
    });`;
      case 'analyzer':
        return `// Register analyzer
    context.api.registerAnalyzer({
      name: 'custom-analyzer',
      analyze: async (graph: any) => {
        // Analyze graph here
      }
    });`;
      case 'renderer':
        return `// Register custom renderer
    context.api.registerRenderer({
      name: 'custom-renderer',
      render: async (data: any) => {
        // Render data here
      }
    });`;
      case 'generator':
        return `// Register code generator
    context.api.registerGenerator({
      name: 'custom-generator',
      generate: async (spec: any) => {
        // Generate code here
      }
    });`;
      case 'search':
        return `// Register search enhancement
    context.api.registerSearchEnhancer({
      name: 'custom-search',
      enhance: async (query: string) => {
        // Enhance search here
      }
    });`;
      case 'security':
        return `// Register security scanner
    context.api.registerSecurityScanner({
      name: 'custom-scanner',
      scan: async (code: string) => {
        // Scan for vulnerabilities here
      }
    });`;
      default:
        return `// Custom plugin logic`;
    }
  }

  private generatePackageJson(manifest: PluginMetadata): any {
    return {
      name: manifest.id,
      version: manifest.version,
      description: manifest.description,
      author: manifest.author,
      main: 'index.js',
      types: 'index.d.ts',
      scripts: {
        'build': 'tsc',
        'dev': 'tsc --watch',
      },
      keywords: manifest.keywords,
      dependencies: {},
      devDependencies: {
        '@types/node': '^18.0.0',
        typescript: '^5.0.0',
      },
      repository: manifest.repository ? {
        type: 'git',
        url: manifest.repository,
      } : undefined,
    };
  }

  private generateReadme(manifest: PluginMetadata): string {
    return `# ${manifest.name}

${manifest.description}

## Installation

\`\`\`bash
npm install ${manifest.id}
\`\`\`

## Usage

Instructions for using the plugin...

## License

MIT
`;
  }

  public validatePlugin(pluginPath: string): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const manifestPath = path.join(pluginPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      errors.push('manifest.json not found');
      return { valid: false, errors, warnings };
    }

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      if (!manifest.id) errors.push('Plugin ID is required');
      if (!manifest.name) errors.push('Plugin name is required');
      if (!manifest.version) errors.push('Plugin version is required');
      if (!manifest.type) errors.push('Plugin type is required');
      if (!manifest.description) warnings.push('Plugin description is recommended');
      if (!manifest.author) errors.push('Author is required');
      if (!manifest.compatibility?.engineVersion) warnings.push('Compatibility information is recommended');

      const indexPath = path.join(pluginPath, 'index.ts');
      if (!fs.existsSync(indexPath)) {
        errors.push('index.ts not found');
      }

      const packageJsonPath = path.join(pluginPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        warnings.push('package.json not found');
      }
    } catch (error) {
      errors.push('Invalid manifest.json');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  public createPackage(pluginPath: string, outputPath?: string): void {
    const validation = this.validatePlugin(pluginPath);
    if (!validation.valid) {
      throw new Error(`Plugin validation failed: ${validation.errors.join(', ')}`);
    }

    const manifestPath = path.join(pluginPath, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    const output = outputPath || `${manifest.id}-${manifest.version}.tgz`;

    console.log(`Packaging ${manifest.name} v${manifest.version}...`);
  }
}

export default PluginSDK;
