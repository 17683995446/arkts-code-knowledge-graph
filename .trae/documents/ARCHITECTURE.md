# ArkTS 代码知识图谱系统 - 可视化网站技术架构

## 1. 技术栈

### 前端框架
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Tailwind CSS** - 样式框架

### 可视化库
- **D3.js** - 数据可视化
- **Mermaid.js** - 流程图/时序图
- **React Flow** - 节点图可视化

### 状态管理
- **Zustand** - 轻量级状态管理
- **React Query** - 服务端状态

## 2. 项目结构

```
visualizer/
├── src/
│   ├── components/          # React 组件
│   │   ├── common/         # 通用组件
│   │   ├── charts/        # 图表组件
│   │   ├── layout/        # 布局组件
│   │   └── navigation/     # 导航组件
│   ├── pages/             # 页面组件
│   ├── hooks/             # 自定义 Hooks
│   ├── utils/             # 工具函数
│   ├── data/              # 静态数据
│   ├── styles/            # 全局样式
│   ├── App.tsx            # 根组件
│   └── main.tsx           # 入口文件
├── public/                # 静态资源
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 3. 核心功能实现

### 3.1 架构图
- 使用 D3.js 实现 SVG 绘制
- 分层展示架构
- 可交互操作（点击、悬停、缩放）

### 3.2 流程图
- 使用 Mermaid.js 渲染
- 自动从代码注释生成
- 支持动画效果

### 3.3 时序图
- Mermaid.js 时序图
- 展示系统调用流程
- 标注耗时信息

### 3.4 文件树
- 递归组件实现
- 图标区分文件类型
- 支持搜索和过滤

## 4. 数据更新机制

### 4.1 静态数据
- 硬编码的架构数据
- JSON 格式存储
- 定期手动更新

### 4.2 自动生成
- Node.js 脚本解析代码
- 生成架构 JSON
- 集成到 CI/CD

## 5. 页面路由

```
/                     # 概览页面
/architecture         # 架构图页面
/flow                # 流程图页面
/modules             # 模块详情页面
/tech-stack          # 技术栈页面
```

## 6. 组件清单

### 6.1 布局组件
- `TopNav` - 顶部导航
- `SideNav` - 侧边导航
- `PageContainer` - 页面容器

### 6.2 展示组件
- `ArchitectureGraph` - 架构图
- `FlowChart` - 流程图
- `SequenceDiagram` - 时序图
- `FileTree` - 文件树
- `MetricCard` - 指标卡片
- `TechBadge` - 技术徽章

### 6.3 交互组件
- `ZoomControls` - 缩放控制
- `SearchBar` - 搜索框
- `Tooltip` - 提示框
- `Modal` - 模态框

## 7. 性能优化

- 代码分割：按需加载页面
- 组件懒加载：减少首屏加载
- 缓存策略：数据缓存
- 虚拟列表：大文件树优化

## 8. 开发计划

### Day 1: 基础搭建
- 项目初始化
- 基础组件库
- 导航和布局

### Day 2-3: 核心功能
- 架构图展示
- 流程图展示
- 时序图展示

### Day 4: 完善优化
- 文件树组件
- 响应式适配
- 动画效果
