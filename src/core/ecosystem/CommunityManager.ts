import { EventEmitter } from 'events';
import * as crypto from 'crypto';

export interface Contributor {
  id: string;
  name: string;
  email: string;
  githubUsername?: string;
  avatarUrl?: string;
  joinedAt: Date;
  contributions: {
    commits: number;
    issues: number;
    prs: number;
    reviews: number;
  };
  badges: string[];
  rank: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
}

export interface PluginMarketplaceItem {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  tags: string[];
  category: 'parser' | 'analyzer' | 'visualizer' | 'integration' | 'utility';
  downloads: number;
  stars: number;
  rating: number;
  license: string;
  publishedAt: Date;
  updatedAt: Date;
  featured: boolean;
  verified: boolean;
  compatibility: {
    engineVersion: string;
  };
}

export interface CommunityEvent {
  id: string;
  type: 'meetup' | 'webinar' | 'hackathon' | 'conference';
  title: string;
  description: string;
  date: Date;
  location: string;
  virtual: boolean;
  link: string;
  organizers: string[];
  attendees: string[];
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
}

export interface Documentation {
  id: string;
  title: string;
  type: 'guide' | 'tutorial' | 'api-reference' | 'example' | 'troubleshooting';
  language: string;
  slug: string;
  content: string;
  author: string;
  lastUpdated: Date;
  views: number;
  helpful: number;
  notHelpful: number;
}

export type Localization = {
  [locale: string]: {
    name: string;
    translation: {
      [key: string]: string;
    };
    contributors: string[];
    coverage: number;
    lastUpdated: Date;
  };
};

export class CommunityManager extends EventEmitter {
  private contributors: Map<string, Contributor> = new Map();
  private marketplaceItems: Map<string, PluginMarketplaceItem> = new Map();
  private events: Map<string, CommunityEvent> = new Map();
  private documentation: Map<string, Documentation> = new Map();
  private localizations: Localization = {};

  constructor() {
    super();
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // 示例贡献者数据
    const sampleContributors: Contributor[] = [
      {
        id: crypto.randomUUID(),
        name: 'Alex Dev',
        email: 'alex@example.com',
        githubUsername: 'alexdev',
        avatarUrl: 'https://github.com/alexdev.png',
        joinedAt: new Date('2022-01-15'),
        contributions: {
          commits: 156,
          issues: 42,
          prs: 31,
          reviews: 87,
        },
        badges: ['bug-smasher', 'documenter', 'core-contributor'],
        rank: 'gold',
      },
      {
        id: crypto.randomUUID(),
        name: 'Sarah Coder',
        email: 'sarah@example.com',
        githubUsername: 'sarahc',
        joinedAt: new Date('2022-03-20'),
        contributions: {
          commits: 89,
          issues: 28,
          prs: 21,
          reviews: 45,
        },
        badges: ['first-pr', 'documenter'],
        rank: 'silver',
      },
    ];

    sampleContributors.forEach(c => this.contributors.set(c.id, c));

    // 示例插件市场数据
    const samplePlugins: PluginMarketplaceItem[] = [
      {
        id: 'go-parser',
        name: 'Go Language Parser',
        description: 'Advanced Go code analysis and visualization',
        author: 'ArkTS Team',
        version: '1.2.0',
        tags: ['go', 'parser', 'analysis'],
        category: 'parser',
        downloads: 5421,
        stars: 128,
        rating: 4.8,
        license: 'MIT',
        publishedAt: new Date('2023-11-15'),
        updatedAt: new Date('2024-02-20'),
        featured: true,
        verified: true,
        compatibility: {
          engineVersion: '>=1.0.0',
        },
      },
      {
        id: 'rust-enhanced',
        name: 'Rust Analyzer Pro',
        description: 'Advanced Rust ownership and borrow checking visualization',
        author: 'Rust Community',
        version: '0.9.5',
        tags: ['rust', 'analysis', 'ownership'],
        category: 'analyzer',
        downloads: 3287,
        stars: 89,
        rating: 4.6,
        license: 'Apache-2.0',
        publishedAt: new Date('2023-12-05'),
        updatedAt: new Date('2024-02-10'),
        featured: false,
        verified: true,
        compatibility: {
          engineVersion: '>=1.0.0',
        },
      },
    ];

    samplePlugins.forEach(p => this.marketplaceItems.set(p.id, p));

    // 示例活动数据
    const sampleEvents: CommunityEvent[] = [
      {
        id: crypto.randomUUID(),
        type: 'webinar',
        title: 'Advanced Code Graph Visualization',
        description: 'Learn advanced visualization techniques for large codebases',
        date: new Date('2024-05-20'),
        location: 'Virtual (Zoom)',
        virtual: true,
        link: 'https://events.example.com/graph-viz',
        organizers: ['Alex Dev'],
        attendees: [],
        status: 'upcoming',
      },
      {
        id: crypto.randomUUID(),
        type: 'hackathon',
        title: 'ArkTS Spring Hackathon 2024',
        description: 'Build amazing plugins and integrations!',
        date: new Date('2024-06-01'),
        location: 'San Francisco',
        virtual: false,
        link: 'https://events.example.com/hack2024',
        organizers: ['ArkTS Team', 'Sarah Coder'],
        attendees: [],
        status: 'upcoming',
      },
    ];

    sampleEvents.forEach(e => this.events.set(e.id, e));

    // 示例文档
    const sampleDocs: Documentation[] = [
      {
        id: crypto.randomUUID(),
        title: 'Getting Started with ArkTS',
        type: 'guide',
        language: 'en',
        slug: 'getting-started',
        content: 'Welcome to ArkTS! This guide will help you get started...',
        author: 'ArkTS Team',
        lastUpdated: new Date('2024-01-15'),
        views: 15420,
        helpful: 428,
        notHelpful: 21,
      },
      {
        id: crypto.randomUUID(),
        title: '创建你的第一个插件',
        type: 'tutorial',
        language: 'zh',
        slug: 'create-first-plugin-zh',
        content: '本教程将指导您创建您的第一个ArkTS插件...',
        author: '社区贡献者',
        lastUpdated: new Date('2024-02-01'),
        views: 3200,
        helpful: 105,
        notHelpful: 5,
      },
    ];

    sampleDocs.forEach(d => this.documentation.set(d.id, d));

    // 示例本地化数据
    this.localizations = {
      'zh-CN': {
        name: '简体中文',
        translation: {
          'welcome': '欢迎',
          'documentation': '文档',
          'plugins': '插件',
          'community': '社区',
        },
        contributors: ['社区贡献者'],
        coverage: 95,
        lastUpdated: new Date('2024-02-28'),
      },
      'ja-JP': {
        name: '日本語',
        translation: {
          'welcome': 'ようこそ',
          'documentation': 'ドキュメント',
        },
        contributors: ['日本語コミュニティ'],
        coverage: 60,
        lastUpdated: new Date('2024-01-20'),
      },
    };
  }

