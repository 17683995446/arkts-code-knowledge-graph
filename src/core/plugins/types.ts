export type PluginType = 
  | 'parser'           // 代码解析器插件
  | 'analyzer'         // 代码分析插件
  | 'renderer'         // 可视化渲染插件
  | 'generator'        // 代码生成插件
  | 'search'           // 搜索增强插件
  | 'security'         // 安全检查插件
  | 'ci-cd'            // CI/CD集成插件
  | 'custom';          // 自定义插件

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  type: PluginType;
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  keywords: string[];
  compatibility: {
    engineVersion: string;
  };
  dependencies?: Record<string, string>;
  permissions?: string[];
  icon?: string;
}

export interface PluginConfig {
  enabled: boolean;
  settings?: Record<string, any>;
}

export interface PluginContext {
  api: any;
  config: Record<string, any>;
  logger: {
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
    debug: (...args: any[]) => void;
  };
}

export interface PluginLifecycle {
  activate?: (context: PluginContext) => Promise<void>;
  deactivate?: () => Promise<void>;
  update?: (oldConfig: any, newConfig: any) => Promise<void>;
}

export interface Plugin extends PluginMetadata, PluginLifecycle {
  configSchema?: any;
}

export interface InstalledPlugin extends PluginMetadata {
  config: PluginConfig;
  isActive: boolean;
  installedAt: Date;
  lastUpdated?: Date;
  path: string;
}

export interface PluginMarketplaceEntry extends PluginMetadata {
  downloads: number;
  stars: number;
  rating: number;
  publishedAt: Date;
  updatedAt: Date;
  isOfficial: boolean;
}

export interface PluginSearchResult {
  total: number;
  results: PluginMarketplaceEntry[];
  page: number;
  perPage: number;
}
