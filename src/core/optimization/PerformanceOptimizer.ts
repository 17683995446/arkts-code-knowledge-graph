import { EventEmitter } from 'events';
import * as http from 'http';
import * as https from 'https';
import * as dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

export interface PerformanceOptimizerConfig {
  enableCaching: boolean;
  cacheSize: number;
  cacheTTL: number;
  enableCompression: boolean;
  enableMinification: boolean;
  enableTreeShaking: boolean;
  bundleOptimization: boolean;
  lazyLoading: boolean;
}

export interface CacheEntry {
  key: string;
  value: any;
  timestamp: number;
  ttl: number;
  hits: number;
}

export interface OptimizationResult {
  originalSize: number;
  optimizedSize: number;
  reduction: number;
  reductionPercent: number;
  duration: number;
}

export interface BundleAnalysis {
  totalSize: number;
  moduleCount: number;
  dependencies: Map<string, Set<string>>;
  duplicateModules: Array<{ name: string; size: number; count: number }>;
  suggestions: string[];
}

export class PerformanceOptimizer extends EventEmitter {
  private config: PerformanceOptimizerConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private optimizationStats: Map<string, OptimizationResult> = new Map();
  private memoryUsage: Array<{ timestamp: number; usage: number }> = [];

  constructor(config: Partial<PerformanceOptimizerConfig> = {}) {
    super();

    this.config = {
      enableCaching: true,
      cacheSize: 1000,
      cacheTTL: 3600000,
      enableCompression: true,
      enableMinification: true,
      enableTreeShaking: true,
      bundleOptimization: true,
      lazyLoading: true,
      ...config,
    };

    this.startMemoryMonitoring();
  }

  private startMemoryMonitoring(): void {
    setInterval(() => {
      const usage = process.memoryUsage();
      this.memoryUsage.push({
        timestamp: Date.now(),
        usage: usage.heapUsed / 1024 / 1024,
      });

      if (this.memoryUsage.length > 100) {
        this.memoryUsage.shift();
      }
    }, 5000);
  }

