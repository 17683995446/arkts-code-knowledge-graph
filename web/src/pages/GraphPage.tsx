import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useGraphStore, type GraphNode, type GraphLink } from '../store/useGraphStore'
import { getNodeColor, getTypeName } from '../lib/utils'
import {
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Info,
  X,
  Maximize2,
  Minimize2,
  Loader2,
} from 'lucide-react'

interface D3Node extends GraphNode {
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
  vx?: number
  vy?: number
}

interface D3Link extends GraphLink {
  source: string | D3Node
  target: string | D3Node
}

const GraphPage = () => {
  const { graphData, selectedNode, setSelectedNode, loadGraph, isLoading, error } = useGraphStore()
  const svgRef = useRef<SVGSVGElement>(null)
  const [isZoomed, setIsZoomed] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const simulationRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null)

  useEffect(() => {
    if (!graphData) {
      loadGraph()
    }
  }, [graphData, loadGraph])

  useEffect(() => {
    if (!graphData || !svgRef.current || !containerRef.current) return

    const svg = d3.select(svgRef.current)
    const container = containerRef.current
    const width = container.clientWidth
    const height = isZoomed ? 800 : 600

    svg.selectAll('*').remove()

    const g = svg.append('g')

    const zoom = d3.zoom().scaleExtent([0.1, 5]).on('zoom', (event) => {
      g.attr('transform', event.transform)
    })
    svg.call(zoom)

    const d3Nodes: D3Node[] = [...graphData.nodes]
    const d3Links: D3Link[] = [...graphData.links]

    const simulation = d3
      .forceSimulation(d3Nodes)
      .force('link', d3.forceLink(d3Links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d) => d.size + 5))

    simulationRef.current = simulation

    const link = g
      .append('g')
      .selectAll('line')
      .data(d3Links)
      .enter()
      .append('line')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6)

    const node = g
      .append('g')
      .selectAll('g')
      .data(d3Nodes)
      .enter()
      .append('g')
      .style('cursor', 'pointer')
      .on('click', (_, d) => {
        setSelectedNode(d)
      })
      .call(
        d3.drag<SVGGElement, D3Node>().on('start', dragstarted).on('drag', dragged).on('end', dragended)
      )

    node
      .append('circle')
      .attr('r', (d) => d.size)
      .attr('fill', (d) => getNodeColor(d.type))
      .attr('stroke', '#fff')
      .attr('stroke-width', 3)

    node
      .append('text')
      .text((d) => d.name)
      .attr('x', (d) => d.size + 5)
      .attr('y', 5)
      .attr('font-size', '12px')
      .attr('fill', '#334155')
      .attr('pointer-events', 'none')

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)
      node.attr('transform', (d) => `translate(${d.x},${d.y})`)
    })

    function dragstarted(event: any, d: D3Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragged(event: any, d: D3Node) {
      d.fx = event.x
      d.fy = event.y
    }

    function dragended(event: any, d: D3Node) {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }
  }, [graphData, setSelectedNode, isZoomed])

  const resetView = () => {
    if (svgRef.current) {
      d3.select(svgRef.current).transition().duration(750).call(d3.zoom().transform, d3.zoom.identity)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="text-slate-600 dark:text-slate-400">Loading knowledge graph...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="text-red-500">Error: {error}</div>
        <Button onClick={loadGraph}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Knowledge Graph</h2>
          <p className="text-slate-500 dark:text-slate-400">
            Visualization of code entities and their relationships
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadGraph}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={resetView}>
            <ZoomIn className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsZoomed(!isZoomed)}>
            {isZoomed ? <Minimize2 className="h-4 w-4 mr-2" /> : <Maximize2 className="h-4 w-4 mr-2" />}
            {isZoomed ? 'Shrink' : 'Expand'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3">
          <CardContent className="p-0">
            <div ref={containerRef} className="w-full">
              <svg
                ref={svgRef}
                width="100%"
                height={isZoomed ? 800 : 600}
                className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Node Details</CardTitle>
                {selectedNode && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedNode(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedNode ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: getNodeColor(selectedNode.type) }}
                    >
                      <Info className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{selectedNode.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {getTypeName(selectedNode.type)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                      <p className="text-slate-500 dark:text-slate-400">ID</p>
                      <p className="font-medium truncate">{selectedNode.id}</p>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                      <p className="text-slate-500 dark:text-slate-400">Size</p>
                      <p className="font-medium">{selectedNode.size}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 text-sm text-center py-8">
                  Click on a node in the graph to see details
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { type: 'file', label: 'File' },
                { type: 'class', label: 'Class' },
                { type: 'function', label: 'Function' },
                { type: 'variable', label: 'Variable' },
                { type: 'interface', label: 'Interface' },
                { type: 'method', label: 'Method' },
              ].map((item) => (
                <div key={item.type} className="flex items-center gap-3">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: getNodeColor(item.type) }}
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-300">{item.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {graphData && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Nodes</span>
                  <span className="font-medium">{graphData.stats.totalNodes}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Links</span>
                  <span className="font-medium">{graphData.stats.totalLinks}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Files</span>
                  <span className="font-medium">{graphData.stats.fileCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Classes</span>
                  <span className="font-medium">{graphData.stats.classCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Functions</span>
                  <span className="font-medium">{graphData.stats.functionCount}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default GraphPage
