import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowRight, Monitor, Layers, FileCode, Database, Search, Brain } from 'lucide-react'

const SequencePage = () => {
  const participants = [
    { id: 'cli', name: 'CLI / Web', icon: Monitor, color: 'blue' },
    { id: 'service', name: 'Service 层', icon: Layers, color: 'purple' },
    { id: 'parser', name: 'Parser', icon: FileCode, color: 'green' },
    { id: 'graph', name: 'Graph DB', icon: Database, color: 'amber' },
    { id: 'query', name: 'Query Engine', icon: Search, color: 'red' },
    { id: 'semantic', name: 'Semantic', icon: Brain, color: 'emerald' },
  ]

  const sequence = [
    { from: 'cli', to: 'service', label: 'analyzeProject()', type: 'request' },
    { from: 'service', to: 'parser', label: 'parseProject()', type: 'request' },
    { from: 'parser', to: 'parser', label: 'findFiles()', type: 'self' },
    { from: 'parser', to: 'parser', label: 'Babel.parse()', type: 'self' },
    { from: 'parser', to: 'parser', label: 'ts-morph API', type: 'self' },
    { from: 'parser', to: 'service', label: 'entities[]', type: 'response' },
    { from: 'service', to: 'graph', label: 'addEntities()', type: 'request' },
    { from: 'service', to: 'graph', label: 'addRelations()', type: 'request' },
    { from: 'service', to: 'query', label: 'searchByName()', type: 'request' },
    { from: 'query', to: 'graph', label: 'graph.traverse()', type: 'request' },
    { from: 'query', to: 'service', label: 'results[]', type: 'response' },
    { from: 'service', to: 'semantic', label: 'semanticSearch()', type: 'request' },
    { from: 'semantic', to: 'service', label: 'ranked[]', type: 'response' },
  ]

  const colorMap = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  }

  const participantIndex = Object.fromEntries(participants.map((p, i) => [p.id, i]))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          系统时序图
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          展示项目分析过程中各组件之间的交互顺序
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>交互参与者</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {participants.map((p) => {
              const Icon = p.icon
              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-xl text-center ${colorMap[p.color]}`}
                >
                  <Icon className="h-6 w-6 mx-auto mb-1" />
                  <p className="text-sm font-medium">{p.name}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>交互序列</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sequence.map((step, idx) => {
            const fromIdx = participantIndex[step.from]
            const toIdx = participantIndex[step.to]
            const fromP = participants[fromIdx]
            const toP = participants[toIdx]
            const direction = fromIdx < toIdx ? 'left-to-right' : 'right-to-left'
            
            return (
              <div key={idx} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="text-xs font-semibold text-slate-500 w-12">{idx + 1}</span>
                
                <div className="flex items-center gap-2 flex-1">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${colorMap[fromP.color]}`}>
                    {fromP.name}
                  </span>
                  
                  {step.type === 'request' && <ArrowRight className="h-4 w-4 text-slate-400" />}
                  {step.type === 'response' && <ArrowRight className="h-4 w-4 text-slate-400 rotate-180" />}
                  {step.type === 'self' && <span className="text-slate-400">→</span>}
                  
                  <span className={`px-2 py-1 rounded text-xs font-medium ${colorMap[toP.color]}`}>
                    {toP.name}
                  </span>
                </div>
                
                <div className="font-mono text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-3 py-1 rounded border border-slate-200 dark:border-slate-700">
                  {step.label}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">阶段 1：初始化与解析</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="text-sm text-slate-600 dark:text-slate-300 space-y-2 list-decimal list-inside">
              <li>用户通过 CLI 或 Web 发起分析请求</li>
              <li>Service 层接收请求并调用 Parser</li>
              <li>Parser 使用 Glob 扫描项目文件</li>
              <li>Babel 快速解析生成 AST</li>
              <li>ts-morph 提供类型信息和符号表</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">阶段 2：图谱构建</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="text-sm text-slate-600 dark:text-slate-300 space-y-2 list-decimal list-inside">
              <li>Parser 提取所有代码实体</li>
              <li>Service 将实体添加到 Graph DB</li>
              <li>分析并添加实体间的关系</li>
              <li>创建全文搜索索引</li>
              <li>构建语义向量索引</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SequencePage
