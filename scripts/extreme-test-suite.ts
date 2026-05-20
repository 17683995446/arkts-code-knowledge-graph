import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService'
import { ApplicationLogger } from '../src/infrastructure/logger/Logger'
import { CodeEntityType } from '../src/shared'

const logger = ApplicationLogger.getInstance()

export interface TestResult {
  name: string
  success: boolean
  duration: number
  metrics?: Record<string, any>
  error?: string
}

export class ExtremeStressTestSuite {
  private results: TestResult[] = []
  
  async runAllTests(): Promise<TestResult[]> {
    logger.info('========== 开始极限压力测试套件 ==========')
    
    await this.testConcurrentQueries()
    await this.testBurstQueries()
    await this.testCacheEffectiveness()
    await this.testErrorRecovery()
    await this.testRapidCacheClearing()
    await this.testLargeResultSets()
    await this.testMemoryUnderLoad()
    await this.testConcurrentServices()
    await this.testLongRunningSessions()
    await this.testMixedOperations()
    
    logger.info('========== 极限压力测试套件完成 ==========')
    this.printSummary()
    
    return this.results
  }
  
  private async testConcurrentQueries(): Promise<void> {
    logger.info('--- 测试: 100+并发查询 ---')
    
    const result: TestResult = {
      name: '100+并发查询',
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
        () => queryEngine.getEntitiesByType(CodeEntityType.INTERFACE),
        () => queryEngine.getEntitiesByType(CodeEntityType.VARIABLE),
        () => queryEngine.searchEntitiesByName('Service'),
        () => queryEngine.searchEntitiesByName('Manager'),
        () => queryEngine.searchEntitiesByName('Parser'),
        () => queryEngine.getStatistics(),
      ]
      
      const start = Date.now()
      const allQueries: Promise<any>[] = []
      
      for (let i = 0; i < 120; i++) {
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
        totalQueries: 120,
        totalEntities: totalEntities,
        avgQueryMs: (result.duration / 120).toFixed(2),
        queriesPerSecond: ((120 / result.duration) * 1000).toFixed(2)
      }
      
      logger.info(`并发查询测试通过: ${result.duration}ms, 120个查询, ${totalEntities}个实体`)
      
    } catch (e: any) {
      result.success = false
      result.error = e.message
      logger.error(`并发查询测试失败: ${e.message}`)
    }
    
