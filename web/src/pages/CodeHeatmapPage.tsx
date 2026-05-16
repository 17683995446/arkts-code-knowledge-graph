import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Flame, Thermometer, Zap, Activity, Clock, TrendingUp, Info, Search } from 'lucide-react'

const CodeHeatmapPage = () => {
  const [activeView, setActiveView] = useState<'complexity' | 'churn' | 'coverage'>('complexity')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  // 模拟热图数据
  const generateHeatmapData = () => {
    const files = [
      { name: 'core/parser.ts', complexity: 85, churn: 72, coverage: 68 },
      { name: 'core/knowledge-graph.ts', complexity: 78, churn: 65, coverage: 85 },
      { name: 'core/semantic-search.ts', complexity: 62, churn: 58, coverage: 72 },
      { name: 'services/parse-service.ts', complexity: 71, churn: 80, coverage: 65 },
      { name: 'services/query-service.ts', complexity: 55, churn: 45, coverage: 90 },
      { name: 'shared/utils.ts', complexity: 40, churn: 50, coverage: 95 },
      { name: 'cli/index.ts', complexity: 68, churn: 35, coverage: 50 },
      { name: 'api/server.ts', complexity: 75, churn: 90, coverage: 60 },
    ]
    return files
  }

  const heatmapData = generateHeatmapData()

  const getColorForValue = (value: number, view: string) => {
    if (view === 'coverage') {
      if (value >= 80) return 'bg-green-500'
      if (value >= 60) return 'bg-yellow-500'
      if (value >= 40) return 'bg-orange-500'
      return 'bg-red-500'
    } else {
      if (value >= 80) return 'bg-red-500'
      if (value >= 60) return 'bg-orange-500'
      if (value >= 40) return 'bg-yellow-500'
      return 'bg-green-500'
    }
  }

  const getCurrentValue = (file: any) => {
    switch (activeView) {
      case 'complexity':
        return file.complexity
      case 'churn':
        return file.churn
      case 'coverage':
        return file.coverage
      default:
        return 0
    }
  }

  const viewOptions = [
    { id: 'complexity', label: '代码复杂度', icon: Flame, description: '更高 = 需要重构' },
    { id: 'churn', label: '变更频率', icon: Zap, description: '更高 = 变更频繁' },
    { id: 'coverage', label: '测试覆盖', icon: Activity, description: '更高 = 覆盖完善' },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-64 mb-2"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-96"></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-32">
              <CardContent className="animate-pulse bg-slate-100 dark:bg-slate-800"></CardContent>
            </Card>
          ))}
        </div>
        <Card className="h-80">
          <CardContent className="animate-pulse bg-slate-100 dark:bg-slate-800"></CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            代码热图分析
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            可视化分析代码库的健康状况和风险领域
          </p>
        </div>
      </div>

      {/* 指标统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-200 dark:bg-red-800 rounded-lg">
                <Flame className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-red-700 dark:text-red-300">高风险文件</p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-100">3</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-200 dark:bg-yellow-800 rounded-lg">
                <Thermometer className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">需要关注</p>
                <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">5</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-200 dark:bg-green-800 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-green-700 dark:text-green-300">健康文件</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">12</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-200 dark:bg-blue-800 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300">平均覆盖率</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">73%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 视图选择 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>分析视图</CardTitle>
            <div className="flex gap-2">
              {viewOptions.map((option) => {
                const Icon = option.icon
                return (
                  <Button
                    key={option.id}
                    variant={activeView === option.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveView(option.id as any)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {option.label}
                  </Button>
                )
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {viewOptions.find((o) => o.id === activeView)?.description}
          </p>

          {/* 热图 */}
          <div className="grid gap-3">
            {heatmapData.map((file, index) => {
              const value = getCurrentValue(file)
              return (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-48 flex-shrink-0">
                    <p className="font-mono text-sm text-slate-700 dark:text-slate-300 truncate">
                      {file.name}
                    </p>
                  </div>
                  <div className="flex-1">
                    <div className="h-8 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex">
                      <div
                        className={`h-full ${getColorForValue(value, activeView)} transition-all duration-500`}
                        style={{ width: `${Math.min(value, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right flex-shrink-0">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{value}%</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 图例 */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                <Info className="h-4 w-4 inline mr-2" />
                图例说明
              </p>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500"></div>
                  <span className="text-xs text-slate-600 dark:text-slate-400">低风险</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-yellow-500"></div>
                  <span className="text-xs text-slate-600 dark:text-slate-400">中风险</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-orange-500"></div>
                  <span className="text-xs text-slate-600 dark:text-slate-400">需关注</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500"></div>
                  <span className="text-xs text-slate-600 dark:text-slate-400">高风险</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 建议 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">优化建议</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { priority: 'high', title: '重构 api/server.ts', desc: '高复杂度且低测试覆盖' },
              { priority: 'high', title: '增加 core/parser.ts 测试', desc: '这是核心功能但测试不充分' },
              { priority: 'medium', title: '监控 services/parse-service.ts', desc: '变更频率非常高' },
            ].map((item, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${
                item.priority === 'high' 
                  ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800' 
                  : 'bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800'
              }`}>
                <div className={`mt-1 ${
                  item.priority === 'high' ? 'text-red-500' : 'text-yellow-500'
                }`}>
                  <Flame className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{item.title}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default CodeHeatmapPage
