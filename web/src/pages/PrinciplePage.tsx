import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Network, Brain, GitBranch, Zap, Database, Search } from 'lucide-react'

const algorithms = [
  {
    id: 'ast-parsing',
    title: 'AST 解析算法',
    icon: Network,
    color: 'blue',
    description: '将 TypeScript/ArkTS 代码转换为抽象语法树',
    complexity: 'O(n)',
    details: [
      '词法分析 (Lexer): 将源代码转换为 Token 流',
      '语法分析 (Parser): 构建 AST 语法树结构',
      '语义分析: 提取类型信息、符号表',
      '关系分析: 识别 imports、calls、extends 等关系',
    ],
    code: `// Babel 解析示例
const ast = Babel.parse(sourceCode, {
  sourceType: 'module',
  plugins: ['typescript', 'decorators-legacy']
});

// 遍历 AST
Babel.traverse(ast, {
  ClassDeclaration(path) {
    const className = path.node.id.name;
    extractClassInfo(className, path);
  }
});`,
  },
  {
    id: 'graph-construction',
    title: '图谱构建算法',
    icon: GitBranch,
    color: 'purple',
    description: '将代码实体和关系构建为知识图谱',
    complexity: 'O(V + E)',
    details: [
      '节点创建: 为每个代码实体创建图节点',
      '边构建: 分析依赖关系创建有向边',
      '属性赋值: 添加类型、位置、文档等信息',
      '索引优化: 创建 B+ 树索引加速查询',
    ],
    code: `// Graphology 图构建
const graph = new Graph();

// 添加节点
graph.addNode('class:User', {
  type: 'Class',
  name: 'User',
  file: 'models/user.ts',
  line: 10
});

// 添加边
graph.addEdge('class:User', 'class:Model', {
  type: 'EXTENDS',
  label: 'extends'
});`,
  },
  {
    id: 'semantic-search',
    title: '语义搜索算法',
    icon: Brain,
    color: 'green',
    description: '基于向量相似度的语义搜索',
    complexity: 'O(k·d + n·d)',
    details: [
      '文本向量化: TF-IDF / Word2Vec / BERT',
      '相似度计算: 余弦相似度、欧氏距离',
      '排序算法: 基于得分的相关性排序',
      '过滤优化: 先精确匹配再向量搜索',
    ],
    code: `// TF-IDF 语义搜索
const tfidf = new TFIDF(corpus);

// 搜索查询向量化
const queryVector = tfidf.transform([query]);

// 计算相似度
const scores = documents.map(doc => ({
  doc,
  score: cosineSimilarity(queryVector, doc.vector)
})).sort((a, b) => b.score - a.score);

// 返回 Top-K 结果
return topK(scores, k);`,
  },
  {
    id: 'community-detection',
    title: '社区检测算法',
    icon: Database,
    color: 'amber',
    description: '使用 Louvain 算法检测代码模块社区',
    complexity: 'O(n·log(n))',
    details: [
      '模块初始化: 每个节点为独立模块',
      '贪心优化: 移动节点提升模块度',
      '模块合并: 合并小模块构建层级',
      '终止判断: 模块度达到局部最优',
    ],
    code: `// Louvain 社区检测
import louvain from 'graphology-communities';

const communities = louvain(graph, {
  resolution: 1.0,
  randomWalk: false
});

// 社区可视化
communities.forEach((community, node) => {
  const color = getCommunityColor(community);
  highlightCommunity(node, color);
});`,
  },
  {
    id: 'query-optimization',
    title: '查询优化算法',
    icon: Zap,
    color: 'red',
    description: '多路径并行查询与结果合并',
    complexity: 'O(b^d)',
    details: [
      '路径规划: BFS/DFS 多层级遍历',
      '并行执行: Promise.all 并发查询',
      '结果缓存: LRU 缓存热点查询',
      '剪枝策略: 跳过无效分支',
    ],
    code: `// 并行查询优化
async function parallelQuery(graph, startNodes) {
  const promises = startNodes.map(node =>
    breadthFirstSearch(graph, node)
  );
  
  const results = await Promise.all(promises);
  return mergeResults(results);
}

// 结果合并去重
function mergeResults(results) {
  const seen = new Set();
  return results
    .flat()
    .filter(result => {
      if (seen.has(result.id)) return false;
      seen.add(result.id);
      return true;
    });
}`,
  },
  {
    id: 'pattern-matching',
    title: '模式匹配算法',
    icon: Search,
    color: 'cyan',
    description: '基于图模式的代码结构识别',
    complexity: 'O(n^m)',
    details: [
      '模式定义: 使用 DSL 描述代码模式',
      '子图匹配: VF2/Ullmann 算法',
      '结果验证: 类型系统和语义检查',
      '批量处理: 批量模式识别',
    ],
    code: `// 图模式匹配
const pattern = {
  nodes: [
    { type: 'Class', name: '?A' },
    { type: 'Method', name: '?M' }
  ],
  edges: [
    { from: 0, to: 1, type: 'HAS_METHOD' }
  ]
};

const matches = graph.matchPattern(pattern);

// 匹配结果绑定
matches.forEach(match => {
  console.log(\`Class: \${match.A}, Method: \${match.M}\`);
});`,
  },
]

const colorMap: Record<string, string> = {
  blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
  purple: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
  green: 'text-green-600 bg-green-50 dark:bg-green-900/20',
  amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
  red: 'text-red-600 bg-red-50 dark:bg-red-900/20',
  cyan: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20',
}

const PrinciplePage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            核心算法原理
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            深入了解 ArkTS 知识图谱系统的核心算法实现
          </p>
        </div>
      </div>

      {/* 算法卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {algorithms.map((algo) => {
          const Icon = algo.icon
          const colorClass = colorMap[algo.color]
          return (
            <Card key={algo.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-mono px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">
                    {algo.complexity}
                  </span>
                </div>
                <CardTitle className="text-base mt-2">{algo.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                  {algo.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 详细算法说明 */}
      <div className="space-y-6">
        {algorithms.map((algo) => {
          const Icon = algo.icon
          const colorClass = colorMap[algo.color]
          return (
            <Card key={algo.id} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${colorClass}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>{algo.title}</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">{algo.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 算法步骤 */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                      算法步骤
                    </h4>
                    <ol className="space-y-2">
                      {algo.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                            {idx + 1}
                          </span>
                          <span className="text-sm text-slate-600 dark:text-slate-300">
                            {detail}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* 代码示例 */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                      代码示例
                    </h4>
                    <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto">
                      <code>{algo.code}</code>
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 性能对比表 */}
      <Card>
        <CardHeader>
          <CardTitle>算法性能对比</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    算法
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    时间复杂度
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    空间复杂度
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    适用场景
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">AST 解析</td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">O(n)</td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">O(n)</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">所有文件</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">图谱构建</td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">O(V+E)</td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">O(V+E)</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">实体关系</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">语义搜索</td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">O(k·d)</td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">O(n·d)</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">自然语言查询</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">社区检测</td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">O(n·log n)</td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">O(n)</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">模块划分</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PrinciplePage
