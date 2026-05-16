import path from 'path';
import { KnowledgeGraphDatabase } from '../core/knowledge-graph/index.js';
import { ProjectCodeParser } from '../core/code-parser/index.js';
import { GraphQueryEngine } from '../core/query-engine/index.js';
import { SemanticVectorSearch } from '../core/semantic-search/index.js';
import { ProjectMetricsAnalyzer } from '../core/code-metrics/index.js';
import { applicationLogger } from '../infrastructure/logger/index.js';
import { ensureDirectoryExists } from '../shared/utilities.js';
import { ConfigurationSchema, ApplicationConfiguration } from '../shared/types.js';

/** 知识图谱服务初始化选项 */
export interface CodeKnowledgeGraphServiceOptions {
    dataDirectory?: string;
    configuration?: ApplicationConfiguration;
}

/** 项目分析结果 */
export interface ProjectAnalysisResult {
    knowledgeGraph: KnowledgeGraphDatabase;
    queryEngine: GraphQueryEngine;
    metrics: any;
    duration: number;
}

/** ArkTS 代码知识图谱服务 */
export class CodeKnowledgeGraphService {
    private readonly dataDirectory: string;
    private readonly knowledgeGraph: KnowledgeGraphDatabase;
    private readonly queryEngine: GraphQueryEngine;
    private readonly semanticSearch: SemanticVectorSearch;
    private readonly projectParser: ProjectCodeParser;
    private readonly metricsAnalyzer: ProjectMetricsAnalyzer;
    private readonly config: ApplicationConfiguration;
    private isInitialized = false;

    constructor(options: CodeKnowledgeGraphServiceOptions = {}) {
        this.dataDirectory = options.dataDirectory || path.join(process.cwd(), '.arkts-code-graph');
        this.config = ConfigurationSchema.parse(options.configuration);
        this.knowledgeGraph = new KnowledgeGraphDatabase({ persistToFileSystem: this.config.graph.persistToFileSystem });
        this.queryEngine = new GraphQueryEngine(this.knowledgeGraph);
        this.semanticSearch = new SemanticVectorSearch(path.join(this.dataDirectory, 'vector'), this.config.vector.searchEnabled);
        this.projectParser = new ProjectCodeParser(this.config);
        this.metricsAnalyzer = new ProjectMetricsAnalyzer();
    }

    /**
     * 初始化服务
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            applicationLogger.debug('Service already initialized');
            return;
        }
        applicationLogger.info('Initializing Code Knowledge Graph Service');
        await ensureDirectoryExists(this.dataDirectory);
        await this.semanticSearch.initialize();
        this.isInitialized = true;
        applicationLogger.info('Service initialized successfully');
    }

    /**
     * 分析项目并构建知识图谱
     */
    async analyzeProject(projectRoot: string): Promise<ProjectAnalysisResult> {
        if (!this.isInitialized) {
            await this.initialize();
        }
        applicationLogger.info(`Starting project analysis: ${projectRoot}`);
        const startTime = Date.now();
        const parseResult = this.projectParser.parseProject(projectRoot);
        this.knowledgeGraph.clear();
        this.knowledgeGraph.addParsingResult(parseResult);
        await this.semanticSearch.clearIndex();
        await this.semanticSearch.addEntitiesFromGraph(this.knowledgeGraph);
        const metrics = this.metricsAnalyzer.analyzeProject(projectRoot);
        const duration = Date.now() - startTime;
        applicationLogger.info(`Project analysis complete in ${duration}ms`);
        return {
            knowledgeGraph: this.knowledgeGraph,
            queryEngine: this.queryEngine,
            metrics,
            duration
        };
    }

    /**
     * 保存知识图谱到文件
     */
    async saveToDisk(): Promise<void> {
        if (!this.isInitialized) {
            throw new Error('Service not initialized');
        }
        applicationLogger.info('Saving knowledge graph to disk');
        await this.knowledgeGraph.saveToFileSystem(path.join(this.dataDirectory, 'graph.json'));
        applicationLogger.info('Knowledge graph saved');
    }

    /**
     * 从文件加载知识图谱
     */
    async loadFromDisk(): Promise<boolean> {
        if (!this.isInitialized) {
            await this.initialize();
        }
        const graphPath = path.join(this.dataDirectory, 'graph.json');
        try {
            applicationLogger.info('Loading knowledge graph from disk');
            await this.knowledgeGraph.loadFromFileSystem(graphPath);
            await this.semanticSearch.clearIndex();
            await this.semanticSearch.addEntitiesFromGraph(this.knowledgeGraph);
            applicationLogger.info('Knowledge graph loaded');
            return true;
        } catch (error) {
            applicationLogger.warn('Failed to load knowledge graph from disk');
            return false;
        }
    }

    /**
     * 获取查询引擎
     */
    getQueryEngine(): GraphQueryEngine {
        return this.queryEngine;
    }

    /**
     * 获取知识图谱
     */
    getKnowledgeGraph(): KnowledgeGraphDatabase {
        return this.knowledgeGraph;
    }

    /**
     * 获取语义搜索
     */
    getSemanticSearch(): SemanticVectorSearch {
        return this.semanticSearch;
    }

    /**
     * 获取指标分析器
     */
    getMetricsAnalyzer(): ProjectMetricsAnalyzer {
        return this.metricsAnalyzer;
    }
}
