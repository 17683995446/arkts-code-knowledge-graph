import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Folder, FileCode, Package, Layers, BookOpen, FileText } from 'lucide-react'

const ProjectStructurePage = () => {
  const directories = [
    {
      id: 'src',
      name: 'src/',
      icon: Folder,
      color: 'blue',
      description: '源代码主目录',
      children: [
        { name: 'core/', icon: Layers, description: '核心功能模块' },
        { name: 'services/', icon: Package, description: '服务层代码' },
        { name: 'shared/', icon: FileText, description: '共享工具和类型' },
      ],
    },
    {
      id: 'tests',
      name: 'tests/',
      icon: BookOpen,
      color: 'green',
      description: '测试代码目录',
      children: [
        { name: 'unit/', icon: FileText, description: '单元测试' },
        { name: 'integration/', icon: FileText, description: '集成测试' },
      ],
    },
    {
      id: 'scripts',
      name: 'scripts/',
      icon: FileCode,
      color: 'purple',
      description: '辅助脚本工具',
      children: [
        { name: 'benchmark.ts', icon: FileCode, description: '性能基准测试' },
        { name: 'analyze-project.ts', icon: FileCode, description: '项目分析脚本' },
      ],
    },
    {
      id: 'web',
      name: 'web/',
      icon: Package,
      color: 'amber',
      description: '可视化前端界面',
      children: [
        { name: 'src/pages/', icon: FileCode, description: '页面组件' },
        { name: 'src/components/', icon: FileCode, description: 'UI 组件' },
      ],
    },
    {
      id: 'packages',
      name: 'packages/',
      icon: Package,
      color: 'red',
      description: '可独立发布的 npm 包',
      children: [
        { name: '@arkts-graph/parser', icon: FileCode, description: '代码解析器' },
        { name: '@arkts-graph/graph', icon: FileCode, description: '图谱数据库' },
        { name: '@arkts-graph/shared', icon: FileCode, description: '共享工具库' },
      ],
    },
  ]

  const configFiles = [
    { name: 'package.json', description: '项目依赖配置' },
    { name: 'tsconfig.json', description: 'TypeScript 配置' },
    { name: 'vitest.config.ts', description: 'Vitest 测试配置' },
    { name: 'biome.json', description: 'Biome 格式化配置' },
  ]

  const colorMap = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    green: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    purple: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
    amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    red: 'text-red-600 bg-red-50 dark:bg-red-900/20',
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          项目结构图
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          可视化 ArkTS 知识图谱系统的目录结构和模块关系
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>目录结构</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {directories.map((dir) => {
              const Icon = dir.icon
              return (
                <div key={dir.id} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <div className={`p-3 flex items-center gap-3 ${colorMap[dir.color]}`}>
                    <Icon className="h-5 w-5" />
                    <div>
                      <p className="font-medium">{dir.name}</p>
                      <p className="text-xs opacity-75">{dir.description}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 space-y-1">
                    {dir.children.map((child, idx) => {
                      const ChildIcon = child.icon
                      return (
                        <div key={idx} className="flex items-center gap-2 pl-6">
                          <ChildIcon className="h-3 w-3 text-slate-400" />
                          <span className="text-sm text-slate-600 dark:text-slate-300">{child.name}</span>
                          <span className="text-xs text-slate-400 ml-auto">{child.description}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>配置文件</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {configFiles.map((file, idx) => (
                  <li key={idx} className="flex items-center gap-3 p-2 rounded bg-slate-50 dark:bg-slate-800">
                    <FileText className="h-4 w-4 text-slate-500" />
                    <span className="font-mono text-sm">{file.name}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">
                      {file.description}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>项目特点</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <div className="mt-1 w-2 h-2 rounded-full bg-blue-500" />
                  <span><strong>Monorepo 架构：</strong>packages 目录下的模块可独立发布</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1 w-2 h-2 rounded-full bg-green-500" />
                  <span><strong>分离关注点：</strong>解析、图数据库、查询、可视化各司其职</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1 w-2 h-2 rounded-full bg-purple-500" />
                  <span><strong>TypeScript 优先：</strong>完整的类型安全和开发体验</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1 w-2 h-2 rounded-full bg-amber-500" />
                  <span><strong>现代工具链：</strong>使用 Biome、Vitest、Vite 等最新工具</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ProjectStructurePage
