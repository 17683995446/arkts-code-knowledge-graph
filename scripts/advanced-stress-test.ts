import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService'
import { ApplicationLogger } from '../src/infrastructure/logger/Logger'
import { CodeEntityType } from '../src/shared'
import * as fs from 'fs'
import * as path from 'path'

const logger = ApplicationLogger.getInstance()

export interface AdvancedTestResult {
  name: string
  success: boolean
  duration: number
  metrics?: Record<string, any>
  issues?: string[]
  error?: string
}

export class AdvancedStressTest {
  private results: AdvancedTestResult[] = []
  private memorySnapshots: { timestamp: number; heapUsed: number }[] = []

  async runAllTests(): Promise<AdvancedTestResult[]> {
    logger.info('========== 开始高级极限压力测试 ==========')

    await this.testMemoryLeaks()
    await this.testThousandConcurrentQueries()
    await this.testErrorInjection()
    await this.testPerformanceRegression()
    await this.testLargeScaleAnalysis()
    await this.testRapidCreationDestruction()
    await this.testResourceExhaustion()
    await this.testComplexGraphTraversal()

    logger.info('========== 高级极限压力测试完成 ==========')
    this.printSummary()

    return this.results
  }

  private async testMemoryLeaks(): Promise<void> {
    logger.info('--- 测试: 内存泄漏检测 ---')

    const result: AdvancedTestResult = {
      name: '内存泄漏检测',
      success: true,
      duration: 0
    }

    try {
      const start = Date.now()
      const services: EnhancedCodeKnowledgeGraphService[] = []
      
      // 初始内存快照
      this.takeMemorySnapshot()

      // 循环创建和销毁服务
      for (let round = 0; round < 20; round++) {
        const service = new EnhancedCodeKnowledgeGraphService()
        await service.analyzeProject('/workspace/src/core')
        services.push(service)
        
        // 执行一些操作
        const queryEngine = service.getQueryEngine()
        queryEngine.getEntitiesByType(CodeEntityType.CLASS)
        queryEngine.searchEntitiesByName('Test')
        queryEngine.getStatistics()
        
        // 清理
        service.clearCache()
        service.resetAll()
        
        if (round % 5 === 0) {
          this.takeMemorySnapshot()
        }
      }
      
      // 最终内存快照
      this.takeMemorySnapshot()
      
      // 计算内存趋势
      const initialHeap = this.memorySnapshots[0].heapUsed
      const finalHeap = this.memorySnapshots[this.memorySnapshots.length - 1].heapUsed
      const growth = finalHeap - initialHeap
      const growthPercent = (growth / initialHeap) * 100
      
      result.duration = Date.now() - start
      result.metrics = {
        initialHeapMb: (initialHeap / 1024 / 1024).toFixed(2),
        finalHeapMb: (finalHeap / 1024 / 1024).toFixed(2),
        growthMb: (growth / 1024 / 1024).toFixed(2),
        growthPercent: growthPercent.toFixed(2),
        servicesCreated: 20
      }
      
      // 检查是否有内存泄漏
      if (growthPercent > 50) {
        result.issues = [`可能存在内存泄漏，内存增长${growthPercent.toFixed(2)}%`]
      }
      
      logger.info(`内存泄漏测试通过: ${result.duration}ms, 内存增长${growthPercent.toFixed(2)}%`)
      
    } catch (e: any) {
      result.success = false
      result.error = e.message
      logger.error(`内存泄漏测试失败: ${e.message}`)
    }

    this.results.push(result)
  }

