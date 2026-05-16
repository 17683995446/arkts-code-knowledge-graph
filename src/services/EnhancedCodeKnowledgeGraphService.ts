import path from 'path'
import { KnowledgeGraphDatabase } from '../core/knowledge-graph'
import { EnhancedProjectCodeParser } from '../core/code-parser'
import { GraphQueryEngine } from '../core/query-engine'
import { SemanticVectorSearch } from '../core/semantic-search'
import { ProjectMetricsAnalyzer } from '../core/code-metrics'
import { SymbolTableManager } from '../core/symbol-table'
import { applicationLogger } from '../infrastructure/logger'
import { ensureDirectoryExists } from '../shared/utilities'
import { ConfigurationSchema, ApplicationConfiguration } from '../shared/types'
import { CodeParsingResult } from '../shared'

export interface EnhancedCodeKnowledgeGraphServiceOptions {
  dataDirectory?: string
  configuration?: ApplicationConfiguration
  useSymbolTable?: boolean
}

export interface EnhancedProjectAnalysisResult {
  knowledgeGraph: KnowledgeGraphDatabase
  queryEngine: GraphQueryEngine
  metrics: any
  duration: number
  symbolTableManager: SymbolTableManager
}

export class EnhancedCodeKnowledgeGraphService {
  private readonly dataDirectory: string
  private readonly knowledgeGraph: KnowledgeGraphDatabase
  private readonly queryEngine: GraphQueryEngine
  private readonly semanticSearch: SemanticVectorSearch
  private readonly projectParser: EnhancedProjectCodeParser
  private readonly metricsAnalyzer: ProjectMetricsAnalyzer
  private readonly symbolTableManager: SymbolTableManager
  private readonly config: ApplicationConfiguration
  private isInitialized = false

  constructor(options: EnhancedCodeKnowledgeGraphServiceOptions = {}) {
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
    this.projectParser = new EnhancedProjectCodeParser(this.config, this.symbolTableManager)
    this.metricsAnalyzer = new ProjectMetricsAnalyzer()
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      applicationLogger.debug('Service already initialized')
      return
    }
    applicationLogger.info('Initializing Enhanced Code Knowledge Graph Service')
    await ensureDirectoryExists(this.dataDirectory)
    await this.semanticSearch.initialize()
    this.isInitialized = true
    applicationLogger.info('Service initialized successfully')
  }

  async analyzeProject(projectRoot: string): Promise<EnhancedProjectAnalysisResult> {
    if (!this.isInitialized) {
      await this.initialize()
    }
    applicationLogger.info(`Starting project analysis: ${projectRoot}`)
    const startTime = Date.now()
    const parseResult = this.projectParser.parseProject(projectRoot)
    this.knowledgeGraph.clear()
    this.knowledgeGraph.addParsingResult(parseResult)
    await this.semanticSearch.clearIndex()
    await this.semanticSearch.addEntitiesFromGraph(this.knowledgeGraph)
    const metrics = this.metricsAnalyzer.analyzeProject(projectRoot)
    const duration = Date.now() - startTime
    applicationLogger.info(`Project analysis complete in ${duration}ms`)
    return {
      knowledgeGraph: this.knowledgeGraph,
      queryEngine: this.queryEngine,
      metrics,
      duration,
      symbolTableManager: this.symbolTableManager,
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

  clearCache(): void {
    applicationLogger.info('Clearing service cache (data preserved)')
    this.semanticSearch.clearIndexSync()
    this.symbolTableManager.clearAll()
    applicationLogger.info('Service cache cleared (knowledge graph preserved)')
  }

  resetAll(): void {
    applicationLogger.info('Resetting all service data')
    this.knowledgeGraph.clear()
    this.semanticSearch.clearIndexSync()
    this.symbolTableManager.clearAll()
    applicationLogger.info('Service reset complete')
  }
}
