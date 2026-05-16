import { EventEmitter } from 'events';
import * as crypto from 'crypto';

export interface VectorConfig {
  dimensions: number;
  metric: 'cosine' | 'euclidean' | 'dot';
  indexType: 'flat' | 'hnsw' | 'ivf';
  normalize: boolean;
}

export interface VectorDocument {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  vector?: number[];
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
  highlights?: string[];
}

export interface SemanticSearchConfig {
  embeddingModel: string;
  vectorDimensions: number;
  similarityThreshold: number;
  maxResults: number;
  enableHybrid: boolean;
  enableReranking: boolean;
}

export class SemanticSearchEngine extends EventEmitter {
  private config: SemanticSearchConfig;
  private documents: Map<string, VectorDocument> = new Map();
  private vectors: Map<string, number[]> = new Map();
  private vectorIndex: VectorIndex | null = null;

  constructor(config: Partial<SemanticSearchConfig> = {}) {
    super();
    this.config = {
      embeddingModel: 'text-embedding-ada-002',
      vectorDimensions: 1536,
      similarityThreshold: 0.7,
      maxResults: 10,
      enableHybrid: true,
      enableReranking: true,
      ...config,
    };

    this.vectorIndex = new VectorIndex({
      dimensions: this.config.vectorDimensions,
      metric: 'cosine',
      indexType: 'hnsw',
    });
  }

  public async indexDocument(doc: VectorDocument): Promise<void> {
    const id = doc.id || crypto.randomUUID();

    const document: VectorDocument = {
      id,
      content: doc.content,
      metadata: doc.metadata,
    };

    const vector = await this.generateEmbedding(doc.content);
    document.vector = vector;

    this.documents.set(id, document);
    this.vectors.set(id, vector);
    this.vectorIndex?.add(id, vector);

    this.emit('document:indexed', { id, content: doc.content });
  }

  public async indexDocuments(docs: VectorDocument[]): Promise<void> {
    for (const doc of docs) {
      await this.indexDocument(doc);
    }
  }

  public async search(
    query: string,
    options: {
      limit?: number;
      threshold?: number;
      filters?: Record<string, any>;
    } = {}
  ): Promise<SearchResult[]> {
    const limit = options.limit || this.config.maxResults;
    const threshold = options.threshold || this.config.similarityThreshold;

    const queryVector = await this.generateEmbedding(query);
    const vectorResults = this.vectorIndex?.search(queryVector, limit * 2) || [];

    let results: SearchResult[] = [];

    for (const { id, score } of vectorResults) {
      if (score < threshold) continue;

      const doc = this.documents.get(id);
      if (!doc) continue;

      if (options.filters && !this.matchesFilters(doc, options.filters)) {
        continue;
      }

      const highlights = this.generateHighlights(query, doc.content);

      results.push({
        id: doc.id,
        content: doc.content,
        score,
        metadata: doc.metadata,
        highlights,
      });
    }

    if (this.config.enableHybrid) {
      const keywordResults = this.keywordSearch(query, limit);
      results = this.mergeResults(results, keywordResults);
    }

    if (this.config.enableReranking) {
      results = await this.rerankResults(query, results);
    }

    return results.slice(0, limit);
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
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= magnitude;
    }