  private async testThousandConcurrentQueries(): Promise<void> {
    logger.info('--- 测试: 1000+并发查询 ---')

    const result: AdvancedTestResult = {
      name: '1000+并发查询',
      success: true,
      duration: 0
    }

    try {
      const service = new EnhancedCodeKnowledgeGraphService()
      await service.analyzeProject('/workspace/src')
      const queryEngine = service.getQueryEngine()

      const queries = [
        () => queryEngine.getEntitiesByType(CodeEntityType.CLASS),
        () => queryEngine.getEntitiesByType(CodeEntityType.FUNCTION),
        () => queryEngine.searchEntitiesByName('Service'),
        () => queryEngine.getStatistics(),
        () => queryEngine.getEntitiesByType(CodeEntityType.INTERFACE),
        () => queryEngine.searchEntitiesByName('Manager'),
      ]

      const start = Date.now()
      const allQueries: Promise<any>[] = []

      // 1000并发请求
      for (let i = 0; i < 1000; i++) {
        const query = queries[i % queries.length]
        allQueries.push(query())
      }

      const allResults = await Promise.all(allQueries)
      result.duration = Date.now() - start

      let totalEntities = 0
      allResults.forEach((res: any) => {
        if (Array.isArray(res)) {
          totalEntities += res.length
        }
      })

      result.metrics = {
        totalQueries: 1000,
        totalEntities: totalEntities,
        avgQueryMs: (result.duration / 1000).toFixed(3),
        queriesPerSecond: ((1000 / result.duration) * 1000).toFixed(2),
        totalDuration: `${result.duration}ms`
      }

      logger.info(`1000并发查询测试通过: ${result.duration}ms, ${totalEntities}个实体`)

    } catch (e: any) {
      result.success = false
      result.error = e.message
      logger.error(`1000并发查询测试失败: ${e.message}`)
    }

    this.results.push(result)
  }

  private async testErrorInjection(): Promise<void> {
    logger.info('--- 测试: 错误注入与恢复 ---')

    const result: AdvancedTestResult = {
      name: '错误注入与恢复',
      success: true,
      duration: 0
    }

    try {
      const service = new EnhancedCodeKnowledgeGraphService()
      await service.analyzeProject('/workspace/src')
      const queryEngine = service.getQueryEngine()

      const start = Date.now()
      let successfulQueries = 0
      let errorsHandled = 0

      const errorScenarios = [
        () => {
          // 尝试访问无效的实体
          return queryEngine.getEntity('invalid_entity_id_12345')
        },
        () => {
          // 尝试用无效类型搜索
          return queryEngine.getEntitiesByType('' as CodeEntityType)
        },
        () => {
          // 超长搜索字符串
          const longStr = 'x'.repeat(5000)
          return queryEngine.searchEntitiesByName(longStr)
        },
        () => {
          // 特殊字符搜索
          return queryEngine.searchEntitiesByName('@#$%^&*()_+')
        },
      ]

      // 执行错误场景
      for (let i = 0; i < errorScenarios.length; i++) {
        try {
          const result = errorScenarios[i]()
          if (result !== undefined) {
            successfulQueries++
          }
        } catch (e: any) {
          errorsHandled++
        }
      }

      // 测试恢复 - 执行正常查询
      const normalQueryResult = queryEngine.getEntitiesByType(CodeEntityType.CLASS)
      if (normalQueryResult.length > 0) {
        successfulQueries++
      }

      result.duration = Date.now() - start
      result.metrics = {
        errorScenarios: errorScenarios.length,
        errorsHandled,
        successfulQueries,
        recoverySuccessful: normalQueryResult.length > 0
      }

      logger.info(`错误注入与恢复测试通过: ${result.duration}ms`)

    } catch (e: any) {
      result.success = false
      result.error = e.message
      logger.error(`错误注入与恢复测试失败: ${e.message}`)
    }

    this.results.push(result)
  }

