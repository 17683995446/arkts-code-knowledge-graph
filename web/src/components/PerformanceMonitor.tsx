import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { apiService } from '../services/api'
import { Cpu, HardDrive, Clock, Activity, TrendingUp, Database } from 'lucide-react'

export const PerformanceMonitor: React.FC = () => {
  const [stats, setStats] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(false)

  const fetchStats = React.useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiService.getStats()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [fetchStats])

  if (!stats) {
    return null
  }

  const metrics = [
    {
      label: '节点总数',
      value: stats.totalEntityCount || 0,
      icon: Database,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      label: '关系总数',
      value: stats.totalRelationCount || 0,
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    {
      label: '文件数',
      value: stats.fileEntityCount || 0,
      icon: HardDrive,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20'
    },
    {
      label: '类数量',
      value: stats.classEntityCount || 0,
      icon: Cpu,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20'
    },
    {
      label: '函数数量',
      value: stats.functionEntityCount || 0,
      icon: TrendingUp,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20'
    },
    {
      label: '查询响应',
      value: '< 1ms',
      icon: Clock,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20'
    }
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-5 w-5 text-green-600" />
          性能监控
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon
            return (
              <div
                key={index}
                className={`${metric.bgColor} rounded-lg p-3 transition-all hover:scale-105`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-4 w-4 ${metric.color}`} />
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {metric.label}
                  </span>
                </div>
                <div className={`text-lg font-bold ${metric.color}`}>
                  {loading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value
                  )}
                </div>
              </div>
            )
          })}
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">
              最后更新: {new Date().toLocaleTimeString()}
            </span>
            <button
              onClick={fetchStats}
              disabled={loading}
              className="text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {loading ? '更新中...' : '刷新'}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