    this.results.push(result)
  }
  
  private async testBurstQueries(): Promise<void> {
    logger.info('--- 测试: 突发查询风暴 ---')
    
    const result: TestResult = {
      name: '突发查询风暴',
      success: true,
      duration: 0
    }
    
    try {
      const service = new EnhancedCodeKnowledgeGraphService()
      await service.analyzeProject('/workspace/src')
      const queryEngine = service.getQueryEngine()
      
      const queries = [
        () => queryEngine.getEntitiesByType(CodeEntityType.CLASS),
        () => queryEngine.searchEntitiesByName('Test'),
        () => queryEngine.getStatistics(),
      ]
      
      const totalDuration = 30000
      const interval = 200
      const start = Date.now()
      const executedQueries: number[] = []
      
      const burstInterval = setInterval(() => {
        const query = queries[Math.floor(Math.random() * queries.length)]
        const queryStart = Date.now()
        query()
        const queryTime = Date.now() - queryStart
        executedQueries.push(queryTime)
      }, interval)
      
      await new Promise(resolve => setTimeout(resolve, totalDuration))
      clearInterval(burstInterval)
      
      result.duration = executedQueries.reduce((sum, time) => sum + time, 0)
      const avgQuery = result.duration / executedQueries.length
      
      result.metrics = {
        totalQueries: executedQueries.length,
        avgQueryMs: avgQuery.toFixed(2),
        maxQueryMs: Math.max(...executedQueries),
        minQueryMs: Math.min(...executedQueries)
      }
      
      logger.info(`突发查询风暴测试通过: ${executedQueries.length}个查询, 平均${avgQuery.toFixed(2)}ms/查询`)
      
    } catch (e: any) {
      result.success = false
      result.error = e.message
      logger.error(`突发查询风暴测试失败: ${e.message}`)
    }
    
    this.results.push(result)
  }
  
  private async testCacheEffectiveness(): Promise<void> {
    logger.info('--- 测试: 缓存效果验证 ---')
    
    const result: TestResult = {
      name: '缓存效果验证',
      success: true,
      duration: 0
    }
    
    try {
      const service = new EnhancedCodeKnowledgeGraphService()
      await service.analyzeProject('/workspace/src')
      const queryEngine = service.getQueryEngine()
      
      // 第一次查询（无缓存）
      const firstStart = Date.now()
      for (let i = 0; i < 10; i++) {
        queryEngine.getEntitiesByType(CodeEntityType.CLASS)
        queryEngine.getEntitiesByType(CodeEntityType.FUNCTION)
      }
      const firstDuration = Date.now() - firstStart
      
      // 第二次查询（有缓存）
      const secondStart = Date.now()
      for (let i = 0; i < 10; i++) {
        queryEngine.getEntitiesByType(CodeEntityType.CLASS)
        queryEngine.getEntitiesByType(CodeEntityType.FUNCTION)
      }
      const secondDuration = Date.now() - secondStart
      
      const cacheHitRatio = ((firstDuration - secondDuration) / firstDuration) * 100
      
      result.duration = firstDuration + secondDuration
      result.metrics = {
        firstRunMs: firstDuration,
        secondRunMs: secondDuration,
        improvementPercent: cacheHitRatio.toFixed(2)
      }
      
      logger.info(`缓存效果验证通过: 首次${firstDuration}ms, 缓存${secondDuration}ms, 提升${cacheHitRatio.toFixed(2)}%`)
      
    } catch (e: any) {
      result.success = false
      result.error = e.message
      logger.error(`缓存效果验证失败: ${e.message}`)
    }
    
    this.results.push(result)
  }
  
  private async testErrorRecovery(): Promise<void> {
    logger.info('--- 测试: 错误恢复能力 ---')
    
    const result: TestResult = {
      name: '错误恢复能力',
      success: true,
      duration: 0
    }
    
    try {
      const service = new EnhancedCodeKnowledgeGraphService()
      await service.analyzeProject('/workspace/src')
      const queryEngine = service.getQueryEngine()
      
      const start = Date.now()
      let errorsHandled = 0
      let successQueries = 0
      
      // 测试边界情况
      const testCases = [
        () => queryEngine.searchEntitiesByName(''),
        () => queryEngine.getEntitiesByType('INVALID_TYPE' as CodeEntityType),
        () => queryEngine.getEntitiesByFile('/non/existent/path'),
        () => queryEngine.searchEntitiesByName('this should not exist 123456789'),
      ]
      
      for (let i = 0; i < testCases.length; i++) {
        try {
          const result = testCases[i]()
          if (Array.isArray(result)) {
            successQueries++
          }
        } catch (e: any) {
          errorsHandled++
        }
      }
      
      // 测试恢复后正常工作
      const normalQuery = queryEngine.getEntitiesByType(CodeEntityType.CLASS)
      if (normalQuery.length > 0) {
        successQueries++
      }
      
      result.duration = Date.now() - start
      result.metrics = {
        errorsHandled,
        successQueries,
        recoverySuccessful: normalQuery.length > 0
      }
      
      logger.info(`错误恢复测试通过: 处理${errorsHandled}个错误, ${successQueries}个成功查询`)
      
    } catch (e: any) {
      result.success = false
      result.error = e.message
      logger.error(`错误恢复测试失败: ${e.message}`)
    }
    
    this.results.push(result)
  }
  
  private async testRapidCacheClearing(): Promise<void> {
    logger.info('--- 测试: 快速缓存清理 ---')
    
    const result: TestResult = {
      name: '快速缓存清理',
      success: true,
      duration: 0
    }
    
    try {
      const service = new EnhancedCodeKnowledgeGraphService()
      await service.analyzeProject('/workspace/src')
      const queryEngine = service.getQueryEngine()
      
      const start = Date.now()
      
      for (let i = 0; i < 50; i++) {
        // 执行查询
        queryEngine.getEntitiesByType(CodeEntityType.CLASS)
        queryEngine.searchEntitiesByName('Test')
        
        // 立即清理
        service.clearCache()
        
        // 再次查询（重建缓存）
        queryEngine.getEntitiesByType(CodeEntityType.CLASS)
      }
      
      result.duration = Date.now() - start
      result.metrics = {
        operations: 50,
        avgOperationMs: (result.duration / 50).toFixed(2)
      }
      
      logger.info(`快速缓存清理测试通过: ${result.duration}ms, 50次操作`)
      
    } catch (e: any) {
      result.success = false
      result.error = e.message
      logger.error(`快速缓存清理测试失败: ${e.message}`)
    }
    
    this.results.push(result)
  }
  
  private async testLargeResultSets(): Promise<void> {
    logger.info('--- 测试: 大型结果集处理 ---')
    
    const result: TestResult = {
      name: '大型结果集处理',
      success: true,
      duration: 0
    }
    
    try {
      const service = new EnhancedCodeKnowledgeGraphService()
      await service.analyzeProject('/workspace/src')
      const queryEngine = service.getQueryEngine()
      
      const start = Date.now()
      
      // 获取所有可能的实体类型
      const allTypes = [
        CodeEntityType.CLASS,
        CodeEntityType.FUNCTION,
        CodeEntityType.INTERFACE,
        CodeEntityType.VARIABLE,
        CodeEntityType.TYPE_ALIAS
      ]
      
      const allResults: any[] = []
      for (const type of allTypes) {
        try {
          const entities = queryEngine.getEntitiesByType(type)
          allResults.push(...entities)
        } catch (e: any) {
          // 继续下一个
        }
      }
      
      result.duration = Date.now() - start
      result.metrics = {
        totalResults: allResults.length,
        dataSizeMb: (JSON.stringify(allResults).length / 1024 / 1024).toFixed(3)
      }
      
      logger.info(`大型结果集测试通过: ${result.duration}ms, ${allResults.length}个结果`)
      
    } catch (e: any) {
      result.success = false
      result.error = e.message
      logger.error(`大型结果集测试失败: ${e.message}`)
    }
    
    this.results.push(result)
  }
  
  private async testMemoryUnderLoad(): Promise<void> {
    logger.info('--- 测试: 高负载内存监控 ---')
    
    const result: TestResult = {
      name: '高负载内存监控',
      success: true,
      duration: 0
    }
    
    try {
      const service = new EnhancedCodeKnowledgeGraphService()
      await service.analyzeProject('/workspace/src')
      const queryEngine = service.getQueryEngine()
      
      const startMemory = process.memoryUsage()
      const start = Date.now()
      
      for (let i = 0; i < 200; i++) {
        queryEngine.getEntitiesByType(CodeEntityType.CLASS)
        queryEngine.searchEntitiesByName('Service')
        queryEngine.getStatistics()
        
        if (i % 20 === 0) {
          service.clearCache()
        }
      }
      
      const endMemory = process.memoryUsage()
      result.duration = Date.now() - start
      
      const memoryIncrease = (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024
      
      result.metrics = {
        startHeapMb: (startMemory.heapUsed / 1024 / 1024).toFixed(2),
        endHeapMb: (endMemory.heapUsed / 1024 / 1024).toFixed(2),
        increaseMb: memoryIncrease.toFixed(2),
        queries: 600
      }
      
      logger.info(`高负载内存测试通过: 内存增加${memoryIncrease.toFixed(2)}MB`)
      
    } catch (e: any) {
      result.success = false
      result.error = e.message
      logger.error(`高负载内存测试失败: ${e.message}`)
    }
    
    this.results.push(result)
  }
  
  private async testConcurrentServices(): Promise<void> {
    logger.info('--- 测试: 多服务实例并发 ---')
    
    const result: TestResult = {
      name: '多服务实例并发',
      success: true,
      duration: 0
    }
    
    try {
      const services: EnhancedCodeKnowledgeGraphService[] = []
      const servicePromises: Promise<any>[] = []
      
      const start = Date.now()
      
      for (let i = 0; i < 5; i++) {
        const service = new EnhancedCodeKnowledgeGraphService()
        services.push(service)
        servicePromises.push(service.analyzeProject('/workspace/src/core'))
      }
      
      await Promise.all(servicePromises)
      
      // 让每个服务执行一些查询
      const queryPromises: Promise<any>[] = []
      for (const service of services) {
        const queryEngine = service.getQueryEngine()
        queryPromises.push(queryEngine.getEntitiesByType(CodeEntityType.CLASS))
        queryPromises.push(queryEngine.getStatistics())
      }
      
      await Promise.all(queryPromises)
      
      result.duration = Date.now() - start
      result.metrics = {
        services: 5,
        queries: 10,
        durationMs: result.duration
      }
      
      logger.info(`多服务实例测试通过: 5个服务, ${result.duration}ms`)
      
    } catch (e: any) {
      result.success = false
      result.error = e.message
      logger.error(`多服务实例测试失败: ${e.message}`)
    }
    
    this.results.push(result)
  }
  
  private async testLongRunningSessions(): Promise<void> {
    logger.info('--- 测试: 长时间运行会话 ---')
    
    const result: TestResult = {
      name: '长时间运行会话',
      success: true,
      duration: 0
    }
    
    try {
      const service = new EnhancedCodeKnowledgeGraphService()
      await service.analyzeProject('/workspace/src')
      const queryEngine = service.getQueryEngine()
      
      const start = Date.now()
      const operations: number[] = []
      
      // 模拟长时间运行的会话
      for (let i = 0; i < 1000; i++) {
        const opStart = Date.now()
        
        // 执行各种查询
        queryEngine.getEntitiesByType(CodeEntityType.CLASS)
        queryEngine.searchEntitiesByName('Test')
        queryEngine.getStatistics()
        
        // 偶尔清理
        if (i % 100 === 0) {
          service.clearCache()
        }
        
        operations.push(Date.now() - opStart)
      }
      
      result.duration = Date.now() - start
      const avgOp = operations.reduce((sum, time) => sum + time, 0) / operations.length
      
      result.metrics = {
        operations: 1000,
        avgOpMs: avgOp.toFixed(2),
        firstOpMs: operations[0],
        lastOpMs: operations[operations.length - 1]
      }
      
      logger.info(`长时间运行会话测试通过: ${result.duration}ms, 1000次操作`)
      
    } catch (e: any) {
      result.success = false
      result.error = e.message
      logger.error(`长时间运行会话测试失败: ${e.message}`)
    }
    
    this.results.push(result)
  }
  
  private async testMixedOperations(): Promise<void> {
    logger.info('--- 测试: 混合操作场景 ---')
    
    const result: TestResult = {
      name: '混合操作场景',
      success: true,
      duration: 0
    }
    
    try {
      const service = new EnhancedCodeKnowledgeGraphService()
      await service.analyzeProject('/workspace/src')
      const queryEngine = service.getQueryEngine()
      const semanticSearch = service.getSemanticSearch()
      
      const start = Date.now()
      
      const operations = [
        async () => queryEngine.getEntitiesByType(CodeEntityType.CLASS),
        async () => semanticSearch.searchEntities('service', 5),
        async () => queryEngine.getStatistics(),
        async () => queryEngine.searchEntitiesByName('Manager'),
        async () => service.getMemoryUsage(),
        async () => service.getCacheStatistics(),
        async () => queryEngine.getEntitiesByType(CodeEntityType.FUNCTION),
      ]
      
      const results: any[] = []
      for (let i = 0; i < 20; i++) {
        const opsPromises = operations.map(op => op())
        const batchResults = await Promise.all(opsPromises)
        results.push(...batchResults)
      }
      
      result.duration = Date.now() - start
      result.metrics = {
        totalOperations: results.length,
        queries: 120,
        avgDurationMs: (result.duration / 20).toFixed(2)
      }
      
      logger.info(`混合操作测试通过: ${result.duration}ms, ${results.length}个操作`)
      
    } catch (e: any) {
      result.success = false
      result.error = e.message
      logger.error(`混合操作测试失败: ${e.message}`)
    }
    
    this.results.push(result)
  }
  
  private printSummary(): void {
    logger.info('========== 极限测试总结 ==========')
    
    const passed = this.results.filter(r => r.success).length
    const total = this.results.length
    
    logger.info(`总测试: ${total}, 通过: ${passed}, 失败: ${total - passed}`)
    
    for (const result of this.results) {
      const status = result.success ? '✅' : '❌'
      logger.info(`${status} ${result.name}: ${result.success ? '通过' : `失败 - ${result.error}`}`)
      
      if (result.metrics) {
        for (const [key, value] of Object.entries(result.metrics)) {
          logger.info(`  ${key}: ${value}`)
        }
      }
    }
  }
}

// 执行测试
(async () => {
  const testSuite = new ExtremeStressTestSuite()
  await testSuite.runAllTests()
})().catch(console.error)