  private async testPerformanceRegression(): Promise<void> {
    logger.info('--- 测试: 性能回归检查 ---')

    const result: AdvancedTestResult = {
      name: '性能回归检查',
      success: true,
      duration: 0
    }

    try {
      const service = new EnhancedCodeKnowledgeGraphService()
      await service.analyzeProject('/workspace/src')
      const queryEngine = service.getQueryEngine()

      const start = Date.now()
      const roundTimes: number[] = []

      // 多轮性能测试
      for (let round = 0; round < 20; round++) {
        const roundStart = Date.now()
        
        // 执行一系列查询
        for (let i = 0; i < 50; i++) {
          queryEngine.getEntitiesByType(CodeEntityType.CLASS)
          queryEngine.searchEntitiesByName('Test')
          queryEngine.getStatistics()
        }
        
        const roundDuration = Date.now() - roundStart
        roundTimes.push(roundDuration)
      }

      result.duration = Date.now() - start

      const avgTime = roundTimes.reduce((sum, time) => sum + time, 0) / roundTimes.length
      const maxTime = Math.max(...roundTimes)
      const minTime = Math.min(...roundTimes)
      const variance = roundTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / roundTimes.length
      const stdDev = Math.sqrt(variance)

      result.metrics = {
        rounds: 20,
        avgRoundMs: avgTime.toFixed(2),
        maxRoundMs: maxTime,
        minRoundMs: minTime,
        stdDevMs: stdDev.toFixed(2)
      }

      // 检查性能稳定性
      if (stdDev > avgTime * 0.5) {
        result.issues = ['性能波动较大']
      }

      logger.info(`性能回归测试通过: ${result.duration}ms, 标准差${stdDev.toFixed(2)}ms`)

    } catch (e: any) {
      result.success = false
      result.error = e.message
      logger.error(`性能回归测试失败: ${e.message}`)
    }

    this.results.push(result)
  }

  private async testLargeScaleAnalysis(): Promise<void> {
    logger.info('--- 测试: 大规模代码分析 ---')

    const result: AdvancedTestResult = {
      name: '大规模代码分析',
      success: true,
      duration: 0
    }

    try {
      const start = Date.now()
      const service = new EnhancedCodeKnowledgeGraphService()
      
      // 分析多个目录
      await service.analyzeProject('/workspace/src')
      
      const stats = service.getStatistics()

      result.duration = Date.now() - start
      result.metrics = {
        totalEntityCount: stats.totalEntityCount,
        totalRelationCount: stats.totalRelationCount,
        fileEntityCount: stats.fileEntityCount,
        duration: `${result.duration}ms`
      }

      logger.info(`大规模分析测试通过: ${result.duration}ms, ${stats.totalEntityCount}个实体`)

    } catch (e: any) {
      result.success = false
      result.error = e.message
      logger.error(`大规模分析测试失败: ${e.message}`)
    }

    this.results.push(result)
  }

  private async testRapidCreationDestruction(): Promise<void> {
    logger.info('--- 测试: 快速创建与销毁 ---')

    const result: AdvancedTestResult = {
      name: '快速创建与销毁',
      success: true,
      duration: 0
    }

    try {
      const start = Date.now()
      const durations: number[] = []

      for (let i = 0; i < 30; i++) {
        const createStart = Date.now()
        
        const service = new EnhancedCodeKnowledgeGraphService()
        await service.analyzeProject('/workspace/src/core')
        
        const queryEngine = service.getQueryEngine()
        queryEngine.getEntitiesByType(CodeEntityType.CLASS)
        
        service.clearCache()
        service.resetAll()
        
        const duration = Date.now() - createStart
        durations.push(duration)
      }

      result.duration = Date.now() - start
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length
      
      result.metrics = {
        iterations: 30,
        avgMs: avgDuration.toFixed(2),
        maxMs: Math.max(...durations),
        minMs: Math.min(...durations)
      }

      logger.info(`快速创建销毁测试通过: ${result.duration}ms, 平均${avgDuration.toFixed(2)}ms/次`)

    } catch (e: any) {
      result.success = false
      result.error = e.message
      logger.error(`快速创建销毁测试失败: ${e.message}`)
    }

    this.results.push(result)
  }

