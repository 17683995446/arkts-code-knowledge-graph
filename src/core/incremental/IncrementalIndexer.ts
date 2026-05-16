import NodeCache from 'node-cache'

export interface IndexedEntity {
  id: string
  type: string
  name: string
  content: string
  metadata: Record<string, any>
  vector?: number[]
}

export interface SearchResult {
  id: string
  score: number
  entity: IndexedEntity
}

export class IncrementalIndexer {
  private index: Map<string, IndexedEntity> = new Map()
  private cache: NodeCache
  private invertedIndex: Map<string, Set<string>> = new Map()
  private version: number = 0

  constructor(options: { ttl?: number; checkPeriod?: number } = {}) {
    this.cache = new NodeCache({
      stdTTL: options.ttl || 3600,
      checkperiod: options.checkPeriod || 600,
    })
  }

  async indexEntity(entity: IndexedEntity): Promise<void> {
    this.index.set(entity.id, entity)

    this.cache.set(entity.id, entity)

    this.updateInvertedIndex(entity)

    this.version++
  }

  async indexEntities(entities: IndexedEntity[]): Promise<number> {
    let indexed = 0
    for (const entity of entities) {
      await this.indexEntity(entity)
      indexed++
    }
    return indexed
  }

  async updateEntity(id: string, updates: Partial<IndexedEntity>): Promise<boolean> {
    const existing = this.index.get(id)
    if (!existing) {
      return false
    }

    const updated: IndexedEntity = {
      ...existing,
      ...updates,
      id: existing.id,
      type: existing.type,
      name: existing.name,
      content: existing.content,
    }

    this.removeFromInvertedIndex(existing)
    
    this.index.set(id, updated)
    this.cache.set(id, updated)
    this.updateInvertedIndex(updated)

    this.version++
    return true
  }

  async deleteEntity(id: string): Promise<boolean> {
    const entity = this.index.get(id)
    if (!entity) {
      return false
    }

    this.removeFromInvertedIndex(entity)
    this.index.delete(id)
    this.cache.del(id)

    this.version++
    return true
  }

  private updateInvertedIndex(entity: IndexedEntity): void {
    const terms = this.tokenize(entity.content)

    for (const term of terms) {
      if (!this.invertedIndex.has(term)) {
        this.invertedIndex.set(term, new Set())
      }
      this.invertedIndex.get(term)!.add(entity.id)
    }
  }

  private removeFromInvertedIndex(entity: IndexedEntity): void {
    const terms = this.tokenize(entity.content)

    for (const term of terms) {
      const postingList = this.invertedIndex.get(term)
      if (postingList) {
        postingList.delete(entity.id)
        if (postingList.size === 0) {
          this.invertedIndex.delete(term)
        }
      }
    }
  }

  private tokenize(content: string): string[] {
    return content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((term) => term.length > 2)
  }

  async search(query: string, limit: number = 10): Promise<SearchResult[]> {
    const queryTerms = this.tokenize(query)
    
    if (queryTerms.length === 0) {
      return []
    }

    const candidateScores: Map<string, number> = new Map()

    for (const term of queryTerms) {
      const prefixMatches = Array.from(this.invertedIndex.entries())
        .filter(([key]) => key.startsWith(term))
        .flatMap(([, ids]) => Array.from(ids))

      for (const id of prefixMatches) {
        const currentScore = candidateScores.get(id) || 0
        candidateScores.set(id, currentScore + 1)
      }
    }

    const results: SearchResult[] = []
    for (const [id, score] of candidateScores) {
      const entity = this.index.get(id)
      if (entity) {
        results.push({
          id,
          score: score / queryTerms.length,
          entity,
        })
      }
    }

    results.sort((a, b) => b.score - a.score)

    return results.slice(0, limit)
  }

  async searchByType(type: string, limit?: number): Promise<IndexedEntity[]> {
    const entities = Array.from(this.index.values()).filter(
      (entity) => entity.type === type
    )

    return limit ? entities.slice(0, limit) : entities
  }

  async getEntity(id: string): Promise<IndexedEntity | null> {
    const cached = this.cache.get<IndexedEntity>(id)
    if (cached) {
      return cached
    }

    return this.index.get(id) || null
  }

  async getAllEntities(): Promise<IndexedEntity[]> {
    return Array.from(this.index.values())
  }

  async rebuildIndex(entities: IndexedEntity[]): Promise<void> {
    this.index.clear()
    this.invertedIndex.clear()
    this.cache.flushAll()

    for (const entity of entities) {
      await this.indexEntity(entity)
    }
  }

  getStatistics(): {
    entityCount: number
    indexSize: number
    cacheSize: number
    version: number
    averageTermsPerEntity: number
  } {
    let totalTerms = 0
    for (const entity of this.index.values()) {
      totalTerms += this.tokenize(entity.content).length
    }

    return {
      entityCount: this.index.size,
      indexSize: this.invertedIndex.size,
      cacheSize: this.cache.keys().length,
      version: this.version,
      averageTermsPerEntity:
        this.index.size > 0 ? totalTerms / this.index.size : 0,
    }
  }

  exportIndex(): object {
    return {
      version: this.version,
      entities: Array.from(this.index.values()),
      invertedIndex: Array.from(this.invertedIndex.entries()).map(
        ([term, ids]) => ({
          term,
          ids: Array.from(ids),
        })
      ),
    }
  }

  async importIndex(data: any): Promise<void> {
    if (data.entities) {
      for (const entity of data.entities) {
        this.index.set(entity.id, entity)
      }
    }

    if (data.invertedIndex) {
      for (const { term, ids } of data.invertedIndex) {
        this.invertedIndex.set(term, new Set(ids))
      }
    }

    this.version = data.version || 0
  }

  clear(): void {
    this.index.clear()
    this.invertedIndex.clear()
    this.cache.flushAll()
    this.version = 0
  }
}

export default IncrementalIndexer
