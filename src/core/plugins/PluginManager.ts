import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

// 简单的日志替代
const applicationLogger = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
  debug: (...args: any[]) => console.debug('[DEBUG]', ...args),
};
import { 
  Plugin, 
  PluginMetadata, 
  PluginContext, 
  InstalledPlugin, 
  PluginConfig,
  PluginType,
  PluginMarketplaceEntry,
  PluginSearchResult
} from './types.js';

export class PluginManager extends EventEmitter {
  private pluginsDir: string;
  private installedPlugins: Map<string, InstalledPlugin> = new Map();
  private activePlugins: Map<string, Plugin> = new Map();
  private marketplacePlugins: Map<string, PluginMarketplaceEntry> = new Map();
  private pluginContext: PluginContext;
  private isInitialized: boolean = false;

  constructor(pluginsDir?: string) {
    super();
    this.pluginsDir = pluginsDir || path.join(process.cwd(), '.arkts-code-graph', 'plugins');
    
    this.pluginContext = {
      api: {},
      config: {},
      logger: {
        info: (...args: any[]) => applicationLogger.info('[Plugin]', ...args),
        warn: (...args: any[]) => applicationLogger.warn('[Plugin]', ...args),
        error: (...args: any[]) => applicationLogger.error('[Plugin]', ...args),
        debug: (...args: any[]) => applicationLogger.debug('[Plugin]', ...args),
      }
    };
    
    this.initializeMarketplace();
  }

  private initializeMarketplace(): void {
    const mockPlugins: PluginMarketplaceEntry[] = [
      {
        id: 'arkts-go-parser',
        name: 'Go Language Parser',
        version: '1.0.0',
        type: 'parser',
        description: 'Go language code parser and analyzer',
        author: 'ArkTS Team',
        repository: 'https://github.com/arkts/go-parser',
        keywords: ['go', 'parser', 'golang'],
        compatibility: { engineVersion: '1.0.0' },
        isOfficial: true,
        downloads: 5234,
        stars: 128,
        rating: 4.8,
        publishedAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-02-20'),
      },
      {
        id: 'arkts-csharp-parser',
        name: 'C# Language Parser',
        version: '0.9.0',
        type: 'parser',
        description: 'C# and .NET code analysis and visualization',
        author: 'ArkTS Team',
        repository: 'https://github.com/arkts/csharp-parser',
        keywords: ['csharp', 'dotnet', '.net'],
        compatibility: { engineVersion: '1.0.0' },
        isOfficial: true,
        downloads: 3876,
        stars: 89,
        rating: 4.6,
        publishedAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-02-15'),
      },
      {
        id: 'arkts-security-scanner',
        name: 'Security Scanner',
        version: '1.2.0',
        type: 'security',
        description: 'Advanced security vulnerability detection plugin',
        author: 'Security Team',
        repository: 'https://github.com/security/arkts-scanner',
        keywords: ['security', 'vulnerability', 'scanner'],
        compatibility: { engineVersion: '1.0.0' },
        isOfficial: false,
        downloads: 8921,
        stars: 256,
        rating: 4.9,
        publishedAt: new Date('2023-12-01'),
        updatedAt: new Date('2024-03-01'),
      },
      {
        id: 'arkts-uml-generator',
        name: 'UML Diagram Generator',
        version: '1.1.0',
        type: 'renderer',
        description: 'Auto-generate UML diagrams from your codebase',
        author: 'Community Contributors',
        repository: 'https://github.com/community/arkts-uml',
        keywords: ['uml', 'diagram', 'visualization'],
        compatibility: { engineVersion: '1.0.0' },
        isOfficial: false,
        downloads: 4567,
        stars: 167,
        rating: 4.7,
        publishedAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-02-28'),
      },
      {
        id: 'arkts-ai-assistant',
        name: 'AI Code Assistant',
        version: '0.8.0',
        type: 'custom',
        description: 'AI-powered code suggestions and refactoring',
        author: 'AI Team',
        repository: 'https://github.com/arkts/ai-assistant',
        keywords: ['ai', 'assistant', 'refactor'],
        compatibility: { engineVersion: '1.0.0' },
        isOfficial: true,
        downloads: 12345,
        stars: 389,
        rating: 4.9,
        publishedAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-03-10'),
      },
    ];

    mockPlugins.forEach(plugin => {
      this.marketplacePlugins.set(plugin.id, plugin);
    });
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.ensurePluginsDirectory();
    await this.loadInstalledPlugins();
    this.isInitialized = true;
    applicationLogger.info('PluginManager initialized');
    this.emit('initialized');
  }

