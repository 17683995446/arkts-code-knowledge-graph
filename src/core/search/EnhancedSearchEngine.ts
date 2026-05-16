import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { LocalIndex } from 'vectra';
import { ensureDirectoryExists } from '../../shared/utilities.js';

const applicationLogger = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
};

export type VectorDatabaseType = 'vectra' | 'milvus' | 'pinecone' | 'weaviate' | 'qdrant';

export interface VectorStoreConfig {
  type: VectorDatabaseType;
  path?: string;
  apiKey?: string;
  host?: string;
  port?: number;
  collectionName?: string;
}

export interface SearchQuery {
  query: string;
  filters?: SearchFilter[];
  sortBy?: 'relevance' | 'recency' | 'popularity';
  limit?: number;
  threshold?: number;
  includeMetadata?: boolean;
  highlight?: boolean;
}

export interface SearchFilter {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'in' | 'not_in';
  value: any;
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
  highlights?: string[];
  type?: string;
  source?: string;
}

export interface SearchStats {
  totalResults: number;
  queryTime: number;
  indexSize: number;
  avgScore: number;
}

export interface SearchEngineConfig {
  vectorStore: VectorStoreConfig;
  embeddingModel: string;
  vectorDimensions: number;
  similarityThreshold: number;
  maxResults: number;
  enableHybridSearch: boolean;
  enableReranking: boolean;
  enableAutoComplete: boolean;
  cacheTTL: number;
}

export class EnhancedSearchEngine extends EventEmitter {
  private config: SearchEngineConfig;
  private documents: Map<string, SearchDocument> = new Map();
  private vectorIndex?: LocalIndex;
  private isInitialized = false;
  private searchCache: Map<string, CachedSearchResult> = new Map();
  private autoCompleteIndex: AutoCompleteIndex = new AutoCompleteIndex();

  constructor(config: Partial<SearchEngineConfig> = {}) {
    super();
    this.config = {
      vectorStore: { type: 'vectra', path: './.arkts-code-graph/vector', collectionName: 'code-entities' },
      embeddingModel: 'text-embedding-ada-002',
      vectorDimensions: 1536,
      similarityThreshold: 0.7,
      maxResults: 20,
      enableHybridSearch: true,
      enableReranking: true,
      enableAutoComplete: true,
      cacheTTL: 300000,
      ...config,
    };
  }

  public async initialize(): Promise<void> {
    try {
      if (this.config.vectorStore.type === 'vectra') {
        ensureDirectoryExists(this.config.vectorStore.path!);
        this.vectorIndex = new LocalIndex(this.config.vectorStore.path!);
        if (!await this.vectorIndex.isIndexCreated()) {
          await this.vectorIndex.createIndex();
        }
      }
      this.isInitialized = true;
      applicationLogger.info('Enhanced search engine initialized');
      this.emit('initialized');
    } catch (error) {
      applicationLogger.error('Failed to initialize enhanced search engine', error);
      throw error;
    }
  }

  public async addDocument(doc: SearchDocumentInput): Promise<string> {
    const id = doc.id || crypto.randomUUID();
    
    const document: SearchDocument = {
      id,
      content: doc.content,
      metadata: doc.metadata || {},
      type: doc.type || 'document',
      source: doc.source || 'unknown',
      createdAt: doc.createdAt || new Date(),
      updatedAt: new Date(),
    };

    this.documents.set(id, document);

    if (this.vectorIndex) {
      const vector = await this.generateEmbedding(doc.content);
      await this.vectorIndex.insertItem({
        id,
        metadata: {
          type: document.type,
          source: document.source,
          ...document.metadata,
        },
        vector,
      });
    }

    if (this.config.enableAutoComplete) {
      this.autoCompleteIndex.addDocument(id, doc.content);
    }

    this.emit('document:added', { id, type: document.type });
    return id;
  }

  public async addDocuments(docs: SearchDocumentInput[]): Promise<string[]> {
    const ids: string[] = [];
    for (const doc of docs) {
      const id = await this.addDocument(doc);
      ids.push(id);
    }
    return ids;
  }

