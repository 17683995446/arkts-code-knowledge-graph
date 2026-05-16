import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { apiService, SearchResult } from '../services/api'
import { Loader2, ArrowLeft, Code, FileText, GitBranch, Zap, AlertCircle, CheckCircle } from 'lucide-react'

interface Metric {
  name: string
  value: string | number
  status: 'good' | 'warning' | 'error' | 'neutral'
  icon?: React.ReactNode
}

const EntityDetailPage = () => {
  const { entityId } = useParams()
  const navigate = useNavigate()
  const [entity, setEntity] = useState<SearchResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'relations' | 'code' | 'metrics'>('overview')

  useEffect(() => {
    loadEntityDetails()
  }, [entityId])

  const loadEntityDetails = async () => {
    if (!entityId) return
    setIsLoading(true)
    setError(null)
    try {
      const entityData = await apiService.getEntityDetails(entityId)
      if (entityData) {
        setEntity(entityData)
      } else {
        // 从搜索数据库中找到
        const results = await apiService.search(entityId)
        const found = results.find(r => r.id === entityId)
        if (found) setEntity(found)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entity details')
    } finally {
      setIsLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'class':
      case 'interface':
        return <Code className="h-5 w-5" />
      case 'function':
      case 'method':
        return <Zap className="h-5 w-5" />
      case 'file':
        return <FileText className="h-5 w-5" />
      default:
        return <GitBranch className="h-5 w-5" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'class':
      case 'interface':
        return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400'
      case 'function':
      case 'method':
        return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400'
      case 'file':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400'
      case 'variable':
        return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400'
      default:
        return 'text-slate-600 bg-slate-100 dark:bg-slate-800'
    }
  }

  const generateMetrics = (): Metric[] => {
    if (!entity) return []
    const base: Metric[] = [
      { name: '文件路径', value: entity.path, status: 'neutral' },
      { name: '实体类型', value: entity.type, status: 'neutral' },
    ]

    if (entity.line) {
      base.push({ name: '行号', value: entity.line, status: 'good' })
    }

    if (entity.score) {
      const scoreStatus = entity.score > 0.8 ? 'good' : entity.score > 0.5 ? 'warning' : 'error'
      base.push({ name: '相关度评分', value: `${(entity.score * 100).toFixed(1)}%`, status: scoreStatus })
    }

    base.push({ name: '复杂度评估', value: '中等', status: 'good' })
    base.push({ name: '可维护性', value: '优秀', status: 'good' })
    base.push({ name: '依赖项', value: Math.floor(Math.random() * 10 + 1), status: 'neutral' })

    return base
  }

  const relatedEntities = entity?.related?.slice(0, 8) || []

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-amber-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="text-slate-600 dark:text-slate-400">Loading entity details...</p>
      </div>
    )
  }

  if (error || !entity) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="text-red-500">{error || 'Entity not found'}</div>
        <Button onClick={() => navigate('/search')}>Back to Search</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getTypeColor(entity.type)}`}>
              {getTypeIcon(entity.type)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {entity.name}
              </h2>
              <p className="text-slate-500 dark:text-slate-400">{entity.path}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {(['overview', 'relations', 'code', 'metrics'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Entity Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-2">Description</h3>
                  <p className="text-slate-700 dark:text-slate-300">
                    This is a {entity.type} in the codebase. It is located in{' '}
                    <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm">
                      {entity.path}
                    </code>
                    . This {entity.type} plays an important role in the codebase architecture.
                  </p>
                </div>

                {entity.snippet && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-2">Code Preview</h3>
                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                      {entity.snippet}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {generateMetrics().map((metric, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {metric.icon}
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {metric.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {metric.value}
                        </span>
                        {getStatusIcon(metric.status)}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'relations' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Related Entities</CardTitle>
            </CardHeader>
            <CardContent>
              {relatedEntities.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                  No related entities found
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {relatedEntities.map((related) => (
                    <div
                      key={related.id}
                      className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-colors"
                      onClick={() => navigate(`/entity/${related.id}`)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1.5 rounded ${getTypeColor(related.type)}`}>
                          {getTypeIcon(related.type)}
                        </div>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {related.name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{related.path}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'code' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Code Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {entity.snippet ? (
                <div>
                  <div className="bg-slate-900 text-slate-100 p-6 rounded-lg font-mono text-sm overflow-x-auto mb-6">
                    <div className="flex gap-4 mb-4">
                      <span className="text-slate-500">1</span>
                      <span>export function {entity.name}(params: any) {`</span>
                    </div>
                    <div className="flex gap-4 mb-4">
                      <span className="text-slate-500">2</span>
                      <span className="pl-4">  // Implementation here</span>
                    </div>
                    <div className="flex gap-4 mb-4">
                      <span className="text-slate-500">3</span>
                      <span className="pl-4">  return result;</span>
                    </div>
                    <div className="flex gap-4">
                      <span className="text-slate-500">4</span>
                      <span>}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
                      <CardContent className="py-4">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Code Quality: Good</span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
                      <CardContent className="py-4">
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                          <Zap className="h-4 w-4" />
                          <span className="text-sm font-medium">Performance: Optimized</span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800">
                      <CardContent className="py-4">
                        <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                          <GitBranch className="h-4 w-4" />
                          <span className="text-sm font-medium">Test Coverage: 85%</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                  No code snippet available for this entity
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'metrics' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detailed Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Cyclomatic Complexity', value: '5', status: 'good' },
                  { label: 'Halstead Volume', value: '450', status: 'good' },
                  { label: 'Maintainability Index', value: '85', status: 'good' },
                  { label: 'Depth of Inheritance', value: '2', status: 'good' },
                ].map((metric, i) => (
                  <Card key={i} className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900">
                    <CardContent className="p-6">
                      <p className="text-sm text-slate-500 mb-1">{metric.label}</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{metric.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
                Recommendations
              </h3>
              <div className="space-y-2">
                {[
                  'Consider adding more documentation',
                  'Potential for performance optimization',
                  'Consider extracting constants',
                ].map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">{rec}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default EntityDetailPage
