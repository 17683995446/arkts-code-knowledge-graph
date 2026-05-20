import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'
import { Folder, Play, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { apiService } from '../services/api'

interface ProjectAnalyzerProps {
  onAnalysisComplete?: () => void
}

export const ProjectAnalyzer: React.FC<ProjectAnalyzerProps> = ({ onAnalysisComplete }) => {
  const [projectPath, setProjectPath] = useState('/workspace/src')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setStatus('analyzing')
    setMessage('正在分析项目...')

    try {
      const result = await apiService.analyzeProject(projectPath)
      if (result) {
        setStatus('success')
        setMessage('项目分析完成！')
        onAnalysisComplete?.()
      } else {
        setStatus('error')
        setMessage('分析过程中出现错误，请检查API服务是否运行正常。')
      }
    } catch (error) {
      console.error('Analysis error:', error)
      setStatus('error')
      setMessage('分析失败：' + (error instanceof Error ? error.message : '未知错误'))
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'analyzing':
        return <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      case 'success':
        return <CheckCircle2 className="h-6 w-6 text-green-600" />
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-600" />
      default:
        return <Folder className="h-6 w-6 text-slate-400" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10'
      case 'error':
        return 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10'
      default:
        return ''
    }
  }

  return (
    <Card className={getStatusColor()}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {getStatusIcon()}
            项目分析
          </CardTitle>
          {status !== 'idle' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatus('idle')}
              className="h-8"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {status === 'idle' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                项目路径
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={projectPath}
                  onChange={(e) => setProjectPath(e.target.value)}
                  placeholder="输入项目路径..."
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <Button onClick={handleAnalyze} disabled={isAnalyzing} className="whitespace-nowrap">
                  <Play className="h-4 w-4 mr-2" />
                  开始分析
                </Button>
              </div>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              <p>点击开始分析，构建完整的知识图谱。</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  {status === 'analyzing' ? '分析中...' : 
                   status === 'success' ? '分析完成！' : '分析失败'}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    重新分析
                  </>
                )}
              </Button>
              {status === 'success' && (
                <Button variant="outline" onClick={onAnalysisComplete}>
                  查看结果
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
