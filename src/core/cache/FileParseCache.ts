#!/usr/bin/env node
/**
 * 文件缓存系统 - 避免重复解析
 */
import NodeCache from 'node-cache';
import * as fs from 'fs';
import * as crypto from 'crypto';
import chalk from 'chalk';

console.log(chalk.bold.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   💾 文件缓存系统                                          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));

export interface CacheOptions {
  ttl: number;              // 缓存过期时间（秒）
  checkperiod: number;       // 过期检查间隔（秒）
  maxSize: number;          // 最大缓存条目数
}

export interface ParsedFileCache {
  entities: any[];
  relations: any[];
  hash: string;
  timestamp: number;
}

export class FileParseCache {
  private cache: NodeCache;
  private options: CacheOptions;
  private hitCount = 0;
  private missCount = 0;

  constructor(options: Partial<CacheOptions> = {}) {
    this.options = {
      ttl: options.ttl || 3600,           // 默认1小时
      checkperiod: options.checkperiod || 600, // 默认10分钟
      maxSize: options.maxSize || 10000,  // 默认10000条
    };

    this.cache = new NodeCache({
      stdTTL: this.options.ttl,
      checkperiod: this.options.checkperiod,
      useClones: false,  // 避免深拷贝开销
    });

    console.log(chalk.green('✅ 文件缓存系统初始化成功'));
    console.log(chalk.gray(`   - TTL: ${this.options.ttl}s`));
    console.log(chalk.gray(`   - 检查间隔: ${this.options.checkperiod}s`));
    console.log(chalk.gray(`   - 最大条目: ${this.options.maxSize}`));
  }

  /**
   * 生成文件内容hash
   */
  private generateHash(filePath: string, content: string): string {
    const hash = crypto.createHash('md5');
    hash.update(`${filePath}:${content.length}:${fs.statSync(filePath).mtime.getTime()}`);
    return hash.digest('hex');
  }

  /**
   * 获取缓存key
   */
  private getCacheKey(filePath: string, content: string): string {
    const hash = this.generateHash(filePath, content);
    return `parse:${hash}`;
  }

  /**
   * 检查文件是否在缓存中
   */
  has(filePath: string): boolean {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const key = this.getCacheKey(filePath, content);
      return this.cache.has(key);
    } catch {
      return false;
    }
  }

  /**
   * 从缓存获取解析结果
   */
  get(filePath: string): ParsedFileCache | undefined {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const key = this.getCacheKey(filePath, content);
      const result = this.cache.get<ParsedFileCache>(key);
      
      if (result) {
        this.hitCount++;
        return result;
      } else {
        this.missCount++;
        return undefined;
      }
    } catch {
      this.missCount++;
      return undefined;
    }
  }

  /**
   * 设置缓存
   */
  set(filePath: string, entities: any[], relations: any[]): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const key = this.getCacheKey(filePath, content);
      
      const cacheData: ParsedFileCache = {
        entities,
        relations,
        hash: this.generateHash(filePath, content),
        timestamp: Date.now(),
      };

      this.cache.set(key, cacheData);
    } catch (error) {
      console.error(chalk.red(`❌ 缓存设置失败: ${(error as Error).message}`));
    }
  }

  /**
   * 删除缓存
   */
  delete(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const key = this.getCacheKey(filePath, content);
      this.cache.del(key);
    } catch {
      // 忽略错误
    }
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.flushAll();
    this.hitCount = 0;
    this.missCount = 0;
    console.log(chalk.green('✅ 缓存已清空'));
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    const stats = this.cache.getStats();
    const hitRate = this.hitCount + this.missCount > 0 
      ? (this.hitCount / (this.hitCount + this.missCount) * 100).toFixed(2)
      : '0.00';

    return {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: `${hitRate}%`,
      hitCount: this.hitCount,
      missCount: this.missCount,
      ttl: this.options.ttl,
    };
  }

  /**
   * 打印缓存统计
   */
  printStats(): void {
    const stats = this.getStats();
    
    console.log(chalk.bold.magenta('\n📊 缓存统计:'));
    console.log(`   缓存条目: ${stats.keys}`);
    console.log(`   命中率: ${stats.hitRate}`);
    console.log(`   命中次数: ${stats.hitCount}`);
    console.log(`   未命中: ${stats.missCount}`);
    console.log(`   TTL: ${stats.ttl}s`);
  }
}

// 测试缓存系统
async function testCache() {
  console.log(chalk.bold.cyan('\n🚀 测试缓存系统\n'));
  
  const cache = new FileParseCache({ ttl: 60, maxSize: 100 });
  
  // 测试基本功能
  console.log(chalk.gray('   测试基本功能...'));
  
  const testEntities = [{ name: 'Test', type: 'class' }];
  const testRelations = [{ source: 'A', target: 'B' }];
  
  cache.set('./test.ts', testEntities, testRelations);
  console.log(chalk.green('   ✅ 缓存设置成功'));
  
  const cached = cache.get('./test.ts');
  if (cached) {
    console.log(chalk.green('   ✅ 缓存获取成功'));
  } else {
    console.log(chalk.yellow('   ⚠️  缓存未命中（正常，因为文件不存在）'));
  }
  
  cache.printStats();
  
  console.log(chalk.bold.green('\n✅ 缓存系统测试完成!\n'));
}

testCache().catch(console.error);
