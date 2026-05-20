import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { apiService, GraphStats } from '@/services/api'
import { formatNumber } from '@/lib/utils'
import { ProjectAnalyzer } from '@/components/ProjectAnalyzer'
import { PerformanceMonitor } from '@/components/PerformanceMonitor'
import { Files, Box, FunctionSquare, GitBranch, Loader2, Database, Download, RefreshCw } from 'lucide-react'

const Dashboard = () => {
  const [stats, setStats] = useState<GraphStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStats = async () => {
    setIsLoading(true)
    try {
      const data = await apiService.getStats()
      setStats(data)
      setError(null)
    } catch (err) {
      console.error('Failed to load stats:', err)
      setError('加载数据失败')
    } finally {
      setIsLoading(false)
    }
  }

  const exportStats = () => {
    if (!stats) return
    const dataStr = JSON.stringify(stats, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'knowledge-graph-stats.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    loadStats()
    const interval = setInterval(loadStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const distributionData = stats ? [
    { name: '文件', value: stats.fileCount || 0, color: '#3b82f6' },
    { name: '类', value: stats.classCount || 0, color: '#8b5cf6' },
    { name: '函数', value: stats.functionCount || 0, color: '#10b981' },
    { name: '变量', value: stats.variableCount || 0, color: '#f59e0b' },
    { name: '方法', value: stats.methodCount || 0, color: '#ef4444' },
  ] : []

  const timelineData = [
    { name: 'Mon', nodes: 45, links: 32 },
    { name: 'Tue', nodes: 78, links: 56 },
    { name: 'Wed', nodes: 92, links: 67 },
    { name: 'Thu', nodes: 134, links: 98 },
    { name: 'Fri', nodes: 189, links: 145 },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  const statsCards = [
    {
      label: '总节点',
      value: stats?.totalNodes || 0,
      icon: GitBranch,
      color: 'blue',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: '总关系',
      value: stats?.totalLinks || 0,
      icon: Box,
      color: 'purple',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      label: '文件数',
      value: stats?.fileCount || 0,
      icon: Files,
      color: 'green',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: '类/接口',
      value: (stats?.classCount || 0) + (stats?.interfaceCount || 0),
      icon: Database,
      color: 'amber',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    },
  ]

  const colorClasses: Record<string, string> = {
    blue: 'text-blue-600 dark:text-blue-400',
    purple: 'text-purple-600 dark:text-purple-400',
    green: 'text-green-600 dark:text-green-400',
    amber: 'text-amber-600 dark:text-amber-400',
  }

  return (
    <div className="space-y-6">
      <PerformanceMonitor />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">数据仪表盘</h2>
          <p className="text-slate-500 dark:text-slate-400">
            知识图谱分析统计概览
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新数据
          </Button>
          <Button variant="outline" onClick={exportStats} disabled={!stats}>
            <Download className="h-4 w-4 mr-2" />
            导出数据
          </Button>
        </div>
      </div>

      <ProjectAnalyzer onAnalysisComplete={loadStats} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {stat.label}
                </CardTitle>
                <div className={`${stat.bgColor} p-2 rounded-lg`}>
                  <Icon className={`h-5 w-5 ${colorClasses[stat.color]}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  {formatNumber(stat.value)}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>节点分布</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>节点增长趋势</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="nodes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="links" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>项目统计详情</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
              <p className="text-sm text-slate-500">文件数</p>
              <p className="text-2xl font-bold text-blue-600">{stats?.fileCount || 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
              <p className="text-sm text-slate-500">类数</p>
              <p className="text-2xl font-bold text-purple-600">{stats?.classCount || 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
              <p className="text-sm text-slate-500">函数数</p>
              <p className="text-2xl font-bold text-green-600">{stats?.functionCount || 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
              <p className="text-sm text-slate-500">接口数</p>
              <p className="text-2xl font-bold text-amber-600">{stats?.interfaceCount || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard
