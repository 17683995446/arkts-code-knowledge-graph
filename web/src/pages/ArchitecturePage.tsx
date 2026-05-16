import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Box, FileCode, Cpu, Database, Search, Layers, Monitor } from 'lucide-react'

const ArchitecturePage = () => {
  const layers = [
    {
      id: 'interface',
      title: '接口层',
      icon: Monitor,
      color: 'blue',
      modules: [
        { name: 'CLI 工具', description: '命令行交互接口' },
        { name: 'Web 可视化', description: 'React 前端界面' },
      ],
    },
    {
      id: 'service',
      title: '服务层',
      icon: Layers,
      color: 'purple',
      modules: [
        { name: 'Service 编排', description: '业务逻辑协调' },
        { name: '代码解析服务', description: 'AST 解析与处理' },
      ],
    },
    {
      id: 'core',
      title: '核心层',
      icon: Cpu,
      color: 'green',
      modules: [
        { name: '知识图谱', description: 'Graphology 图数据库' },
        { name: '查询引擎', description: '图谱遍历与搜索' },
        { name: '语义搜索', description: '向量相似度匹配' },
        { name: '代码度量', description: '复杂度与质量分析' },
        { name: '符号表', description: '代码实体管理' },
      ],
    },
    {
      id: 'parser',
      title: '解析层',
      icon: FileCode,
      color: 'amber',
      modules: [
        { name: 'Babel', description: '高性能 AST 解析' },
        { name: 'ts-morph', description: 'TypeScript 类型分析' },
      ],
    },
  ]

  const colorMap = {
    blue: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
    purple: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20',
    green: 'border-green-500 bg-green-50 dark:bg-green-900/20',
    amber: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20',
  }

  const iconColorMap = {
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    green: 'text-green-600',
    amber: 'text-amber-600',
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          系统架构图
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          展示 ArkTS 知识图谱系统的模块结构和依赖关系
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {layers.map((layer) => {
          const Icon = layer.icon
          return (
            <Card key={layer.id} className={`border-t-4 ${colorMap[layer.color]}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${iconColorMap[layer.color]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{layer.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {layer.modules.map((module, idx) => (
                  <div key={idx} className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {module.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {module.description}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>架构特点</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <Box className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span><strong>高度模块化：</strong>各组件独立可复用，解耦合设计</span>
            </li>
            <li className="flex items-start gap-2">
              <Box className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <span><strong>分层架构：</strong>清晰的接口层→服务层→核心层→解析层划分</span>
            </li>
            <li className="flex items-start gap-2">
              <Box className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
              <span><strong>可扩展：</strong>易于添加新的解析器、算法和可视化组件</span>
            </li>
            <li className="flex items-start gap-2">
              <Box className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <span><strong>高性能：</strong>基于 Graphology、D3.js 等成熟库构建</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

export default ArchitecturePage