    return vector;
  }

  private seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state / 0x7fffffff;
    };
  }

  private keywordSearch(query: string, limit: number): SearchResult[] {
    const keywords = query.toLowerCase().split(/\s+/);
    const results: SearchResult[] = [];

    for (const [id, doc] of this.documents) {
      const content = doc.content.toLowerCase();
      let matchCount = 0;

      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        const score = matchCount / keywords.length;

        results.push({
          id: doc.id,
          content: doc.content,
          score,
          metadata: doc.metadata,
          highlights: this.generateHighlights(query, doc.content),
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private mergeResults(vectorResults: SearchResult[], keywordResults: SearchResult[]): SearchResult[] {
    const merged = new Map<string, SearchResult>();

    for (const result of vectorResults) {
      merged.set(result.id, result);
    }

    for (const result of keywordResults) {
      const existing = merged.get(result.id);
      if (existing) {
        existing.score = (existing.score + result.score) / 2;
      } else {
        merged.set(result.id, result);
      }
    }

    return Array.from(merged.values()).sort((a, b) => b.score - a.score);
  }

  private async rerankResults(query: string, results: SearchResult[]): Promise<SearchResult[]> {
    const queryTerms = query.toLowerCase().split(/\s+/);

    return results.map((result) => {
      const content = result.content.toLowerCase();
      let rerankScore = result.score;

      for (const term of queryTerms) {
        if (content.includes(term)) {
          rerankScore += 0.1;
        }

        const positions = this.findAllPositions(content, term);
        if (positions.length > 0) {
          rerankScore += 0.05 / (positions[0] + 1);
        }
      }

      return { ...result, score: rerankScore };
    }).sort((a, b) => b.score - a.score);
  }

  private findAllPositions(text: string, term: string): number[] {
    const positions: number[] = [];
    let pos = text.indexOf(term);
    while (pos !== -1) {
      positions.push(pos);
      pos = text.indexOf(term, pos + 1);
    }
    return positions;
  }

  private generateHighlights(query: string, content: string): string[] {
    const highlights: string[] = [];
    const keywords = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();

    for (const keyword of keywords) {
      const index = contentLower.indexOf(keyword);
      if (index !== -1) {
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + keyword.length + 50);
        const highlight = content.substring(start, end);
        highlights.push((start > 0 ? '...' : '') + highlight + (end < content.length ? '...' : ''));
      }
    }

    return highlights.slice(0, 3);
  }

  private matchesFilters(doc: VectorDocument, filters: Record<string, any>): boolean {
    if (!doc.metadata) return false;

    for (const [key, value] of Object.entries(filters)) {
      if (doc.metadata[key] !== value) {
        return false;
      }
    }

    return true;
  }

  public async deleteDocument(id: string): Promise<void> {
    this.documents.delete(id);
    this.vectors.delete(id);
    this.vectorIndex?.remove(id);
  }

  public async updateDocument(id: string, doc: Partial<VectorDocument>): Promise<void> {
    const existing = this.documents.get(id);
    if (!existing) {
      throw new Error(`Document ${id} not found`);
    }

    const updated: VectorDocument = {
      ...existing,
      ...doc,
      id,
    };

    if (doc.content && doc.content !== existing.content) {
      const vector = await this.generateEmbedding(doc.content);
      updated.vector = vector;
      this.vectors.set(id, vector);
      this.vectorIndex?.update(id, vector);
    }

    this.documents.set(id, updated);
  }

  public getStats(): {
    totalDocuments: number;
    indexSize: number;
    avgVectorLength: number;
  } {
    let totalLength = 0;
    for (const vector of this.vectors.values()) {
      totalLength += vector.length;
    }

    return {
      totalDocuments: this.documents.size,
      indexSize: this.vectorIndex?.getSize() || 0,
      avgVectorLength: this.vectors.size > 0 ? totalLength / this.vectors.size : 0,
    };
  }

  public clear(): void {
    this.documents.clear();
    this.vectors.clear();
    this.vectorIndex?.clear();
  }
}

class VectorIndex {
  private config: VectorConfig;
  private vectors: Map<string, number[]> = new Map();
  private hnswIndex: Map<string, string[]>[] = [];
  private M = 16;
  private efConstruction = 200;
  private efSearch = 50;

  constructor(config: Partial<VectorConfig> = {}) {
    this.config = {
      dimensions: 1536,
      metric: 'cosine',
      indexType: 'hnsw',
      normalize: true,
      ...config,
    };
  }

  public add(id: string, vector: number[]): void {
    this.vectors.set(id, vector);

    if (this.config.indexType === 'hnsw') {
      this.buildHNSWIndex();
    }
  }

  public remove(id: string): void {
    this.vectors.delete(id);
    this.buildHNSWIndex();
  }

  public update(id: string, vector: number[]): void {
    this.vectors.set(id, vector);
    this.buildHNSWIndex();
  }

  public search(query: number[], limit: number): Array<{ id: string; score: number }> {
    const results: Array<{ id: string; score: number }> = [];

    if (this.config.indexType === 'flat') {
      for (const [id, vector] of this.vectors) {
        const score = this.calculateSimilarity(query, vector);
        results.push({ id, score });
      }
    } else if (this.config.indexType === 'hnsw') {
      const hnswResults = this.searchHNSW(query, limit);
      results.push(...hnswResults);
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  public getSize(): number {
    return this.vectors.size;
  }

  public clear(): void {
    this.vectors.clear();
    this.hnswIndex = [];
  }

  private buildHNSWIndex(): void {
    this.hnswIndex = [];
  }

  private searchHNSW(query: number[], limit: number): Array<{ id: string; score: number }> {
    const results: Array<{ id: string; score: number }> = [];

    for (const [id, vector] of this.vectors) {
      const score = this.calculateSimilarity(query, vector);
      results.push({ id, score });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private calculateSimilarity(a: number[], b: number[]): number {
    if (this.config.metric === 'cosine') {
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;

      for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }

      return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
    } else if (this.config.metric === 'euclidean') {
      let sum = 0;
      for (let i = 0; i < a.length; i++) {
        sum += Math.pow(a[i] - b[i], 2);
      }
      return 1 / (1 + Math.sqrt(sum));
    } else {
      let dotProduct = 0;
      for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
      }
      return dotProduct;
    }
  }
}

export default SemanticSearchEngine;
