import Graphology from 'graphology';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { CodeEntityType, CodeRelationType, CodeEntityData, CodeRelationData, KnowledgeGraphStatistics, CodeParsingResult } from '../../shared/index.js';
import { applicationLogger } from '../../infrastructure/logger/index.js';
import { KnowledgeGraphError } from '../../infrastructure/errors/index.js';
import { ensureDirectoryExists } from '../../shared/utilities.js';
import { events, MessageQueueFactory, MessageQueueConfig } from '../../services/microservices/index.js';

export type ShardingStrategy = 'hash' | 'range' | 'entity-type' | 'custom';

export interface ShardConfig {
  shardId: string;
  host: string;
  port: number;
  status: 'active' | 'standby' | 'failed';
  weight: number;
  nodeCount: number;
  edgeCount: number;
}

export interface DistributedGraphDatabaseOptions {
  dataDirectory?: string;
  persistToFileSystem?: boolean;
  shardingStrategy?: ShardingStrategy;
  numberOfShards?: number;
  replicationFactor?: number;
  enableFaultTolerance?: boolean;
  messageQueueConfig?: MessageQueueConfig;
}

export interface DistributedQueryOptions {
  timeout?: number;
  consistency?: 'strong' | 'eventual';
  parallel?: boolean;
}

export interface ShardInfo {
  shardId: string;
  nodeCount: number;
  edgeCount: number;
  status: 'active' | 'standby' | 'failed';
  load: number;
}

export class DistributedGraphDatabase {
  private shards: Map<string, LocalGraphShard> = new Map();
  private databaseOptions: Required<DistributedGraphDatabaseOptions>;
  private shardingStrategy: ShardingStrategy;
  private replicationFactor: number;
  private faultToleranceEnabled: boolean;
  private eventBus: any;
  private nodeToShardMap: Map<string, string> = new Map();
  private pendingOperations: Map<string, PendingOperation> = new Map();

  constructor(options: DistributedGraphDatabaseOptions = {}) {
    this.databaseOptions = {
      dataDirectory: './.arkts-code-graph',
      persistToFileSystem: true,
      shardingStrategy: 'hash',
      numberOfShards: 4,
      replicationFactor: 2,
      enableFaultTolerance: true,
      messageQueueConfig: {
        type: 'memory',
        queueName: 'graph-events',
        autoCommit: true,
        maxRetries: 3,
        retryDelay: 100,
      },
      ...options,
    };

    this.shardingStrategy = this.databaseOptions.shardingStrategy;
    this.replicationFactor = this.databaseOptions.replicationFactor;
    this.faultToleranceEnabled = this.databaseOptions.enableFaultTolerance;

    if (this.databaseOptions.messageQueueConfig) {
      const queue = MessageQueueFactory.create(this.databaseOptions.messageQueueConfig);
      this.eventBus = {
        publish: async (event: string, payload: unknown) => {
          await queue.produce({
            messageId: crypto.randomUUID(),
            topic: event,
            payload,
            timestamp: Date.now(),
          });
        },
      };
    }

    this.initializeShards();
  }

  private initializeShards(): void {
    for (let i = 0; i < this.databaseOptions.numberOfShards; i++) {
      const shardId = `shard-${i}`;
      const shard = new LocalGraphShard({
        shardId,
        dataDirectory: path.join(this.databaseOptions.dataDirectory, shardId),
        persistToFileSystem: this.databaseOptions.persistToFileSystem,
      });
      this.shards.set(shardId, shard);
    }
    applicationLogger.info(`Initialized ${this.databaseOptions.numberOfShards} graph shards`);
  }

  private getShardForEntity(entityId: string): string {
    switch (this.shardingStrategy) {
      case 'hash':
        const hash = crypto.createHash('md5').update(entityId).digest('hex');
        const index = parseInt(hash.substring(0, 8), 16) % this.databaseOptions.numberOfShards;
        return `shard-${index}`;

      case 'entity-type':
        const typePrefix = entityId.split('-')[0];
        const typeIndex = Object.values(CodeEntityType).indexOf(typePrefix as CodeEntityType) % this.databaseOptions.numberOfShards;
        return `shard-${typeIndex >= 0 ? typeIndex : 0}`;

      case 'range':
        const rangeIndex = Math.floor(parseInt(entityId, 36) % this.databaseOptions.numberOfShards);
        return `shard-${rangeIndex}`;

      default:
        return `shard-0`;
    }
  }

