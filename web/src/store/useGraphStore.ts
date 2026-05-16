import { create } from 'zustand'
import type { GraphData, GraphNode, GraphLink } from '../services/api'

export interface GraphNode {
  id: string
  name: string
  type: string
  label: string
  size: number
}

export interface GraphLink {
  id: string
  source: string
  target: string
  type: string
}

interface GraphStore {
  graphData: GraphData | null
  selectedNode: GraphNode | null
  isLoading: boolean
  error: string | null
  setGraphData: (data: GraphData | null) => void
  setSelectedNode: (node: GraphNode | null) => void
  loadGraph: () => Promise<void>
  clearError: () => void
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  graphData: null,
  selectedNode: null,
  isLoading: false,
  error: null,
  
  setGraphData: (data) => set({ graphData: data }),
  
  setSelectedNode: (node) => set({ selectedNode: node }),
  
  loadGraph: async () => {
    if (get().isLoading) return
    
    set({ isLoading: true, error: null })
    
    try {
      // 动态导入 API 服务，避免循环依赖问题
      const { apiService } = await import('../services/api')
      const graphData = await apiService.getGraph()
      set({ graphData, isLoading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load graph',
        isLoading: false 
      })
    }
  },
  
  clearError: () => set({ error: null })
}))
