import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useGraphStore, type GraphNode, type GraphLink } from '../store/useGraphStore';
import { getNodeColor, getTypeName } from '../lib/utils';
import {
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Info,
  X,
  Maximize2,
  Minimize2,
  Loader2,
  Play,
  Pause,
} from 'lucide-react';

interface D3Node extends GraphNode {
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
}

interface D3Link extends GraphLink {
  source: string | D3Node;
  target: string | D3Node;
}

const Graph3DPage = () => {
  const { graphData, selectedNode, setSelectedNode, loadGraph, isLoading, error } = useGraphStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [cameraDistance, setCameraDistance] = useState(300);
  const animationRef = useRef<number | null>(null);

  const project3D = useCallback((node: D3Node, width: number, height: number) => {
    const x = node.x || 0;
    const y = node.y || 0;
    const z = node.z || 0;
    
    const scale = cameraDistance / (cameraDistance + z);
    const rotatedX = x * Math.cos(rotationAngle) - y * Math.sin(rotationAngle);
    const rotatedY = x * Math.sin(rotationAngle) + y * Math.cos(rotationAngle);
    
    return {
      x: width / 2 + rotatedX * scale,
      y: height / 2 - rotatedY * scale,
      scale,
      z,
    };
  }, [rotationAngle, cameraDistance]);

  useEffect(() => {
    if (!graphData) {
      loadGraph();
    }
  }, [graphData, loadGraph]);

  useEffect(() => {
    if (!graphData || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = isZoomed ? 800 : 600;

    svg.selectAll('*').remove();

    const g = svg.append('g');

    const d3Nodes: D3Node[] = graphData.nodes.map((node) => ({
      ...node,
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 200,
      z: (Math.random() - 0.5) * 100,
    }));

    const d3Links: D3Link[] = [...graphData.links];

    const draw = () => {
      g.selectAll('*').remove();

      const projectedNodes = d3Nodes.map((node) => ({
        ...node,
        ...project3D(node, width, height),
      }));

      projectedNodes.sort((a, b) => (a.z || 0) - (b.z || 0));

      const link = g
        .append('g')
        .selectAll('line')
        .data(d3Links)
        .enter()
        .append('line');

      link
        .attr('stroke', '#cbd5e1')
        .attr('stroke-width', (d) => {
          const source = d3Nodes.find((n) => n.id === (d.source as string)) || d.source as D3Node;
          const target = d3Nodes.find((n) => n.id === (d.target as string)) || d.target as D3Node;
          const srcProj = project3D(source, width, height);
          const tgtProj = project3D(target, width, height);
          return Math.max(1, 2 * Math.min(srcProj.scale, tgtProj.scale));
        })
        .attr('stroke-opacity', 0.5)
        .attr('x1', (d: any) => {
          const source = d3Nodes.find((n) => n.id === d.source) || d.source;
          return project3D(source, width, height).x;
        })
        .attr('y1', (d: any) => {
          const source = d3Nodes.find((n) => n.id === d.source) || d.source;
          return project3D(source, width, height).y;
        })
        .attr('x2', (d: any) => {
          const target = d3Nodes.find((n) => n.id === d.target) || d.target;
          return project3D(target, width, height).x;
        })
        .attr('y2', (d: any) => {
          const target = d3Nodes.find((n) => n.id === d.target) || d.target;
          return project3D(target, width, height).y;
        });

      const node = g
        .append('g')
        .selectAll('g')
        .data(projectedNodes)
        .enter()
        .append('g')
        .style('cursor', 'pointer')
        .attr('transform', (d) => `translate(${d.x},${d.y})`)
        .on('click', (_, d) => {
          const originalNode = d3Nodes.find((n) => n.id === d.id);
          if (originalNode) {
            setSelectedNode(originalNode);
          }
        });

      node
        .append('circle')
        .attr('r', (d) => d.size * d.scale)
        .attr('fill', (d) => getNodeColor(d.type))
        .attr('stroke', '#fff')
        .attr('stroke-width', 2 * d.scale)
        .attr('opacity', (d) => 0.8 + (d.z || 0) / 200);

      node
        .append('text')
        .text((d) => d.name)
        .attr('x', (d) => d.size * d.scale + 5)
        .attr('y', 3)
        .attr('font-size', `${Math.max(10, 12 * d.scale)}px`)
        .attr('fill', '#334155')
        .attr('pointer-events', 'none')
        .attr('opacity', (d) => Math.min(1, Math.max(0.5, d.scale)));
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [graphData, setSelectedNode, isZoomed, rotationAngle, cameraDistance, project3D]);

  useEffect(() => {
    if (!isRotating) return;

    const animate = () => {
      setRotationAngle((prev) => prev + 0.02);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRotating]);

  const handleZoomIn = () => {
    setCameraDistance((prev) => Math.max(100, prev - 20));
  };

  const handleZoomOut = () => {
    setCameraDistance((prev) => Math.min(500, prev + 20));
  };

  const handleRotateLeft = () => {
    setRotationAngle((prev) => prev - 0.3);
  };

  const handleRotateRight = () => {
    setRotationAngle((prev) => prev + 0.3);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="text-slate-600 dark:text-slate-400">Loading 3D knowledge graph...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="text-red-500">Error: {error}</div>
        <Button onClick={loadGraph}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">3D Knowledge Graph</h2>
          <p className="text-slate-500 dark:text-slate-400">
            Interactive 3D visualization of code entities and their relationships
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadGraph}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4 mr-2" />
            Zoom Out
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4 mr-2" />
            Zoom In
          </Button>
          <Button variant="outline" size="sm" onClick={handleRotateLeft}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Left
          </Button>
          <Button variant="outline" size="sm" onClick={handleRotateRight}>
            <RotateCw className="h-4 w-4 mr-2" />
            Right
          </Button>
          <Button
            variant={isRotating ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsRotating(!isRotating)}
            className={isRotating ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            {isRotating ? (
              <Pause className="h-4 w-4 mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isRotating ? 'Pause' : 'Auto Rotate'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsZoomed(!isZoomed)}>
            {isZoomed ? (
              <Minimize2 className="h-4 w-4 mr-2" />
            ) : (
              <Maximize2 className="h-4 w-4 mr-2" />
            )}
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSelectedNode(null)}
                  >
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
                      <p className="font-medium text-slate-900 dark:text-white">
                        {selectedNode.name}
                      </p>
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
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {item.label}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">View Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-2 block">
                  Camera Distance
                </label>
                <input
                  type="range"
                  min="100"
                  max="500"
                  value={cameraDistance}
                  onChange={(e) => setCameraDistance(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-2 block">
                  Rotation Angle
                </label>
                <input
                  type="range"
                  min="0"
                  max={Math.PI * 2}
                  step="0.1"
                  value={rotationAngle}
                  onChange={(e) => setRotationAngle(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
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
  );
};

export default Graph3DPage;