  private async replicateToShards(shardIds: string[], operation: () => Promise<void>): Promise<void> {
    const operations = shardIds.map(shardId => {
      const shard = this.shards.get(shardId);
      if (!shard) throw new KnowledgeGraphError(`Shard not found: ${shardId}`);
      return operation();
    });
    await Promise.all(operations);
  }

  async addCodeEntity(entityId: string, entityData: CodeEntityData): Promise<void> {
    try {
      const primaryShardId = this.getShardForEntity(entityId);
      const replicaShardIds = this.getReplicaShards(primaryShardId);

      const shard = this.shards.get(primaryShardId);
      if (!shard) {
        throw new KnowledgeGraphError(`Primary shard not found: ${primaryShardId}`);
      }

      await shard.addCodeEntity(entityId, entityData);
      this.nodeToShardMap.set(entityId, primaryShardId);

      if (this.replicationFactor > 1 && this.faultToleranceEnabled) {
        await this.replicateToShards(replicaShardIds, async () => {
          const replicaShard = this.shards.get(primaryShardId);
          if (replicaShard) {
            await replicaShard.addCodeEntity(entityId, entityData);
          }
        });
      }

      this.eventBus?.publish(events.GRAPH_UPDATED, {
        operation: 'addEntity',
        entityId,
        entityData,
        timestamp: Date.now(),
      });

      applicationLogger.debug(`Added code entity to shard ${primaryShardId}: ${entityId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new KnowledgeGraphError(`Failed to add code entity: ${errorMessage}`, {
        cause: error,
        metadata: { entityId, entityData },
      });
    }
  }

  private getReplicaShards(primaryShardId: string): string[] {
    const replicas: string[] = [];
    const shardNum = parseInt(primaryShardId.split('-')[1]);
    for (let i = 1; i < this.replicationFactor; i++) {
      const replicaNum = (shardNum + i) % this.databaseOptions.numberOfShards;
      replicas.push(`shard-${replicaNum}`);
    }
    return replicas;
  }

  async addCodeRelation(relationId: string, sourceEntityId: string, targetEntityId: string, relationData: CodeRelationData): Promise<void> {
    try {
      const sourceShardId = this.nodeToShardMap.get(sourceEntityId) || this.getShardForEntity(sourceEntityId);
      const targetShardId = this.nodeToShardMap.get(targetEntityId) || this.getShardForEntity(targetEntityId);

      const sourceShard = this.shards.get(sourceShardId);
      if (!sourceShard) {
        throw new KnowledgeGraphError(`Source shard not found: ${sourceShardId}`);
      }

      if (!sourceShard.hasEntity(sourceEntityId)) {
        await sourceShard.addCodeEntity(sourceEntityId, {
          type: CodeEntityType.UNKNOWN,
          entityName: sourceEntityId,
        } as unknown as CodeEntityData);
      }

      if (!sourceShard.hasEntity(targetEntityId)) {
        await sourceShard.addCodeEntity(targetEntityId, {
          type: CodeEntityType.UNKNOWN,
          entityName: targetEntityId,
        } as unknown as CodeEntityData);
      }

      await sourceShard.addCodeRelation(relationId, sourceEntityId, targetEntityId, relationData);

      if (sourceShardId !== targetShardId) {
        const targetShard = this.shards.get(targetShardId);
        if (targetShard) {
          await targetShard.addCodeRelation(relationId, sourceEntityId, targetEntityId, relationData);
        }
      }

      this.eventBus?.publish(events.GRAPH_UPDATED, {
        operation: 'addRelation',
        relationId,
        sourceEntityId,
        targetEntityId,
        relationData,
        timestamp: Date.now(),
      });

      applicationLogger.debug(`Added code relation: ${relationId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new KnowledgeGraphError(`Failed to add code relation: ${errorMessage}`, {
        cause: error,
        metadata: { relationId, sourceEntityId, targetEntityId, relationData },
      });
    }
  }

  async getCodeEntity(entityId: string): Promise<CodeEntityData | null> {
    const shardId = this.nodeToShardMap.get(entityId) || this.getShardForEntity(entityId);
    const shard = this.shards.get(shardId);

    if (!shard) {
      if (this.faultToleranceEnabled) {
        return this.tryGetFromReplicas(entityId);
      }
      return null;
    }

    return shard.getCodeEntity(entityId);
  }

  private async tryGetFromReplicas(entityId: string): Promise<CodeEntityData | null> {
    const primaryShardId = this.getShardForEntity(entityId);
    const replicaShardIds = this.getReplicaShards(primaryShardId);

    for (const replicaId of replicaShardIds) {
      const replicaShard = this.shards.get(replicaId);
      if (replicaShard) {
        const entity = await replicaShard.getCodeEntity(entityId);
        if (entity) return entity;
      }
    }

    return null;
  }

  async getCodeRelation(relationId: string): Promise<{ sourceEntityId: string; targetEntityId: string; relationData: CodeRelationData } | null> {
    for (const shard of this.shards.values()) {
      const relation = await shard.getCodeRelation(relationId);
      if (relation) return relation;
    }
    return null;
  }

  async getCodeEntitiesByType(entityType: CodeEntityType): Promise<Array<{ entityId: string; entityData: CodeEntityData }>> {
    const results: Array<{ entityId: string; entityData: CodeEntityData }> = [];

    for (const shard of this.shards.values()) {
      const entities = await shard.getCodeEntitiesByType(entityType);
      results.push(...entities);
    }

    return results;
  }

  async getOutgoingRelations(entityId: string): Promise<Array<{ relationId: string; targetEntityId: string; relationData: CodeRelationData }>> {
    const shardId = this.nodeToShardMap.get(entityId) || this.getShardForEntity(entityId);
    const shard = this.shards.get(shardId);

    if (!shard) {
      return [];
    }

    return shard.getOutgoingRelations(entityId);
  }

  async getIncomingRelations(entityId: string): Promise<Array<{ relationId: string; sourceEntityId: string; relationData: CodeRelationData }>> {
    const results: Array<{ relationId: string; sourceEntityId: string; relationData: CodeRelationData }> = [];

    for (const shard of this.shards.values()) {
      const relations = await shard.getIncomingRelations(entityId);
      results.push(...relations);
    }

    return results;
  }

  async searchCodeEntitiesByName(name: string, entityType?: CodeEntityType): Promise<Array<{ entityId: string; entityData: CodeEntityData }>> {
    const results: Array<{ entityId: string; entityData: CodeEntityData }> = [];

    for (const shard of this.shards.values()) {
      const entities = await shard.searchCodeEntitiesByName(name, entityType);
      results.push(...entities);
    }

    return results;
  }

  async getStatistics(): Promise<KnowledgeGraphStatistics> {
    const stats: KnowledgeGraphStatistics = {
      totalEntityCount: 0,
      totalRelationCount: 0,
      entityCountByType: {} as Record<CodeEntityType, number>,
      relationCountByType: {} as Record<CodeRelationType, number>,
      fileEntityCount: 0,
      functionEntityCount: 0,
      classEntityCount: 0,
    };

    Object.values(CodeEntityType).forEach(type => {
      stats.entityCountByType[type] = 0;
    });
    Object.values(CodeRelationType).forEach(type => {
      stats.relationCountByType[type] = 0;
    });

    for (const shard of this.shards.values()) {
      const shardStats = await shard.getStatistics();
      stats.totalEntityCount += shardStats.totalEntityCount;
      stats.totalRelationCount += shardStats.totalRelationCount;

      Object.entries(shardStats.entityCountByType).forEach(([type, count]) => {
        stats.entityCountByType[type as CodeEntityType] += count;
      });
      Object.entries(shardStats.relationCountByType).forEach(([type, count]) => {
        stats.relationCountByType[type as CodeRelationType] += count;
      });

      stats.fileEntityCount += shardStats.fileEntityCount;
      stats.functionEntityCount += shardStats.functionEntityCount;
      stats.classEntityCount += shardStats.classEntityCount;
    }

    return stats;
  }

  async getShardInfo(): Promise<ShardInfo[]> {
    const info: ShardInfo[] = [];

    for (const [shardId, shard] of this.shards) {
      const stats = await shard.getStatistics();
      info.push({
        shardId,
        nodeCount: stats.totalEntityCount,
        edgeCount: stats.totalRelationCount,
        status: 'active',
        load: stats.totalEntityCount,
      });
    }

    return info;
  }

  async saveToFileSystem(): Promise<void> {
    for (const shard of this.shards.values()) {
      await shard.saveToFileSystem();
    }
    applicationLogger.info('All shards saved to file system');
  }

  async loadFromFileSystem(): Promise<void> {
    for (const shard of this.shards.values()) {
      await shard.loadFromFileSystem();
    }
    this.rebuildNodeToShardMap();
    applicationLogger.info('All shards loaded from file system');
  }

  private rebuildNodeToShardMap(): void {
    this.nodeToShardMap.clear();

    for (const [shardId, shard] of this.shards) {
      const entities = shard.getAllEntityIds();
      for (const entityId of entities) {
        this.nodeToShardMap.set(entityId, shardId);
      }
    }
  }

  async addParsingResult(parsingResult: CodeParsingResult): Promise<void> {
    applicationLogger.info(`Adding ${parsingResult.codeEntities.length} entities and ${parsingResult.codeRelations.length} relations to distributed graph`);

    for (const { entityId, entityData } of parsingResult.codeEntities) {
      await this.addCodeEntity(entityId, entityData);
    }

    for (const { relationId, sourceEntityId, targetEntityId, relationData } of parsingResult.codeRelations) {
      await this.addCodeRelation(relationId, sourceEntityId, targetEntityId, relationData);
    }
  }

  async clear(): Promise<void> {
    for (const shard of this.shards.values()) {
      await shard.clear();
    }
    this.nodeToShardMap.clear();
    applicationLogger.debug('Distributed graph cleared');
  }

  async query(query: string, options: DistributedQueryOptions = {}): Promise<unknown> {
    const { timeout = 30000, parallel = true } = options;
    const startTime = Date.now();

    const results: unknown[] = [];
    const operations: Promise<void>[] = [];

    for (const shard of this.shards.values()) {
      if (parallel) {
        operations.push(this.executeQueryOnShard(shard, query, results));
      } else {
        await this.executeQueryOnShard(shard, query, results);
      }
    }

    await Promise.all(operations);

    if (Date.now() - startTime > timeout) {
      throw new KnowledgeGraphError('Query timeout');
    }

    return results;
  }

  private async executeQueryOnShard(shard: LocalGraphShard, query: string, results: unknown[]): Promise<void> {
    try {
      const result = await shard.query(query);
      if (result) {
        results.push(result);
      }
    } catch {
      // Ignore shard query errors for fault tolerance
    }
  }

  async failoverShard(shardId: string): Promise<void> {
    const shard = this.shards.get(shardId);
    if (!shard) {
      throw new KnowledgeGraphError(`Shard not found: ${shardId}`);
    }

    const replicaShardIds = this.getReplicaShards(shardId);
    for (const replicaId of replicaShardIds) {
      const replicaShard = this.shards.get(replicaId);
      if (replicaShard) {
        await this.promoteReplica(replicaId, shardId);
        break;
      }
    }
  }

  private async promoteReplica(replicaId: string, originalId: string): Promise<void> {
    const replicaShard = this.shards.get(replicaId);
    if (!replicaShard) return;

    const newShard = new LocalGraphShard({
      shardId: originalId,
      dataDirectory: path.join(this.databaseOptions.dataDirectory, originalId),
      persistToFileSystem: this.databaseOptions.persistToFileSystem,
    });

    const entities = await replicaShard.getAllEntities();
    for (const { entityId, entityData } of entities) {
      await newShard.addCodeEntity(entityId, entityData);
    }

    const relations = await replicaShard.getAllRelations();
    for (const { relationId, sourceEntityId, targetEntityId, relationData } of relations) {
      await newShard.addCodeRelation(relationId, sourceEntityId, targetEntityId, relationData);
    }

    this.shards.set(originalId, newShard);
    applicationLogger.info(`Promoted replica ${replicaId} to ${originalId}`);
  }
}

interface LocalGraphShardOptions {
  shardId: string;
  dataDirectory: string;
  persistToFileSystem: boolean;
}

interface PendingOperation {
  type: 'addEntity' | 'addRelation';
  data: unknown;
  timestamp: number;
  retries: number;
}

class LocalGraphShard {
  private graph: Graphology.MultiDirectedGraph;
  private options: LocalGraphShardOptions;
  private entityTypeIndex: Map<CodeEntityType, Set<string>> = new Map();

  constructor(options: LocalGraphShardOptions) {
    this.options = options;
    this.graph = new Graphology.MultiDirectedGraph();
    this.initializeEntityTypeIndex();
  }

  private initializeEntityTypeIndex(): void {
    Object.values(CodeEntityType).forEach(type => {
      this.entityTypeIndex.set(type, new Set());
    });
  }

  async addCodeEntity(entityId: string, entityData: CodeEntityData): Promise<void> {
    if (this.graph.hasNode(entityId)) {
      this.graph.mergeNodeAttributes(entityId, entityData);
    } else {
      this.graph.addNode(entityId, entityData);
    }
    this.entityTypeIndex.get(entityData.type)?.add(entityId);
  }

  async addCodeRelation(relationId: string, sourceEntityId: string, targetEntityId: string, relationData: CodeRelationData): Promise<void> {
    if (!this.graph.hasNode(sourceEntityId)) {
      this.graph.addNode(sourceEntityId, { type: CodeEntityType.UNKNOWN, entityName: sourceEntityId });
    }
    if (!this.graph.hasNode(targetEntityId)) {
      this.graph.addNode(targetEntityId, { type: CodeEntityType.UNKNOWN, entityName: targetEntityId });
    }

    if (this.graph.hasEdge(relationId)) {
      this.graph.mergeEdgeAttributes(relationId, relationData);
    } else {
      this.graph.addEdgeWithKey(relationId, sourceEntityId, targetEntityId, relationData);
    }
  }

  getCodeEntity(entityId: string): CodeEntityData | null {
    if (!this.graph.hasNode(entityId)) return null;
    return this.graph.getNodeAttributes(entityId);
  }

  getCodeRelation(relationId: string): { sourceEntityId: string; targetEntityId: string; relationData: CodeRelationData } | null {
    if (!this.graph.hasEdge(relationId)) return null;
    return {
      sourceEntityId: this.graph.source(relationId),
      targetEntityId: this.graph.target(relationId),
      relationData: this.graph.getEdgeAttributes(relationId),
    };
  }

  getCodeEntitiesByType(entityType: CodeEntityType): Array<{ entityId: string; entityData: CodeEntityData }> {
    const entityIds = this.entityTypeIndex.get(entityType) || new Set();
    return Array.from(entityIds).map(entityId => ({
      entityId,
      entityData: this.graph.getNodeAttributes(entityId),
    }));
  }

  getOutgoingRelations(entityId: string): Array<{ relationId: string; targetEntityId: string; relationData: CodeRelationData }> {
    const relationIds = this.graph.outEdges(entityId);
    return relationIds.map(relationId => ({
      relationId,
      targetEntityId: this.graph.target(relationId),
      relationData: this.graph.getEdgeAttributes(relationId),
    }));
  }

  getIncomingRelations(entityId: string): Array<{ relationId: string; sourceEntityId: string; relationData: CodeRelationData }> {
    const relationIds = this.graph.inEdges(entityId);
    return relationIds.map(relationId => ({
      relationId,
      sourceEntityId: this.graph.source(relationId),
      relationData: this.graph.getEdgeAttributes(relationId),
    }));
  }

  searchCodeEntitiesByName(name: string, entityType?: CodeEntityType): Array<{ entityId: string; entityData: CodeEntityData }> {
    const results: Array<{ entityId: string; entityData: CodeEntityData }> = [];

    const searchEntity = (entityId: string) => {
      const entityData = this.graph.getNodeAttributes(entityId);
      let entityName = '';
      if ('fileName' in entityData) entityName = entityData.fileName;
      else if ('className' in entityData) entityName = entityData.className;
      else if ('functionName' in entityData) entityName = entityData.functionName;
      else if ('variableName' in entityData) entityName = entityData.variableName;
      else if ('interfaceName' in entityData) entityName = entityData.interfaceName;
      else if ('enumName' in entityData) entityName = entityData.enumName;

      if (entityName === name && (!entityType || entityData.type === entityType)) {
        results.push({ entityId, entityData });
      }
    };

    if (entityType) {
      const entityIds = this.entityTypeIndex.get(entityType) || new Set();
      entityIds.forEach(searchEntity);
    } else {
      this.graph.forEachNode(searchEntity);
    }

    return results;
  }

  getStatistics(): KnowledgeGraphStatistics {
    const entityCountByType: Record<string, number> = {};
    const relationCountByType: Record<string, number> = {};

    Object.values(CodeEntityType).forEach(type => {
      entityCountByType[type] = 0;
    });
    Object.values(CodeRelationType).forEach(type => {
      relationCountByType[type] = 0;
    });

    this.graph.forEachNode((_entityId, entityAttributes) => {
      const type = entityAttributes.type;
      entityCountByType[type] = (entityCountByType[type] || 0) + 1;
    });

    this.graph.forEachEdge((_relationId, relationAttributes) => {
      const type = relationAttributes.type;
      relationCountByType[type] = (relationCountByType[type] || 0) + 1;
    });

    return {
      totalEntityCount: this.graph.order,
      totalRelationCount: this.graph.size,
      entityCountByType,
      relationCountByType,
      fileEntityCount: entityCountByType[CodeEntityType.FILE],
      functionEntityCount: entityCountByType[CodeEntityType.FUNCTION],
      classEntityCount: entityCountByType[CodeEntityType.CLASS],
    };
  }

  async saveToFileSystem(): Promise<void> {
    const savePath = path.join(this.options.dataDirectory, `${this.options.shardId}.json`);
    ensureDirectoryExists(this.options.dataDirectory);
    const graphData = this.graph.export();
    fs.writeFileSync(savePath, JSON.stringify(graphData, null, 2));
  }

  async loadFromFileSystem(): Promise<void> {
    const loadPath = path.join(this.options.dataDirectory, `${this.options.shardId}.json`);
    if (!fs.existsSync(loadPath)) {
      return;
    }
    const graphData = JSON.parse(fs.readFileSync(loadPath, 'utf-8'));
    this.graph = Graphology.MultiDirectedGraph.from(graphData);
    this.rebuildEntityTypeIndex();
  }

  private rebuildEntityTypeIndex(): void {
    this.initializeEntityTypeIndex();
    this.graph.forEachNode((entityId, entityAttributes) => {
      this.entityTypeIndex.get(entityAttributes.type)?.add(entityId);
    });
  }

  getAllEntityIds(): string[] {
    const ids: string[] = [];
    this.graph.forEachNode(entityId => ids.push(entityId));
    return ids;
  }

  async getAllEntities(): Promise<Array<{ entityId: string; entityData: CodeEntityData }>> {
    const entities: Array<{ entityId: string; entityData: CodeEntityData }> = [];
    this.graph.forEachNode((entityId, entityData) => {
      entities.push({ entityId, entityData });
    });
    return entities;
  }

  async getAllRelations(): Promise<Array<{ relationId: string; sourceEntityId: string; targetEntityId: string; relationData: CodeRelationData }>> {
    const relations: Array<{ relationId: string; sourceEntityId: string; targetEntityId: string; relationData: CodeRelationData }> = [];
    this.graph.forEachEdge((relationId, relationData, sourceEntityId, targetEntityId) => {
      relations.push({ relationId, sourceEntityId, targetEntityId, relationData });
    });
    return relations;
  }

  hasEntity(entityId: string): boolean {
    return this.graph.hasNode(entityId);
  }

  async query(query: string): Promise<unknown> {
    return { shardId: this.options.shardId, query };
  }

  async clear(): Promise<void> {
    this.graph.clear();
    this.initializeEntityTypeIndex();
  }
}