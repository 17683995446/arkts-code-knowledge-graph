import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { apiService, FileNode } from '../services/api'
import { Loader2, Folder, File, ChevronRight, ChevronDown } from 'lucide-react'

interface TreeNode {
  node: FileNode
  expanded: boolean
  level: number
}

const FilesPage = () => {
  const [files, setFiles] = useState<FileNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const fileData = await apiService.getFiles()
      setFiles(fileData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }

  const flattenTree = (nodes: FileNode[], level = 0): TreeNode[] => {
    let result: TreeNode[] = []
    for (const node of nodes) {
      result.push({ node, expanded: expandedNodes.has(node.id), level })
      if (node.children && node.type === 'folder' && expandedNodes.has(node.id)) {
        result = result.concat(flattenTree(node.children, level + 1))
      }
    }
    return result
  }

  const flatFiles = flattenTree(files)

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="text-slate-600 dark:text-slate-400">Loading file system...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="text-red-500">Error: {error}</div>
        <Button onClick={loadFiles}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">File Explorer</h2>
          <p className="text-slate-500 dark:text-slate-400">
            Browse the project structure and file hierarchy
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadFiles}>
          <Loader2 className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Project Structure</CardTitle>
        </CardHeader>
        <CardContent>
          {flatFiles.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-center py-8">
              No files found
            </p>
          ) : (
            <div className="space-y-1">
              {flatFiles.map(({ node, level }) => (
                <div
                  key={node.id}
                  className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  style={{ paddingLeft: `${level * 1.5}rem` }}
                  onClick={() => node.type === 'folder' && toggleNode(node.id)}
                >
                  <span className="text-slate-400">
                    {node.type === 'folder' ? (
                      expandedNodes.has(node.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )
                    ) : null}
                  </span>
                  <span>
                    {node.type === 'folder' ? (
                      <Folder className="h-4 w-4 text-blue-500" />
                    ) : (
                      <File className="h-4 w-4 text-slate-500" />
                    )}
                  </span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {node.name}
                  </span>
                  {node.path && node.type === 'file' && (
                    <span className="text-xs text-slate-400 font-mono ml-auto">
                      {node.path}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                // Expand all folders
                const allIds = new Set<string>()
                const collectIds = (nodes: FileNode[]) => {
                  for (const node of nodes) {
                    if (node.type === 'folder') allIds.add(node.id)
                    if (node.children) collectIds(node.children)
                  }
                }
                collectIds(files)
                setExpandedNodes(allIds)
              }}
            >
              <ChevronDown className="h-4 w-4 mr-2" />
              Expand All
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => setExpandedNodes(new Set())}
            >
              <ChevronRight className="h-4 w-4 mr-2" />
              Collapse All
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Folders</span>
                <span className="font-medium">
                  {flatFiles.filter((f) => f.node.type === 'folder').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Files</span>
                <span className="font-medium">
                  {flatFiles.filter((f) => f.node.type === 'file').length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tips</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 dark:text-slate-400">
            <ul className="space-y-1">
              <li>• Click on a folder to expand or collapse</li>
              <li>• File paths are shown on the right</li>
              <li>• Use quick actions to manage your view</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default FilesPage