  // 贡献者管理
  public getContributors(): Contributor[] {
    return Array.from(this.contributors.values());
  }

  public getTopContributors(limit: number = 10): Contributor[] {
    return Array.from(this.contributors.values())
      .sort((a, b) => b.contributions.commits - a.contributions.commits)
      .slice(0, limit);
  }

  public getContributor(id: string): Contributor | undefined {
    return this.contributors.get(id);
  }

  // 插件市场
  public getMarketplaceItems(): PluginMarketplaceItem[] {
    return Array.from(this.marketplaceItems.values());
  }

  public searchMarketplace(
    query?: string,
    category?: PluginMarketplaceItem['category'],
    featured?: boolean,
    limit: number = 20
  ): PluginMarketplaceItem[] {
    let items = Array.from(this.marketplaceItems.values());

    if (query) {
      const lowerQuery = query.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(lowerQuery) ||
        item.description.toLowerCase().includes(lowerQuery) ||
        item.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    }

    if (category) {
      items = items.filter(item => item.category === category);
    }

    if (featured) {
      items = items.filter(item => item.featured);
    }

    items.sort((a, b) => b.downloads - a.downloads);

    return items.slice(0, limit);
  }

  public getMarketplaceItem(id: string): PluginMarketplaceItem | undefined {
    return this.marketplaceItems.get(id);
  }

  // 社区活动
  public getEvents(): CommunityEvent[] {
    return Array.from(this.events.values());
  }

  public getUpcomingEvents(): CommunityEvent[] {
    return Array.from(this.events.values())
      .filter(event => event.status === 'upcoming')
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  public getPastEvents(): CommunityEvent[] {
    return Array.from(this.events.values())
      .filter(event => event.status === 'completed')
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  // 文档管理
  public getDocumentation(): Documentation[] {
    return Array.from(this.documentation.values());
  }

  public getDocumentationByType(type: Documentation['type']): Documentation[] {
    return Array.from(this.documentation.values())
      .filter(doc => doc.type === type);
  }

  public searchDocumentation(query: string): Documentation[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.documentation.values())
      .filter(doc =>
        doc.title.toLowerCase().includes(lowerQuery) ||
        doc.content.toLowerCase().includes(lowerQuery)
      )
      .sort((a, b) => b.views - a.views);
  }

  public rateDocumentation(id: string, helpful: boolean): void {
    const doc = this.documentation.get(id);
    if (doc) {
      if (helpful) {
        doc.helpful++;
      } else {
        doc.notHelpful++;
      }
      this.emit('documentation:rated', { id, helpful });
    }
  }

  // 本地化管理
  public getLocalizations(): Localization {
    return this.localizations;
  }

  public getAvailableLocales(): string[] {
    return Object.keys(this.localizations);
  }

  public getTranslation(locale: string): Localization[string] | undefined {
    return this.localizations[locale];
  }

  public updateTranslation(
    locale: string,
    key: string,
    value: string,
    contributor: string
  ): void {
    if (!this.localizations[locale]) {
      this.localizations[locale] = {
        name: locale,
        translation: {},
        contributors: [],
        coverage: 0,
        lastUpdated: new Date(),
      };
    }

    this.localizations[locale].translation[key] = value;
    if (!this.localizations[locale].contributors.includes(contributor)) {
      this.localizations[locale].contributors.push(contributor);
    }
    this.localizations[locale].lastUpdated = new Date();

    this.emit('translation:updated', { locale, key, contributor });
  }

  // 统计信息
  public getCommunityStats(): {
    contributorsCount: number;
    pluginsCount: number;
    eventsCount: number;
    docsCount: number;
    supportedLanguages: number;
    totalDownloads: number;
  } {
    const totalDownloads = Array.from(this.marketplaceItems.values())
      .reduce((sum, item) => sum + item.downloads, 0);

    return {
      contributorsCount: this.contributors.size,
      pluginsCount: this.marketplaceItems.size,
      eventsCount: this.events.size,
      docsCount: this.documentation.size,
      supportedLanguages: Object.keys(this.localizations).length,
      totalDownloads,
    };
  }
}

export default CommunityManager;
