const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface SearchResult {
  id: string
  name: string
  type: 'file' | 'class' | 'function' | 'variable' | 'interface' | 'method' | 'enum'
  path: string
  line?: number
  snippet?: string
  score?: number
  related?: SearchResult[]
}

export interface GraphStats {
  totalNodes: number
  totalLinks: number
  fileCount: number
  classCount: number
  functionCount: number
  [key: string]: number
}

export interface GraphNode {
  id: string
  name: string
  type: string
  size: number
  label: string
}

export interface GraphLink {
  id: string
  source: string
  target: string
  type: string
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
  stats: GraphStats
}

export interface FileNode {
  id: string
  name: string
  type: 'file' | 'folder'
  path?: string
  children?: FileNode[]
}

class ApiService {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  async search(query: string, filter?: string): Promise<SearchResult[]> {
    if (!query.trim()) {
      return []
    }

    try {
      const params = new URLSearchParams({ q: query })
      if (filter && filter !== 'all') {
        params.append('type', filter)
      }

      const response = await fetch(`${this.baseUrl}/api/search?${params}`)

      if (!response.ok) {
        throw new Error('Search request failed')
      }

      return await response.json()
    } catch (error) {
      console.error('Search error:', error)
      return this.mockSearch(query, filter)
    }
  }

  async getStats(): Promise<GraphStats> {
    try {
      const response = await fetch(`${this.baseUrl}/api/stats`)

      if (!response.ok) {
        throw new Error('Stats request failed')
      }

      return await response.json()
    } catch (error) {
      console.error('Stats error:', error)
      return this.getMockStats()
    }
  }

  async getGraph(): Promise<GraphData> {
    try {
      const response = await fetch(`${this.baseUrl}/api/graph`)

      if (!response.ok) {
        throw new Error('Graph request failed')
      }

      return await response.json()
    } catch (error) {
      console.error('Graph error:', error)
      return this.getMockGraph()
    }
  }

  async getFiles(): Promise<FileNode[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/files`)

      if (!response.ok) {
        throw new Error('Files request failed')
      }

      return await response.json()
    } catch (error) {
      console.error('Files error:', error)
      return this.getMockFiles()
    }
  }

  async getEntityDetails(entityId: string): Promise<SearchResult | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/entity/${entityId}`)

      if (!response.ok) {
        throw new Error('Entity details request failed')
      }

      return await response.json()
    } catch (error) {
      console.error('Entity details error:', error)
      return null
    }
  }

  async analyzeProject(projectPath: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: projectPath }),
      })

      if (!response.ok) {
        throw new Error('Analyze request failed')
      }

      return await response.json()
    } catch (error) {
      console.error('Analyze error:', error)
      return null
    }
  }

  private mockSearch(query: string, filter?: string): SearchResult[] {
    const allResults: SearchResult[] = [
      { id: '1', name: 'createApp', type: 'function', path: 'packages/runtime-dom/src/index.ts', snippet: 'export function createApp(rootComponent, rootProps = null) {' },
      { id: '2', name: 'ref', type: 'function', path: 'packages/reactivity/src/ref.ts', snippet: 'export function ref<T>(value: T): Ref<T> {' },
      { id: '3', name: 'reactive', type: 'function', path: 'packages/reactivity/src/reactive.ts', snippet: 'export function reactive<T extends object>(target: T): T {' },
      { id: '4', name: 'computed', type: 'function', path: 'packages/reactivity/src/computed.ts', snippet: 'export function computed<T>(getter: () => T) {' },
      { id: '5', name: 'watch', type: 'function', path: 'packages/reactivity/src/watch.ts', snippet: 'export function watch<T>(source: () => T, callback: WatchCallback<T>) {' },
      { id: '6', name: 'Component', type: 'class', path: 'packages/runtime-core/src/component.ts', snippet: 'export class Component<' },
      { id: '7', name: 'ReactiveEffect', type: 'class', path: 'packages/reactivity/src/effect.ts', snippet: 'export class ReactiveEffect<T = any> {' },
      { id: '8', name: 'App', type: 'class', path: 'packages/runtime-core/src/apiCreateApp.ts', snippet: 'export class App<' },
      { id: '9', name: 'watchEffect', type: 'function', path: 'packages/runtime-core/src/apiWatch.ts', snippet: 'export function watchEffect(effect: WatchEffect) {' },
      { id: '10', name: 'nextTick', type: 'function', path: 'packages/runtime-core/src/scheduler.ts', snippet: 'export function nextTick(fn?: () => void): Promise<void> {' },
    ]

    const queryLower = query.toLowerCase()

    let filtered = allResults.filter(
      (result) =>
        result.name.toLowerCase().includes(queryLower) ||
        result.path.toLowerCase().includes(queryLower) ||
        (result.snippet && result.snippet.toLowerCase().includes(queryLower)),
    )

    if (filter && filter !== 'all') {
      filtered = filtered.filter((result) => {
        switch (filter) {
          case 'files':
            return result.type === 'file'
          case 'functions':
            return result.type === 'function'
          case 'classes':
            return result.type === 'class'
          case 'variables':
            return result.type === 'variable'
          default:
            return true
        }
      })
    }

    return filtered.slice(0, 20)
  }

  private getMockStats(): GraphStats {
    return {
      totalNodes: 30,
      totalLinks: 50,
      fileCount: 10,
      classCount: 8,
      functionCount: 12,
    }
  }

  private getMockGraph(): GraphData {
    const nodes: GraphNode[] = [
      { id: 'vue:core', name: 'Vue', type: 'class', size: 20, label: 'Vue' },
      { id: 'reactivity:ref', name: 'ref', type: 'function', size: 15, label: 'ref' },
      { id: 'reactivity:reactive', name: 'reactive', type: 'function', size: 15, label: 'reactive' },
      { id: 'compiler:parse', name: 'parse', type: 'function', size: 14, label: 'parse' },
    ]
    const links: GraphLink[] = [
      { id: 'l1', source: 'vue:core', target: 'reactivity:ref', type: 'uses' },
      { id: 'l2', source: 'vue:core', target: 'reactivity:reactive', type: 'uses' },
    ]
    return {
      nodes,
      links,
      stats: {
        totalNodes: 4,
        totalLinks: 2,
        fileCount: 1,
        classCount: 1,
        functionCount: 3,
      },
    }
  }

  private getMockFiles(): FileNode[] {
    return [
      {
        id: 'root',
        name: 'packages',
        type: 'folder',
        children: [
          { id: 'vue', name: 'vue', type: 'file', path: 'packages/vue/index.ts' },
          { id: 'reactivity', name: 'reactivity', type: 'file', path: 'packages/reactivity/index.ts' },
        ],
      },
    ]
  }
}

export const apiService = new ApiService()
export default apiService
