import path from 'path'
import { KnowledgeGraphDatabase } from '../core/knowledge-graph'
import { OptimizedProjectCodeParser } from '../core/code-parser'
import { GraphQueryEngine } from '../core/query-engine'
import { SemanticVectorSearch } from '../core/semantic-search'
import { ProjectMetricsAnalyzer } from '../core/code-metrics'
import { SymbolTableManager } from '../core/symbol-table'
import { applicationLogger } from '../infrastructure/logger'
import { ensureDirectoryExists } from '../shared/utilities'
import { ConfigurationSchema, ApplicationConfiguration } from '../shared/types'

export interface OptimizedCodeKnowledgeGraphServiceOptions {
  dataDirectory?: string
  configuration?: ApplicationConfiguration
  useOptimizedParser?: boolean
  maxWorkers?: number
  batchSize?: number
  streamProcessing?: boolean
}

export interface OptimizedProjectAnalysisResult {
  knowledgeGraph: KnowledgeGraphDatabase
  queryEngine: GraphQueryEngine
  metrics: any
  duration: number
  memoryUsed: number
  symbolTableManager: SymbolTableManager
  filesProcessed: number
  entitiesCreated: number
  relationsCreated: number
  throughput: number
}

export class OptimizedCodeKnowledgeGraphService {
  private readonly dataDirectory: string
  private readonly knowledgeGraph: KnowledgeGraphDatabase
  private readonly queryEngine: GraphQueryEngine
  private readonly semanticSearch: SemanticVectorSearch
  private readonly projectParser: OptimizedProjectCodeParser
  private readonly metricsAnalyzer: ProjectMetricsAnalyzer
  private readonly symbolTableManager: SymbolTableManager
  private readonly config: ApplicationConfiguration
  private isInitialized = false

  constructor(options: OptimizedCodeKnowledgeGraphServiceOptions = {}) {
    this.dataDirectory = options.dataDirectory || path.join(process.cwd(), '.arkts-code-graph')
    this.config = ConfigurationSchema.parse(options.configuration)
    this.knowledgeGraph = new KnowledgeGraphDatabase({
      persistToFileSystem: this.config.graph.persistToFileSystem,
    })
    this.queryEngine = new GraphQueryEngine(this.knowledgeGraph)
    this.semanticSearch = new SemanticVectorSearch(
      path.join(this.dataDirectory, 'vector'),
      this.config.vector.searchEnabled,
      'tfidf'
    )
    this.symbolTableManager = new SymbolTableManager()
    this.projectParser = new OptimizedProjectCodeParser(this.config, this.symbolTableManager, {
      maxWorkers: options.maxWorkers,
      batchSize: options.batchSize,
      streamProcessing: options.streamProcessing ?? true,
    })
    this.metricsAnalyzer = new ProjectMetricsAnalyzer()
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      applicationLogger.debug('Service already initialized')
      return
    }
    applicationLogger.info('Initializing Optimized Code Knowledge Graph Service')
    await ensureDirectoryExists(this.dataDirectory)
    await this.semanticSearch.initialize()
    this.isInitialized = true
    applicationLogger.info('Service initialized successfully')
  }

  async analyzeProject(projectRoot: string): Promise<OptimizedProjectAnalysisResult> {
    if (!this.isInitialized) {
      await this.initialize()
    }
    applicationLogger.info(`Starting optimized project analysis: ${projectRoot}`)
    const startTime = Date.now()
    const initialMemory = process.memoryUsage().heapUsed
    let filesProcessed = 0
    const parseResult = await this.projectParser.parseProject(projectRoot, (progress) => {
      filesProcessed = progress.processed
      if (progress.processed % 100 === 0) {
        applicationLogger.info(
          `Parsed ${progress.processed}/${progress.total} files, ` +
          `${progress.entities} entities, ${progress.relations} relations`
        )
      }
    })
    this.knowledgeGraph.clear()
    this.knowledgeGraph.addParsingResult(parseResult)
    await this.semanticSearch.clearIndex()
    await this.semanticSearch.addEntitiesFromGraph(this.knowledgeGraph)
    const metrics = this.metricsAnalyzer.analyzeProject(projectRoot)
    const endTime = Date.now()
    const duration = endTime - startTime
    const finalMemory = process.memoryUsage().heapUsed
    const memoryUsed = (finalMemory - initialMemory) / 1024 / 1024
    const estimatedLines = Math.max(
      parseResult.codeEntities.reduce((sum, e) => {
        return sum + (e.entityData.linesOfCode || 1)
      }, 0),
      parseResult.codeEntities.length * 100
    )
    const throughput = estimatedLines / (duration / 1000)
    applicationLogger.info(
      `Optimized project analysis complete. ` +
      `Duration: ${duration}ms, ` +
      `Memory: ${memoryUsed.toFixed(2)}MB, ` +
      `Throughput: ${throughput.toFixed(0)} lines/sec, ` +
      `Entities: ${parseResult.codeEntities.length}, ` +
      `Relations: ${parseResult.codeRelations.length}`
    )
    return {
      knowledgeGraph: this.knowledgeGraph,
      queryEngine: this.queryEngine,
      metrics,
      duration,
      memoryUsed,
      symbolTableManager: this.symbolTableManager,
      filesProcessed,
      entitiesCreated: parseResult.codeEntities.length,
      relationsCreated: parseResult.codeRelations.length,
      throughput,
    }
  }

  async saveToDisk(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }
    applicationLogger.info('Saving knowledge graph to disk')
    await this.knowledgeGraph.saveToFileSystem(path.join(this.dataDirectory, 'graph.json'))
    applicationLogger.info('Knowledge graph saved')
  }

  async loadFromDisk(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize()
    }
    const graphPath = path.join(this.dataDirectory, 'graph.json')
    try {
      applicationLogger.info('Loading knowledge graph from disk')
      await this.knowledgeGraph.loadFromFileSystem(graphPath)
      await this.semanticSearch.clearIndex()
      await this.semanticSearch.addEntitiesFromGraph(this.knowledgeGraph)
      applicationLogger.info('Knowledge graph loaded')
      return true
    } catch (error) {
      applicationLogger.warn('Failed to load knowledge graph from disk')
      return false
    }
  }

  getQueryEngine(): GraphQueryEngine {
    return this.queryEngine
  }

  getKnowledgeGraph(): KnowledgeGraphDatabase {
    return this.knowledgeGraph
  }

  getSemanticSearch(): SemanticVectorSearch {
    return this.semanticSearch
  }

  getMetricsAnalyzer(): ProjectMetricsAnalyzer {
    return this.metricsAnalyzer
  }

  getSymbolTableManager(): SymbolTableManager {
    return this.symbolTableManager
  }
}
