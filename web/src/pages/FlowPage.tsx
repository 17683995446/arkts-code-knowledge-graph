import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ChevronRight, Folder, FileCode, Database, Search, Zap, CheckCircle } from 'lucide-react'

const FlowPage = () => {
  const steps = [
    {
      id: 'scan',
      title: '文件扫描',
      icon: Folder,
      color: 'blue',
      description: '使用 Glob 模式匹配 TypeScript/ArkTS 文件，根据配置排除 node_modules、测试文件等',
      details: [
        '文件系统遍历',
        'Glob 模式匹配',
        '排除规则过滤',
        '文件列表收集',
      ],
    },
    {
      id: 'parse',
      title: '代码解析',
      icon: FileCode,
      color: 'purple',
      description: 'Babel 快速解析生成 AST，ts-morph 提供完整类型信息，双重解析确保准确性',
      details: [
        'Babel AST 解析',
        'ts-morph 类型分析',
        '语义信息提取',
        '代码实体识别',
      ],
    },
    {
      id: 'extract',
      title: '实体提取',
      icon: Zap,
      color: 'green',
      description: '从 AST 中提取类、接口、函数、变量等代码实体，分析实体间关系',
      details: [
        '类/接口提取',
        '函数/方法识别',
        '变量/常量分析',
        '导入/导出关系',
      ],
    },
    {
      id: 'graph',
      title: '图谱构建',
      icon: Database,
      color: 'amber',
      description: '将实体和关系存储到 Graphology 图数据库，创建索引支持快速查询',
      details: [
        '节点创建',
        '边关系建立',
        '全文索引构建',
        '语义向量化',
      ],
    },
    {
      id: 'query',
      title: '查询服务',
      icon: Search,
      color: 'red',
      description: '提供实体搜索、路径查找、社区检测等查询功能',
      details: [
        '全文关键词搜索',
        '语义相似度匹配',
        '路径分析查询',
        '社区检测',
      ],
    },
    {
      id: 'complete',
      title: '分析完成',
      icon: CheckCircle,
      color: 'emerald',
      description: '知识图谱构建完成，提供可视化和多种分析功能',
      details: [
        'D3.js 可视化',
        '数据度量报告',
        '重构建议',
        'API 接口',
      ],
    },
  ]

  const colorMap = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          数据处理流程图
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          展示从源代码到知识图谱的完整数据处理流程
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((step, idx) => {
          const Icon = step.icon
          return (
            <div key={step.id} className="relative">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${colorMap[step.color]}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          步骤 {idx + 1}
                        </span>
                        <CardTitle className="text-lg">{step.title}</CardTitle>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {step.details.map((detail, detailIdx) => (
                      <div
                        key={detailIdx}
                        className="p-2 text-xs rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      >
                        {detail}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              {idx < steps.length - 1 && (
                <div className="flex justify-center my-2">
                  <ChevronRight className="h-6 w-6 text-slate-400" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">技术栈</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><strong>解析：</strong>Babel 7 + ts-morph</p>
            <p><strong>图数据库：</strong>Graphology</p>
            <p><strong>可视化：</strong>D3.js + Recharts</p>
            <p><strong>搜索：</strong>TF-IDF + 向量相似度</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">性能特点</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><strong>增量解析：</strong>仅处理变化的文件</p>
            <p><strong>并行处理：</strong>多文件并行分析</p>
            <p><strong>内存优化：</strong>流式解析，低内存占用</p>
            <p><strong>索引缓存：</strong>热点查询缓存加速</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default FlowPage