  public async search(query: SearchQuery): Promise<{ results: SearchResult[]; stats: SearchStats }> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(query);
    
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.result;
    }

    const limit = query.limit || this.config.maxResults;
    const threshold = query.threshold || this.config.similarityThreshold;

    let results: SearchResult[] = [];

    if (this.vectorIndex) {
      const queryVector = await this.generateEmbedding(query.query);
      const vectorResults = await this.vectorIndex.queryItems(queryVector, limit * 3);
      
      results = vectorResults
        .filter(r => r.score >= threshold)
        .map(r => {
          const doc = this.documents.get(r.item.id);
          return {
            id: r.item.id,
            content: doc?.content || '',
            score: r.score,
            metadata: r.item.metadata as Record<string, any>,
            type: doc?.type,
            source: doc?.source,
            highlights: query.highlight ? this.generateHighlights(query.query, doc?.content || '') : undefined,
          };
        });
    }

    if (this.config.enableHybridSearch) {
      const keywordResults = this.keywordSearch(query.query, limit * 2);
      results = this.mergeResults(results, keywordResults);
    }

    if (query.filters && query.filters.length > 0) {
      results = this.applyFilters(results, query.filters);
    }

    if (this.config.enableReranking) {
      results = await this.rerankResults(query.query, results);
    }

    results = this.sortResults(results, query.sortBy || 'relevance');
    results = results.slice(0, limit);

    const stats: SearchStats = {
      totalResults: results.length,
      queryTime: Date.now() - startTime,
      indexSize: this.documents.size,
      avgScore: results.length > 0 
        ? results.reduce((sum, r) => sum + r.score, 0) / results.length 
        : 0,
    };

    this.searchCache.set(cacheKey, {
      result: { results, stats },
      expiresAt: Date.now() + this.config.cacheTTL,
    });

    this.emit('search:completed', { query, results: results.length, stats });
    return { results, stats };
  }

  public async autocomplete(prefix: string, limit: number = 10): Promise<string[]> {
    if (!this.config.enableAutoComplete) {
      return [];
    }
    return this.autoCompleteIndex.search(prefix, limit);
  }

  public async deleteDocument(id: string): Promise<void> {
    this.documents.delete(id);
    
    if (this.vectorIndex) {
      await this.vectorIndex.deleteItem(id);
    }

    this.autoCompleteIndex.removeDocument(id);
    this.clearCache();

    this.emit('document:deleted', { id });
  }

  public async updateDocument(id: string, updates: Partial<SearchDocumentInput>): Promise<void> {
    const existing = this.documents.get(id);
    if (!existing) {
      throw new Error(`Document ${id} not found`);
    }

    const updated: SearchDocument = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date(),
    };

    this.documents.set(id, updated);

    if (this.vectorIndex && updates.content !== undefined) {
      const vector = await this.generateEmbedding(updates.content);
      await this.vectorIndex.deleteItem(id);
      await this.vectorIndex.insertItem({
        id,
        metadata: { type: updated.type, source: updated.source, ...updated.metadata },
        vector,
      });
    }

    if (this.config.enableAutoComplete && updates.content !== undefined) {
      this.autoCompleteIndex.removeDocument(id);
      this.autoCompleteIndex.addDocument(id, updates.content);
    }

    this.clearCache();
    this.emit('document:updated', { id });
  }

  public getStats(): {
    totalDocuments: number;
    indexSize: number;
    cacheSize: number;
  } {
    return {
      totalDocuments: this.documents.size,
      indexSize: this.vectorIndex ? (this.vectorIndex as any)._index?.length || 0 : 0,
      cacheSize: this.searchCache.size,
    };
  }

  public clear(): void {
    this.documents.clear();
    if (this.vectorIndex) {
      this.vectorIndex.deleteIndex();
    }
    this.autoCompleteIndex.clear();
    this.clearCache();
    this.emit('index:cleared');
  }

  public clearCache(): void {
    this.searchCache.clear();
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const hash = crypto.createHash('md5').update(text).digest('hex');
    const seed = parseInt(hash.substring(0, 8), 16);
    const rng = this.seededRandom(seed);

    const vector: number[] = [];
    for (let i = 0; i < this.config.vectorDimensions; i++) {
      vector.push(rng());
    }

    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(v => v / magnitude);
  }

  private seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state / 0x7fffffff;
    };
  }

  private keywordSearch(query: string, limit: number): SearchResult[] {
    const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 1);
    const results: SearchResult[] = [];

    for (const [id, doc] of this.documents) {
      const content = doc.content.toLowerCase();
      let matchCount = 0;
      let totalScore = 0;

      for (const keyword of keywords) {
        const regex = new RegExp(keyword, 'gi');
        const matches = content.match(regex);
        if (matches) {
          matchCount += matches.length;
          totalScore += matches.length * (1 - (content.indexOf(keyword) / content.length));
        }
      }

      if (matchCount > 0) {
        results.push({
          id: doc.id,
          content: doc.content,
          score: totalScore / keywords.length,
          metadata: doc.metadata,
          type: doc.type,
          source: doc.source,
          highlights: this.generateHighlights(query, doc.content),
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private mergeResults(vectorResults: SearchResult[], keywordResults: SearchResult[]): SearchResult[] {
    const merged = new Map<string, SearchResult>();

    for (const result of vectorResults) {
      merged.set(result.id, { ...result, score: result.score * 0.7 });
    }

    for (const result of keywordResults) {
      const existing = merged.get(result.id);
      if (existing) {
        existing.score = existing.score + result.score * 0.3;
      } else {
        merged.set(result.id, { ...result, score: result.score * 0.3 });
      }
    }

    return Array.from(merged.values()).sort((a, b) => b.score - a.score);
  }

  private applyFilters(results: SearchResult[], filters: SearchFilter[]): SearchResult[] {
    return results.filter(result => {
      for (const filter of filters) {
        const fieldValue = result.metadata?.[filter.field] ?? result[filter.field as keyof SearchResult];
        
        if (!this.matchesFilter(fieldValue, filter.operator, filter.value)) {
          return false;
        }
      }
      return true;
    });
  }

  private matchesFilter(value: any, operator: SearchFilter['operator'], filterValue: any): boolean {
    switch (operator) {
      case '=': return value === filterValue;
      case '!=': return value !== filterValue;
      case '>': return value > filterValue;
      case '<': return value < filterValue;
      case '>=': return value >= filterValue;
      case '<=': return value <= filterValue;
      case 'contains': return String(value).includes(String(filterValue));
      case 'in': return Array.isArray(filterValue) && filterValue.includes(value);
      case 'not_in': return Array.isArray(filterValue) && !filterValue.includes(value);
      default: return true;
    }
  }

  private async rerankResults(query: string, results: SearchResult[]): Promise<SearchResult[]> {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    
    return results.map(result => {
      let rerankScore = result.score;
      const content = result.content.toLowerCase();

      for (const term of queryTerms) {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        const matches = content.match(regex);
        
        if (matches) {
          rerankScore += matches.length * 0.05;
          
          const firstPos = content.indexOf(term);
          if (firstPos !== -1) {
            rerankScore += Math.max(0, 0.1 - (firstPos / content.length) * 0.1);
          }
        }
      }

      return { ...result, score: Math.min(1, rerankScore) };
    }).sort((a, b) => b.score - a.score);
  }

  private sortResults(results: SearchResult[], sortBy: 'relevance' | 'recency' | 'popularity'): SearchResult[] {
    switch (sortBy) {
      case 'recency':
        return results.sort((a, b) => {
          const aDate = a.metadata?.updatedAt ? new Date(a.metadata.updatedAt).getTime() : 0;
          const bDate = b.metadata?.updatedAt ? new Date(b.metadata.updatedAt).getTime() : 0;
          return bDate - aDate;
        });
      case 'popularity':
        return results.sort((a, b) => {
          const aCount = a.metadata?.accessCount || 0;
          const bCount = b.metadata?.accessCount || 0;
          return bCount - aCount;
        });
      default:
        return results;
    }
  }

  private generateHighlights(query: string, content: string): string[] {
    const highlights: string[] = [];
    const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2);
    
    if (!content) return highlights;

    for (const keyword of keywords) {
      const regex = new RegExp(`(\\S*${keyword}\\S*)`, 'gi');
      const matches = content.match(regex);
      if (matches) {
        for (const match of matches.slice(0, 2)) {
          const idx = content.indexOf(match);
          const start = Math.max(0, idx - 30);
          const end = Math.min(content.length, idx + match.length + 30);
          const highlight = content.substring(start, end);
          highlights.push((start > 0 ? '...' : '') + highlight + (end < content.length ? '...' : ''));
        }
      }
    }

    return [...new Set(highlights)].slice(0, 3);
  }

  private generateCacheKey(query: SearchQuery): string {
    return JSON.stringify({
      query: query.query,
      filters: query.filters,
      sortBy: query.sortBy,
      limit: query.limit,
    });
  }
}

interface SearchDocument {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  type: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SearchDocumentInput {
  id?: string;
  content: string;
  metadata?: Record<string, any>;
  type?: string;
  source?: string;
  createdAt?: Date;
}

interface CachedSearchResult {
  result: { results: SearchResult[]; stats: SearchStats };
  expiresAt: number;
}

class AutoCompleteIndex {
  private trie: TrieNode = { children: {}, isEnd: false, suggestions: [] };
  private documentTerms: Map<string, Set<string>> = new Map();

  public addDocument(id: string, content: string): void {
    const terms = this.extractTerms(content);
    this.documentTerms.set(id, terms);

    for (const term of terms) {
      this.insert(term);
    }
  }

  public removeDocument(id: string): void {
    const terms = this.documentTerms.get(id);
    if (!terms) return;

    this.documentTerms.delete(id);
  }

  public search(prefix: string, limit: number): string[] {
    const suggestions = this.searchTrie(prefix.toLowerCase());
    return suggestions.slice(0, limit);
  }

  public clear(): void {
    this.trie = { children: {}, isEnd: false, suggestions: [] };
    this.documentTerms.clear();
  }

  private extractTerms(content: string): Set<string> {
    const terms = new Set<string>();
    const words = content.toLowerCase().split(/\W+/);
    
    for (const word of words) {
      if (word.length >= 2) {
        terms.add(word);
      }
    }
    
    return terms;
  }

  private insert(term: string): void {
    let node = this.trie;
    
    for (const char of term) {
      if (!node.children[char]) {
        node.children[char] = { children: {}, isEnd: false, suggestions: [] };
      }
      node = node.children[char];
      
      if (!node.suggestions.includes(term)) {
        node.suggestions.push(term);
        node.suggestions.sort((a, b) => a.length - b.length);
        if (node.suggestions.length > 10) {
          node.suggestions.pop();
        }
      }
    }
    
    node.isEnd = true;
  }

  private searchTrie(prefix: string): string[] {
    let node = this.trie;
    
    for (const char of prefix) {
      if (!node.children[char]) {
        return [];
      }
      node = node.children[char];
    }
    
    return [...node.suggestions];
  }
}

interface TrieNode {
  children: Record<string, TrieNode>;
  isEnd: boolean;
  suggestions: string[];
}

export default EnhancedSearchEngine;