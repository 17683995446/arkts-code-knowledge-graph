import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Network,
  FileCode,
  Search,
  Settings,
  Braces,
  GitBranch,
  Workflow,
  Clock,
  BookOpen,
  FolderTree,
  Flame,
  Sun,
  Moon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/store/useThemeStore'

const Navbar = () => {
  const location = useLocation()
  const { theme, toggleTheme } = useThemeStore()

  const navItems = [
    {
      path: '/',
      label: '仪表盘',
      icon: LayoutDashboard,
    },
    {
      path: '/graph',
      label: '2D图谱',
      icon: Network,
    },
    {
      path: '/graph-3d',
      label: '3D图谱',
      icon: Network,
    },
    {
      path: '/architecture',
      label: '架构图',
      icon: GitBranch,
    },
    {
      path: '/flow',
      label: '流程图',
      icon: Workflow,
    },
    {
      path: '/sequence',
      label: '时序图',
      icon: Clock,
    },
    {
      path: '/principle',
      label: '原理图',
      icon: BookOpen,
    },
    {
      path: '/structure',
      label: '结构图',
      icon: FolderTree,
    },
    {
      path: '/heatmap',
      label: '代码热图',
      icon: Flame,
    },
    {
      path: '/files',
      label: '文件',
      icon: FileCode,
    },
    {
      path: '/search',
      label: '搜索',
      icon: Search,
    },
  ]

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
          <Braces className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            ArkTS 知识图谱
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            企业级代码分析与可视化平台
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          )
        })}
        
        {/* 主题切换按钮 */}
        <button
          onClick={toggleTheme}
          className="ml-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
          title={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>
      </div>
    </nav>
  )
}

export default Navbar
