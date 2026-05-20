# 系统问题诊断报告

## 发现时间
2026-05-17

## 问题汇总

### 1. API属性名不匹配 (严重)
**问题描述**: `KnowledgeGraphDatabase.getStatistics()` 返回的属性名与测试期望不一致
- 实际返回: `totalEntityCount`, `totalRelationCount`
- 期望使用: `nodeCount`, `edgeCount`

**影响范围**: 所有使用统计信息的地方

**修复方案**: 在 `EnhancedCodeKnowledgeGraphService` 中添加兼容方法

### 2. 语义搜索初始化失败 (严重)
**问题描述**: 并发分析时出现大量 "Failed to clear semantic vector search index" 错误
```
{"level":40,"time":1778995348166,"msg":"Failed to clear semantic vector search index"}
{"level":40,"time":1778995348167,"msg":"Failed to add entity to semantic vector index"}
```

**根本原因**: 
- `vectra` 的 `LocalIndex` 在并发场景下存在资源竞争
- 索引目录被多个实例同时访问

**影响范围**: 语义搜索功能在并发场景下不可用

### 3. 性能瓶颈 - 语义索引构建 (高)
**问题描述**: 语义索引构建耗时过长
```
分析91个文件: ~5秒
语义索引构建: ~39秒 (79%)
总计: ~44秒
```

**根本原因**: TF-IDF 向量化对每个实体都进行复杂的文本处理和向量计算

**优化建议**:
1. 实现批量向量化
2. 添加索引缓存机制
3. 使用 Web Worker 进行后台处理

### 4. 类型不匹配 (中)
**问题描述**: `getStatistics()` 返回的类型定义不一致
- 类型定义: `entityCountByType: Record<CodeEntityType, number>`
- 实际返回: `entityCountByType: Record<string, number>`

**影响范围**: TypeScript 类型检查

### 5. 并发服务实例内存泄漏 (中)
**问题描述**: 多次创建 `EnhancedCodeKnowledgeGraphService` 实例导致内存增长
```
迭代0: heap=372.97MB
迭代3: heap=390.03MB
增长: ~17MB / 3次迭代
```

**根本原因**: 
- 每个实例创建独立的向量索引
- 索引目录未正确清理

### 6. 测试脚本API调用错误
**问题描述**: 测试脚本使用了不存在的API方法
- `service.queryEntities()` - 不存在
- `service.buildKnowledgeGraph()` - 不存在
- `service.getQueryEngine().query()` - 不存在
- `service.getSemanticSearch().search()` - 不存在

**实际存在的API**:
- `service.analyzeProject()`
- `service.getQueryEngine().getEntitiesByType()`
- `service.getQueryEngine().searchEntitiesByName()`
- `service.getSemanticSearch().searchEntities()`

## 性能数据

### 项目分析性能
| 指标 | 数值 |
|------|------|
| 文件数 | 91 |
| 实体数 | 1306 |
| 关系数 | 2059 |
| 解析时间 | ~5秒 |
| 索引构建 | ~39秒 |
| 总时间 | ~44秒 |
| 内存使用 | ~372MB |

### 内存压力测试
| 迭代 | 堆内存 |
|------|--------|
| 0 | 372.97MB |
| 3 | 390.03MB |
| 增长 | 17.06MB |

## 修复优先级

1. **P0 (紧急)**: 修复测试脚本API调用
2. **P0 (紧急)**: 添加统计信息兼容属性
3. **P1 (高)**: 优化语义搜索初始化和索引构建
4. **P2 (中)**: 修复类型定义
5. **P3 (低)**: 添加内存管理优化

## 验证方法

修复后应验证:
1. 所有测试脚本能够正确调用API
2. 并发场景下无索引冲突
3. 内存增长在可控范围内
4. 类型检查通过
