import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Search, Filter, FileCode, FunctionSquare, Box, Hash, Loader2, X } from 'lucide-react'
import { apiService, SearchResult } from '@/services/api'

const SearchPage = () => {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const filters = [
    { id: 'all', label: '全部', icon: Search, color: 'blue' },
    { id: 'files', label: '文件', icon: FileCode, color: 'blue' },
    { id: 'functions', label: '函数', icon: FunctionSquare, color: 'green' },
    { id: 'classes', label: '类', icon: Box, color: 'purple' },
    { id: 'variables', label: '变量', icon: Hash, color: 'amber' },
  ]

  const handleSearch = useCallback(async (searchQuery: string, filter: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      setHasSearched(false)
      return
    }

    setIsLoading(true)
    setHasSearched(true)

    try {
      const searchResults = await apiService.search(searchQuery, filter)
      setResults(searchResults)
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      handleSearch(query, activeFilter)
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [query, activeFilter, handleSearch])

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setHasSearched(false)
  }

  const getIconByType = (type: string) => {
    switch (type) {
      case 'function': return FunctionSquare
      case 'class': return Box
      case 'file': return FileCode
      case 'method': return FunctionSquare
      case 'interface': return Box
      default: return Hash
    }
  }

  const getIconColor = (type: string) => {
    switch (type) {
      case 'function': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
      case 'class': return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20'
      case 'interface': return 'text-red-600 bg-red-50 dark:bg-red-900/20'
      case 'file': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
      case 'method': return 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20'
      default: return 'text-slate-600 bg-slate-100 dark:bg-slate-800'
    }
  }

  const getTypeName = (type: string) => {
    const typeNames: Record<string, string> = {
      file: '文件',
      class: '类',
      function: '函数',
      method: '方法',
      variable: '变量',
      interface: '接口',
      enum: '枚举',
    }
    return typeNames[type] || type
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            搜索
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            在代码库中搜索实体和符号
          </p>
        </div>
      </div>

      {/* 搜索栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="搜索函数、类、变量... (例如: ref, reactive, createApp)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-4 text-lg rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            提示：支持模糊搜索，可以搜索函数名、类名、文件路径等
          </p>
        </CardContent>
      </Card>

      {/* 过滤标签 */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((filter) => {
          const Icon = filter.icon
          return (
            <Button
              key={filter.id}
              variant={activeFilter === filter.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter(filter.id)}
              className="transition-all"
            >
              <Icon className="h-4 w-4 mr-2" />
              {filter.label}
            </Button>
          )
        })}
      </div>

      {/* 搜索结果 */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="text-slate-600 dark:text-slate-300">搜索中...</span>
              </div>
            </CardContent>
          </Card>
        ) : hasSearched ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {results.length > 0 ? (
                  <>找到 <strong className="text-blue-600">{results.length}</strong> 个结果</>
                ) : (
                  <>未找到相关结果</>
                )}
              </p>
            </div>

            {results.length > 0 ? (
              <div className="grid gap-4">
                {results.map((result, index) => {
                  const Icon = getIconByType(result.type)
                  return (
                    <Card 
                      key={result.id || index} 
                      className="hover:shadow-md transition-all hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer"
                      onClick={() => navigate(`/entity/${result.id}`)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl ${getIconColor(result.type)} flex-shrink-0`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h3 className="font-semibold text-slate-900 dark:text-white">
                                {result.name}
                              </h3>
                              <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {getTypeName(result.type)}
                              </span>
                              {result.score && (
                                <span className="text-xs px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                                  相似度: {result.score.toFixed(2)}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
                              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">
                                {result.path}
                              </span>
                              {result.line && (
                                <span className="text-xs">行 {result.line}</span>
                              )}
                            </p>
                            {result.snippet && (
                              <p className="text-sm bg-slate-50 dark:bg-slate-800 p-3 rounded-lg font-mono text-slate-700 dark:text-slate-300 overflow-x-auto">
                                {result.snippet}
                              </p>
                            )}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="flex-shrink-0"
                            onClick={() => navigate(`/entity/${result.id}`)}
                          >
                            查看详情
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500 dark:text-slate-400 mb-2">
                    未找到与 "<strong>{query}</strong>" 相关的结果
                  </p>
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    请尝试其他关键词或调整筛选条件
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500 dark:text-slate-400">
                输入关键词开始搜索
              </p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
                支持函数、类、变量、接口等代码实体搜索
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 搜索提示 */}
      {!hasSearched && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">搜索示例</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['ref', 'reactive', 'createApp', 'Component'].map((keyword) => (
                <button
                  key={keyword}
                  onClick={() => setQuery(keyword)}
                  className="p-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors text-left"
                >
                  <code className="text-blue-600 dark:text-blue-400">{keyword}</code>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default SearchPage