  public async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    if (!this.config.enableCaching) {
      return fetcher();
    }

    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < (ttl || this.config.cacheTTL)) {
      cached.hits++;
      this.emit('cache:hit', { key, hits: cached.hits });
      return cached.value as T;
    }

    const value = await fetcher();

    if (this.cache.size >= this.config.cacheSize) {
      this.evictOldestEntry();
    }

    this.cache.set(key, {
      key,
      value,
      timestamp: Date.now(),
      ttl: ttl || this.config.cacheTTL,
      hits: 0,
    });

    this.emit('cache:miss', { key });
    return value;
  }

  private evictOldestEntry(): void {
    let oldest: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldest = key;
      }
    }

    if (oldest) {
      this.cache.delete(oldest);
      this.emit('cache:evict', { key: oldest });
    }
  }

  public invalidateCache(key: string): void {
    this.cache.delete(key);
    this.emit('cache:invalidate', { key });
  }

  public clearCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.emit('cache:clear', { size });
  }

  public minifyCode(code: string, language: 'javascript' | 'css' | 'html' = 'javascript'): string {
    const start = Date.now();

    let minified = code;

    if (language === 'javascript') {
      minified = this.minifyJavaScript(minified);
    } else if (language === 'css') {
      minified = this.minifyCSS(minified);
    } else if (language === 'html') {
      minified = this.minifyHTML(minified);
    }

    const result: OptimizationResult = {
      originalSize: code.length,
      optimizedSize: minified.length,
      reduction: code.length - minified.length,
      reductionPercent: ((code.length - minified.length) / code.length) * 100,
      duration: Date.now() - start,
    };

    this.optimizationStats.set(`minify:${language}`, result);
    this.emit('optimization:complete', { type: 'minify', language, result });

    return minified;
  }

  private minifyJavaScript(code: string): string {
    let minified = code;

    minified = minified.replace(/\/\*[\s\S]*?\*\//g, '');
    minified = minified.replace(/\/\/.*$/gm, '');
    minified = minified.replace(/\s+/g, ' ');
    minified = minified.replace(/\s*([{}\[\];,=+\-*/<>!&|^~?:])\s*/g, '$1');
    minified = minified.replace(/;\}/g, '}');
    minified = minified.replace(/\{\s*/g, '{');
    minified = minified.replace(/\s*\}/g, '}');
    minified = minified.trim();

    return minified;
  }

  private minifyCSS(css: string): string {
    let minified = css;

    minified = minified.replace(/\/\*[\s\S]*?\*\//g, '');
    minified = minified.replace(/\s+/g, ' ');
    minified = minified.replace(/\s*([{}:;,])\s*/g, '$1');
    minified = minified.replace(/;\}/g, '}');
    minified = minified.replace(/\s*([>])\s*/g, '$1');
    minified = minified.replace(/:\s*/g, ':');
    minified = minified.trim();

    return minified;
  }

  private minifyHTML(html: string): string {
    let minified = html;

    minified = minified.replace(/\s+/g, ' ');
    minified = minified.replace(/>\s+</g, '><');
    minified = minified.replace(/\s+\/>/g, '/>');
    minified = minified.replace(/<!--[\s\S]*?-->/g, '');
    minified = minified.trim();

    return minified;
  }

  public async analyzeBundle(
    modules: Array<{ name: string; code: string; dependencies: string[] }>
  ): Promise<BundleAnalysis> {
    const dependencies = new Map<string, Set<string>>();
    const moduleSizes = new Map<string, number>();
    const moduleNames = new Map<string, number>();

    for (const mod of modules) {
      moduleSizes.set(mod.name, mod.code.length);
      moduleNames.set(mod.name, (moduleNames.get(mod.name) || 0) + 1);

      if (!dependencies.has(mod.name)) {
        dependencies.set(mod.name, new Set());
      }

      for (const dep of mod.dependencies) {
        dependencies.get(mod.name)!.add(dep);
      }
    }

    const duplicateModules: BundleAnalysis['duplicateModules'] = [];
    for (const [name, count] of moduleNames) {
      if (count > 1) {
        duplicateModules.push({
          name,
          size: moduleSizes.get(name) || 0,
          count,
        });
      }
    }

    const suggestions: string[] = [];

    if (duplicateModules.length > 0) {
      suggestions.push('Consider deduplicating common modules using webpack or rollup plugins');
    }

    const largeModules = Array.from(moduleSizes.entries())
      .filter(([_, size]) => size > 50000)
      .sort((a, b) => b[1] - a[1]);

    if (largeModules.length > 0) {
      suggestions.push(`Consider code-splitting ${largeModules.length} large modules (>50KB)`);
    }

    const totalSize = modules.reduce((sum, m) => sum + m.code.length, 0);

    return {
      totalSize,
      moduleCount: modules.length,
      dependencies,
      duplicateModules,
      suggestions,
    };
  }

  public async treeShake(code: string, exports: string[]): Promise<string> {
    const usedExports = new Set<string>();

    for (const exp of exports) {
      if (new RegExp(`\\b${exp}\\b`).test(code)) {
        usedExports.add(exp);
      }
    }

    let treeShaken = code;

    treeShaken = treeShaken.replace(
      new RegExp(`export\\s+\\{([^}]+)\\}\\s+from\\s+['"][^'"]+['"]`, 'g'),
      (match, exportsStr) => {
        const keptExports = exportsStr
          .split(',')
          .map((e: string) => e.trim())
          .filter((e: string) => usedExports.has(e));

        if (keptExports.length === 0) {
          return '';
        }

        return `export { ${keptExports.join(', ')} }`;
      }
    );

    this.emit('optimization:complete', {
      type: 'treeShake',
      originalExports: exports.length,
      keptExports: usedExports.size,
      reduction: ((exports.length - usedExports.size) / exports.length) * 100,
    });

    return treeShaken;
  }

  public compress(text: string, algorithm: 'gzip' | 'deflate' | 'br' = 'gzip'): Buffer {
    const zlib = require('zlib');
    let compressed: Buffer;

    switch (algorithm) {
      case 'gzip':
        compressed = zlib.gzipSync(Buffer.from(text));
        break;
      case 'deflate':
        compressed = zlib.deflateSync(Buffer.from(text));
        break;
      case 'br':
        compressed = zlib.brotliCompressSync(Buffer.from(text));
        break;
      default:
        compressed = zlib.gzipSync(Buffer.from(text));
    }

    this.emit('compression:complete', {
      algorithm,
      originalSize: text.length,
      compressedSize: compressed.length,
      ratio: ((text.length - compressed.length) / text.length) * 100,
    });

    return compressed;
  }

  public decompress(buffer: Buffer, algorithm: 'gzip' | 'deflate' | 'br' = 'gzip'): Buffer {
    const zlib = require('zlib');
    let decompressed: Buffer;

    switch (algorithm) {
      case 'gzip':
        decompressed = zlib.gunzipSync(buffer);
        break;
      case 'deflate':
        decompressed = zlib.inflateSync(buffer);
        break;
      case 'br':
        decompressed = zlib.brotliDecompressSync(buffer);
        break;
      default:
        decompressed = zlib.gunzipSync(buffer);
    }

    return decompressed;
  }

  public debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(() => {
        func(...args);
      }, wait);
    };
  }

  public throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  }

  public memoize<T extends (...args: any[]) => any>(
    func: T,
    resolver?: (...args: Parameters<T>) => string
  ): T {
    const cache = new Map<string, ReturnType<T>>();

    return ((...args: Parameters<T>) => {
      const key = resolver
        ? resolver(...args)
        : JSON.stringify(args);

      if (cache.has(key)) {
        return cache.get(key)!;
      }

      const result = func(...args);
      cache.set(key, result as ReturnType<T>);

      return result;
    }) as T;
  }

  public async preloadResources(urls: string[]): Promise<void> {
    const promises = urls.map((url) =>
      new Promise<void>((resolve) => {
        const req = url.startsWith('https') ? https : http;

        req.get(url, () => {
          this.emit('resource:preload', { url });
          resolve();
        }).on('error', () => {
          resolve();
        });
      })
    );

    await Promise.all(promises);
  }

  public async dnsPrefetch(hostnames: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    const promises = hostnames.map(
      (hostname) =>
        new Promise<void>((resolve) => {
          dnsLookup(hostname, (err, address) => {
            if (!err && address) {
              results.set(hostname, address);
            }
            resolve();
          });
        })
    );

    await Promise.all(promises);

    return results;
  }

  public getOptimizationStats(): Map<string, OptimizationResult> {
    return new Map(this.optimizationStats);
  }

  public getCacheStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    let hits = 0;
    let misses = 0;

    for (const entry of this.cache.values()) {
      if (entry.hits > 0) {
        hits += entry.hits;
      } else {
        misses++;
      }
    }

    const total = hits + misses;

    return {
      size: this.cache.size,
      hits,
      misses,
      hitRate: total > 0 ? (hits / total) * 100 : 0,
    };
  }

  public getMemoryStats(): {
    current: number;
    average: number;
    peak: number;
    history: Array<{ timestamp: number; usage: number }>;
  } {
    const current = process.memoryUsage().heapUsed / 1024 / 1024;
    const avg = this.memoryUsage.length > 0
      ? this.memoryUsage.reduce((sum, m) => sum + m.usage, 0) / this.memoryUsage.length
      : current;
    const peak = this.memoryUsage.length > 0
      ? Math.max(...this.memoryUsage.map((m) => m.usage))
      : current;

    return {
      current,
      average: avg,
      peak,
      history: [...this.memoryUsage],
    };
  }

  public generateReport(): {
    cache: ReturnType<typeof this.getCacheStats>;
    memory: ReturnType<typeof this.getMemoryStats>;
    optimizations: Array<{ type: string; result: OptimizationResult }>;
  } {
    return {
      cache: this.getCacheStats(),
      memory: this.getMemoryStats(),
      optimizations: Array.from(this.optimizationStats.entries()).map(([type, result]) => ({
        type,
        result,
      })),
    };
  }
}

export default PerformanceOptimizer;
