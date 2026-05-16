import Graphology from 'graphology'
import type { Graph, NodeAttributes, EdgeAttributes } from 'graphology-types'

export interface GraphUpdateResult {
  nodesAdded: number
  nodesUpdated: number
  nodesDeleted: number
  edgesAdded: number
  edgesUpdated: number
  edgesDeleted: number
}

export interface IncrementalUpdate {
  type: 'add' | 'update' | 'delete'
  entityType: 'node' | 'edge'
  data: any
}

export class IncrementalGraphUpdater {
  private graph: Graph
  private updateQueue: IncrementalUpdate[] = []
  private isProcessing: boolean = false
  private maxBatchSize: number = 100
  private version: number = 0

  constructor(graph?: Graph) {
    this.graph = graph || new Graph()
  }

  queueUpdate(update: IncrementalUpdate): void {
    this.updateQueue.push(update)

    if (this.updateQueue.length >= this.maxBatchSize) {
      this.processBatch()
    }
  }

  async processBatch(): Promise<GraphUpdateResult> {
    if (this.isProcessing || this.updateQueue.length === 0) {
      return {
        nodesAdded: 0,
        nodesUpdated: 0,
        nodesDeleted: 0,
        edgesAdded: 0,
        edgesUpdated: 0,
        edgesDeleted: 0,
      }
    }

    this.isProcessing = true
    const result: GraphUpdateResult = {
      nodesAdded: 0,
      nodesUpdated: 0,
      nodesDeleted: 0,
      edgesAdded: 0,
      edgesUpdated: 0,
      edgesDeleted: 0,
    }

    const batch = this.updateQueue.splice(0, this.maxBatchSize)

    for (const update of batch) {
      const updateResult = await this.applyUpdate(update)
      Object.assign(result, updateResult)
    }

    this.version++
    this.isProcessing = false

    return result
  }

  private async applyUpdate(update: IncrementalUpdate): Promise<Partial<GraphUpdateResult>> {
    switch (update.entityType) {
      case 'node':
        return this.applyNodeUpdate(update)
      case 'edge':
        return this.applyEdgeUpdate(update)
      default:
        return {}
    }
  }

  private applyNodeUpdate(update: IncrementalUpdate): Partial<GraphUpdateResult> {
    const { type, data } = update

    switch (type) {
      case 'add':
        if (!this.graph.hasNode(data.id)) {
          this.graph.addNode(data.id, data.attributes || {})
          return { nodesAdded: 1 }
        }
        break

      case 'update':
        if (this.graph.hasNode(data.id)) {
          this.graph.mergeNode(data.id, data.attributes || {})
          return { nodesUpdated: 1 }
        }
        break

      case 'delete':
        if (this.graph.hasNode(data.id)) {
          this.graph.dropNode(data.id)
          return { nodesDeleted: 1 }
        }
        break
    }

    return {}
  }

  private applyEdgeUpdate(update: IncrementalUpdate): Partial<GraphUpdateResult> {
    const { type, data } = update

    switch (type) {
      case 'add':
        if (
          this.graph.hasNode(data.source) &&
          this.graph.hasNode(data.target) &&
          !this.graph.hasEdge(data.source, data.target)
        ) {
          this.graph.addEdge(data.source, data.target, data.attributes || {})
          return { edgesAdded: 1 }
        }
        break

      case 'update':
        if (this.graph.hasEdge(data.source, data.target)) {
          this.graph.mergeEdge(data.source, data.target, data.attributes || {})
          return { edgesUpdated: 1 }
        }
        break

      case 'delete':
        if (this.graph.hasEdge(data.source, data.target)) {
          this.graph.dropEdge(data.source, data.target)
          return { edgesDeleted: 1 }
        }
        break
    }

    return {}
  }

  addNodes(nodes: Array<{ id: string; attributes?: NodeAttributes }>): number {
    let added = 0
    for (const node of nodes) {
      if (!this.graph.hasNode(node.id)) {
        this.graph.addNode(node.id, node.attributes || {})
        added++
      }
    }
    return added
  }

  addEdges(edges: Array<{ source: string; target: string; attributes?: EdgeAttributes }>): number {
    let added = 0
    for (const edge of edges) {
      if (
        this.graph.hasNode(edge.source) &&
        this.graph.hasNode(edge.target) &&
        !this.graph.hasEdge(edge.source, edge.target)
      ) {
        this.graph.addEdge(edge.source, edge.target, edge.attributes || {})
        added++
      }
    }
    return added
  }

  updateNode(nodeId: string, attributes: Partial<NodeAttributes>): boolean {
    if (this.graph.hasNode(nodeId)) {
      this.graph.mergeNode(nodeId, attributes)
      return true
    }
    return false
  }

  deleteNode(nodeId: string): boolean {
    if (this.graph.hasNode(nodeId)) {
      this.graph.dropNode(nodeId)
      return true
    }
    return false
  }

  getGraph(): Graph {
    return this.graph
  }

  getStatistics(): {
    nodeCount: number
    edgeCount: number
    version: number
    queueLength: number
  } {
    return {
      nodeCount: this.graph.order,
      edgeCount: this.graph.size,
      version: this.version,
      queueLength: this.updateQueue.length,
    }
  }

  async rollback(): Promise<void> {
    console.warn('Rollback functionality needs external state management')
  }

  exportState(): object {
    return {
      version: this.version,
      nodeCount: this.graph.order,
      edgeCount: this.graph.size,
      nodes: this.graph.nodes().map((nodeId) => ({
        id: nodeId,
        attributes: this.graph.getNodeAttributes(nodeId),
      })),
      edges: this.graph.edges().map((edgeId) => ({
        id: edgeId,
        source: this.graph.source(edgeId),
        target: this.graph.target(edgeId),
        attributes: this.graph.getEdgeAttributes(edgeId),
      })),
    }
  }

  async importState(state: any): Promise<void> {
    if (state.nodes) {
      for (const node of state.nodes) {
        if (!this.graph.hasNode(node.id)) {
          this.graph.addNode(node.id, node.attributes)
        }
      }
    }

    if (state.edges) {
      for (const edge of state.edges) {
        if (
          this.graph.hasNode(edge.source) &&
          this.graph.hasNode(edge.target) &&
          !this.graph.hasEdge(edge.source, edge.target)
        ) {
          this.graph.addEdge(edge.source, edge.target, edge.attributes)
        }
      }
    }

    this.version = state.version || 0
  }

  clear(): void {
    this.graph.clear()
    this.updateQueue = []
    this.version = 0
  }
}

export default IncrementalGraphUpdater