  private async testResourceExhaustion(): Promise<void> {
    logger.info('--- 测试: 资源耗尽模拟 ---')

    const result: AdvancedTestResult = {
      name: '资源耗尽模拟',
      success: true,
      duration: 0
    }

    try {
      const service = new EnhancedCodeKnowledgeGraphService()
      await service.analyzeProject('/workspace/src')
      const queryEngine = service.getQueryEngine()

      const start = Date.now()
      
      // 尝试使用大量内存
      const largeData: any[] = []
      
      // 生成大量查询结果
      const allTypes = [
        CodeEntityType.CLASS, CodeEntityType.FUNCTION, CodeEntityType.INTERFACE,
        CodeEntityType.VARIABLE, CodeEntityType.TYPE_ALIAS
      ]
      
      for (let i = 0; i < 500; i++) {
        const type = allTypes[i % allTypes.length]
        try {
          const entities = queryEngine.getEntitiesByType(type)
          // 深拷贝以增加内存压力
          largeData.push(JSON.parse(JSON.stringify(entities)))
        } catch (e: any) {
          // 继续
        }
      }
      
      // 清理
      largeData.length = 0

      result.duration = Date.now() - start
      result.metrics = {
        operations: 500,
        duration: `${result.duration}ms`
      }

      logger.info(`资源耗尽模拟测试通过: ${result.duration}ms`)

    } catch (e: any) {
      result.success = false
      result.error = e.message
      logger.error(`资源耗尽模拟测试失败: ${e.message}`)
    }

    this.results.push(result)
  }

  private async testComplexGraphTraversal(): Promise<void> {
    logger.info('--- 测试: 复杂图遍历 ---')

    const result: AdvancedTestResult = {
      name: '复杂图遍历',
      success: true,
      duration: 0
    }

    try {
      const service = new EnhancedCodeKnowledgeGraphService()
      await service.analyzeProject('/workspace/src')
      const queryEngine = service.getQueryEngine()

      const start = Date.now()
      
      // 获取一些类
      const classes = queryEngine.getEntitiesByType(CodeEntityType.CLASS)
      
      // 对每个类进行图遍历
      const traversalResults: any[] = []
      for (const cls of classes.slice(0, 20)) {
        try {
          const callChain = queryEngine.getCallChain(cls.entityId, 5)
          traversalResults.push(callChain)
        } catch (e: any) {
          // 继续
        }
      }
      
      result.duration = Date.now() - start
      
      let totalNodes = 0
      traversalResults.forEach(t => {
        if (t && t.path && Array.isArray(t.path)) {
          totalNodes += t.path.length
        }
      })

      result.metrics = {
        classesAnalyzed: Math.min(20, classes.length),
        totalNodes: totalNodes,
        avgNodesPerTraversal: totalNodes > 0 ? (totalNodes / traversalResults.length).toFixed(2) : 0
      }

      logger.info(`复杂图遍历测试通过: ${result.duration}ms, ${totalNodes}个节点`)

    } catch (e: any) {
      result.success = false
      result.error = e.message
      logger.error(`复杂图遍历测试失败: ${e.message}`)
    }

    this.results.push(result)
  }

  private takeMemorySnapshot(): void {
    const usage = process.memoryUsage()
    this.memorySnapshots.push({
      timestamp: Date.now(),
      heapUsed: usage.heapUsed
    })
  }

  private printSummary(): void {
    logger.info('========== 高级极限测试总结 ==========')

    const passed = this.results.filter(r => r.success).length
    const total = this.results.length
    const totalIssues = this.results.filter(r => r.issues && r.issues.length > 0).length

    logger.info(`总测试: ${total}, 通过: ${passed}, 有问题: ${totalIssues}`)

    for (const result of this.results) {
      const status = result.success ? '✅' : '❌'
      const issueStatus = result.issues && result.issues.length > 0 ? '⚠️' : ''
      logger.info(`${status}${issueStatus} ${result.name}: ${result.success ? '通过' : `失败 - ${result.error}`}`)

      if (result.metrics) {
        for (const [key, value] of Object.entries(result.metrics)) {
          logger.info(`  ${key}: ${value}`)
        }
      }

      if (result.issues && result.issues.length > 0) {
        logger.warn(`  问题: ${result.issues.join(', ')}`)
      }
    }
  }
}

// 执行测试
(async () => {
  const test = new AdvancedStressTest()
  await test.runAllTests()
})().catch(console.error)