  private async ensurePluginsDirectory(): Promise<void> {
    if (!fs.existsSync(this.pluginsDir)) {
      fs.mkdirSync(this.pluginsDir, { recursive: true });
    }
  }

  private async loadInstalledPlugins(): Promise<void> {
    if (!fs.existsSync(this.pluginsDir)) return;

    const files = fs.readdirSync(this.pluginsDir);
    
    for (const file of files) {
      const pluginPath = path.join(this.pluginsDir, file);
      const stat = fs.statSync(pluginPath);
      
      if (stat.isDirectory()) {
        const metadataPath = path.join(pluginPath, 'manifest.json');
        if (fs.existsSync(metadataPath)) {
          try {
            const metadata: PluginMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
            
            const installedPlugin: InstalledPlugin = {
              ...metadata,
              config: { enabled: true },
              isActive: false,
              installedAt: stat.birthtime,
              path: pluginPath,
            };
            
            this.installedPlugins.set(metadata.id, installedPlugin);
          } catch (error) {
            applicationLogger.error(`Failed to load plugin from ${file}`, error);
          }
        }
      }
    }
  }

  public async installPlugin(pluginId: string): Promise<InstalledPlugin> {
    const marketplacePlugin = this.marketplacePlugins.get(pluginId);
    if (!marketplacePlugin) {
      throw new Error(`Plugin ${pluginId} not found in marketplace`);
    }

    const pluginDir = path.join(this.pluginsDir, pluginId);
    fs.mkdirSync(pluginDir, { recursive: true });

    const manifest: PluginMetadata = {
      ...marketplacePlugin,
    };
    
    fs.writeFileSync(
      path.join(pluginDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    const installedPlugin: InstalledPlugin = {
      ...manifest,
      config: { enabled: true },
      isActive: false,
      installedAt: new Date(),
      path: pluginDir,
    };

    this.installedPlugins.set(pluginId, installedPlugin);

    applicationLogger.info(`Plugin ${pluginId} installed`);
    this.emit('plugin:installed', { pluginId });

    return installedPlugin;
  }

  public async uninstallPlugin(pluginId: string): Promise<boolean> {
    if (this.activePlugins.has(pluginId)) {
      await this.deactivatePlugin(pluginId);
    }

    const plugin = this.installedPlugins.get(pluginId);
    if (!plugin) {
      return false;
    }

    if (fs.existsSync(plugin.path)) {
      fs.rmSync(plugin.path, { recursive: true, force: true });
    }

    this.installedPlugins.delete(pluginId);
    applicationLogger.info(`Plugin ${pluginId} uninstalled`);
    this.emit('plugin:uninstalled', { pluginId });

    return true;
  }

  public async activatePlugin(pluginId: string): Promise<void> {
    const installedPlugin = this.installedPlugins.get(pluginId);
    if (!installedPlugin) {
      throw new Error(`Plugin ${pluginId} not installed`);
    }

    if (this.activePlugins.has(pluginId)) {
      return;
    }

    try {
      const plugin = await this.loadPlugin(pluginId);
      
      if (plugin.activate) {
        await plugin.activate(this.pluginContext);
      }

      this.activePlugins.set(pluginId, plugin);
      installedPlugin.isActive = true;
      installedPlugin.config.enabled = true;

      applicationLogger.info(`Plugin ${pluginId} activated`);
      this.emit('plugin:activated', { pluginId });
    } catch (error) {
      applicationLogger.error(`Failed to activate plugin ${pluginId}`, error);
      throw error;
    }
  }

  public async deactivatePlugin(pluginId: string): Promise<void> {
    const plugin = this.activePlugins.get(pluginId);
    if (!plugin) {
      return;
    }

    if (plugin.deactivate) {
      try {
        await plugin.deactivate();
      } catch (error) {
        applicationLogger.error(`Error deactivating plugin ${pluginId}`, error);
      }
    }

    this.activePlugins.delete(pluginId);
    
    const installedPlugin = this.installedPlugins.get(pluginId);
    if (installedPlugin) {
      installedPlugin.isActive = false;
    }

    applicationLogger.info(`Plugin ${pluginId} deactivated`);
    this.emit('plugin:deactivated', { pluginId });
  }

  private async loadPlugin(pluginId: string): Promise<Plugin> {
    const installedPlugin = this.installedPlugins.get(pluginId);
    if (!installedPlugin) {
      throw new Error(`Plugin ${pluginId} not installed`);
    }

    const metadata: PluginMetadata = installedPlugin;
    
    const mockPlugin: Plugin = {
      ...metadata,
      activate: async (ctx: PluginContext) => {
        ctx.logger.info(`Activating ${metadata.name} v${metadata.version}`);
      },
      deactivate: async () => {
        applicationLogger.info(`Deactivating ${metadata.name}`);
      },
    };

    return mockPlugin;
  }

  public getInstalledPlugins(): InstalledPlugin[] {
    return Array.from(this.installedPlugins.values());
  }

  public getActivePlugins(): Plugin[] {
    return Array.from(this.activePlugins.values());
  }

  public getPlugin(pluginId: string): InstalledPlugin | undefined {
    return this.installedPlugins.get(pluginId);
  }

  public updatePluginConfig(pluginId: string, config: Partial<PluginConfig>): void {
    const plugin = this.installedPlugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    plugin.config = { ...plugin.config, ...config };

    if (!plugin.config.enabled && plugin.isActive) {
      this.deactivatePlugin(pluginId);
    } else if (plugin.config.enabled && !plugin.isActive) {
      this.activatePlugin(pluginId);
    }

    this.emit('plugin:config-updated', { pluginId });
  }

  public searchMarketplace(
    query?: string,
    type?: PluginType,
    page: number = 1,
    perPage: number = 10
  ): PluginSearchResult {
    let results = Array.from(this.marketplacePlugins.values());

    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(plugin => 
        plugin.name.toLowerCase().includes(lowerQuery) ||
        plugin.description.toLowerCase().includes(lowerQuery) ||
        plugin.keywords.some(k => k.toLowerCase().includes(lowerQuery))
      );
    }

    if (type) {
      results = results.filter(plugin => plugin.type === type);
    }

    results.sort((a, b) => b.downloads - a.downloads);

    const total = results.length;
    const start = (page - 1) * perPage;
    const paginatedResults = results.slice(start, start + perPage);

    return {
      total,
      results: paginatedResults,
      page,
      perPage,
    };
  }

  public getMarketplacePlugin(pluginId: string): PluginMarketplaceEntry | undefined {
    return this.marketplacePlugins.get(pluginId);
  }

  public listMarketplacePlugins(): PluginMarketplaceEntry[] {
    return Array.from(this.marketplacePlugins.values());
  }

  public getPluginsByType(type: PluginType): Plugin[] {
    return this.getActivePlugins().filter(p => p.type === type);
  }

  public async activateAllEnabledPlugins(): Promise<void> {
    const plugins = this.getInstalledPlugins().filter(p => p.config.enabled);
    for (const plugin of plugins) {
      try {
        await this.activatePlugin(plugin.id);
      } catch (error) {
        applicationLogger.error(`Failed to activate ${plugin.id}`, error);
      }
    }
  }

  public async shutdown(): Promise<void> {
    for (const pluginId of this.activePlugins.keys()) {
      await this.deactivatePlugin(pluginId);
    }
    this.isInitialized = false;
    applicationLogger.info('PluginManager shutdown');
  }
}

export default PluginManager;
