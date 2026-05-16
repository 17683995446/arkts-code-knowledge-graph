#!/usr/bin/env node
/**
 * 分析 Vue.js 真实项目
 */

import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js'
import chalk from 'chalk'
import fs from 'fs'
import path from 'path'

const VUE_PROJECT_PATH = './vue-core/packages'

console.log(chalk.bold.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🎯 ArkTS 知识图谱 - 分析 Vue.js 真实项目                      ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`))

async function main() {
  try {
    console.log(chalk.bold.yellow('📋 测试 1: 初始化知识图谱服务'))
    console.log(chalk.gray('正在创建服务实例...'))
    
    const service = new EnhancedCodeKnowledgeGraphService()
    await service.initialize()
    console.log(chalk.green('✅ 服务初始化成功\n'))
    
    console.log(chalk.bold.yellow('📋 测试 2: 分析 Vue.js 项目'))
    console.log(chalk.gray(`目标路径: ${VUE_PROJECT_PATH}`))
    console.log(chalk.gray('这将解析 450+ TypeScript 文件...'))
    
    const startTime = Date.now()
    const initialMemory = process.memoryUsage().heapUsed
    
    const result = await service.analyzeProject(VUE_PROJECT_PATH)
    
    const duration = Date.now() - startTime
    const finalMemory = process.memoryUsage().heapUsed
    const memoryUsedMB = (finalMemory - initialMemory) / 1024 / 1024
    
    console.log(chalk.green('✅ Vue.js 项目分析成功\n'))
    
    console.log(chalk.bold.blue('📊 分析结果统计:'))
    const stats = result.knowledgeGraph.getStatistics()
    
    console.log(`   - 总节点数: ${chalk.yellow(stats.totalEntityCount)}`)
    console.log(`   - 总关系数: ${chalk.yellow(stats.totalRelationCount)}`)
    console.log(`   - 文件节点: ${chalk.cyan(stats.fileEntityCount)}`)
    console.log(`   - 类节点: ${chalk.magenta(stats.classEntityCount)}`)
    console.log(`   - 函数节点: ${chalk.blue(stats.functionEntityCount)}`)
    console.log(`   - 接口节点: ${chalk.red(stats.entityCountByType?.['interface'] || 0)}`)
    console.log(`   - 变量节点: ${chalk.yellow(stats.entityCountByType?.['variable'] || 0)}`)
    console.log(`   - 方法节点: ${chalk.purple(stats.entityCountByType?.['method'] || 0)}`)
    console.log(`   - 解析耗时: ${chalk.green(`${duration}ms`)}`)
    console.log(`   - 内存使用: ${chalk.magenta(`${memoryUsedMB.toFixed(2)}MB`)}`)
    
    console.log(chalk.gray('\n节点类型分布:'))
    Object.entries(stats.entityCountByType || {}).forEach(([type, count]) => {
      if (count > 0) {
        console.log(`   - ${type}: ${count}`)
      }
    })
    
    console.log(chalk.bold.yellow('\n📋 测试 3: 查询引擎功能验证'))
    const queryEngine = result.queryEngine
    
    console.log(chalk.gray('\n搜索与 Vue 相关的函数...'))
    const searchResults = queryEngine.searchEntitiesByName('ref')
    console.log(`找到 ${chalk.yellow(searchResults.length)} 个相关结果:`)
    searchResults.slice(0, 5).forEach(res => {
      const name = 'functionName' in res.entityData ? (res.entityData as any).functionName :
                   'className' in res.entityData ? (res.entityData as any).className :
                   'entityName' in res.entityData ? (res.entityData as any).entityName : 'Unnamed'
      console.log(`   - [${res.entityData.type}] ${name}`)
    })
    
    console.log(chalk.bold.yellow('\n📋 测试 4: 语义向量搜索'))
    const semanticSearch = service.getSemanticSearch()
    
    console.log(chalk.gray('\n语义搜索 "reactive" 相关的实体...'))
    const semanticResults = await semanticSearch.searchEntities('reactive', 5)
    console.log(`找到 ${chalk.yellow(semanticResults.length)} 个语义相似结果:`)
    semanticResults.forEach((res, idx) => {
      const name = 'fileName' in res.entityData ? (res.entityData as any).fileName :
                   'className' in res.entityData ? (res.entityData as any).className :
                   'functionName' in res.entityData ? (res.entityData as any).functionName :
                   'entityName' in res.entityData ? (res.entityData as any).entityName : 'Unnamed'
      console.log(`   ${idx + 1}. [${res.entityData.type}] ${name} (相似度: ${res.relevanceScore.toFixed(3)})`)
    })
    
    console.log(chalk.bold.green('\n═══════════════════════════════════════════════════════════'))
    console.log(chalk.bold.green('🎉 所有系统测试通过！Vue.js 项目分析成功'))
    console.log(chalk.bold.green('═══════════════════════════════════════════════════════════\n'))
    
    // 保存结果到文件
    const outputPath = path.join(process.cwd(), '.arkts-code-graph', 'vue-analysis-result.json')
    const saveData = {
      project: 'vue-core',
      timestamp: new Date().toISOString(),
      stats,
      entities: searchResults.slice(0, 20).map(r => ({
        id: r.entityId,
        type: r.entityData.type
      }))
    }
    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    fs.writeFileSync(outputPath, JSON.stringify(saveData, null, 2))
    
    console.log(chalk.gray(`分析结果已保存到: ${outputPath}`))
    
  } catch (error) {
    console.error(chalk.red('❌ Vue.js 项目分析失败:'), error)
    process.exit(1)
  }
}

main()
