import * as path from 'path'
import * as fs from 'fs'
import { globSync } from 'glob'
import os from 'os'
import { applicationLogger } from '../../infrastructure/logger'
import { EnhancedTypeScriptCodeParser } from './EnhancedTypeScriptCodeParser'
import { CodeParsingResult, ApplicationConfiguration } from '../../shared'
import { SymbolTableManager } from '../symbol-table'

export class OptimizedProjectCodeParser {
  private config: ApplicationConfiguration
  private symbolTableManager: SymbolTableManager
  private readonly maxWorkers: number
  private readonly batchSize: number
  private readonly streamProcessing: boolean

  constructor(
    config: ApplicationConfiguration,
    symbolTableManager: SymbolTableManager,
    options: {
      maxWorkers?: number
      batchSize?: number
      streamProcessing?: boolean
    } = {}
  ) {
    this.config = config
    this.symbolTableManager = symbolTableManager
    this.maxWorkers = options.maxWorkers || Math.max(os.cpus().length - 1, 1)
    this.batchSize = options.batchSize || 50
    this.streamProcessing = options.streamProcessing ?? true
    applicationLogger.info(
      `OptimizedProjectCodeParser initialized with ${this.maxWorkers} workers, ` +
      `batch size ${this.batchSize}, streaming enabled: ${this.streamProcessing}`
    )
  }

  async parseProject(
    rootDirectory: string,
    onProgress?: (progress: {
      processed: number
      total: number
      entities: number
      relations: number
    }) => void
  ): Promise<CodeParsingResult> {
    applicationLogger.info(`Parsing project with optimized parser in: ${rootDirectory}`)
    const filePaths = this.getMatchingFiles(rootDirectory)
    applicationLogger.info(`Found ${filePaths.length} files to parse`)
    if (filePaths.length === 0) {
      return { codeEntities: [], codeRelations: [] }
    }
    const combinedResult: CodeParsingResult = {
      codeEntities: [],
      codeRelations: [],
    }
    if (filePaths.length < 100) {
      applicationLogger.debug('File count < 100, using sequential parsing')
      this.parseFilesSequentially(filePaths, combinedResult, onProgress)
    } else if (this.maxWorkers > 1) {
      applicationLogger.debug(`File count >= 100, using parallel parsing with ${this.maxWorkers} workers`)
      await this.parseFilesInParallel(filePaths, combinedResult, onProgress)
    } else {
      applicationLogger.debug('File count >= 100, using sequential parsing (single worker)')
      this.parseFilesSequentially(filePaths, combinedResult, onProgress)
    }
    applicationLogger.info(
      `Optimized project parsing complete. ` +
      `Entities: ${combinedResult.codeEntities.length}, ` +
      `Relations: ${combinedResult.codeRelations.length}`
    )
    return combinedResult
  }

  private parseFilesSequentially(
    filePaths: string[],
    result: CodeParsingResult,
    onProgress?: (progress: {
      processed: number
      total: number
      entities: number
      relations: number
    }) => void
  ): void {
    const parser = new EnhancedTypeScriptCodeParser(this.symbolTableManager)
    filePaths.forEach((filePath, index) => {
      try {
        const fileResult = this.parseSingleFile(filePath, parser)
        result.codeEntities.push(...fileResult.codeEntities)
        result.codeRelations.push(...fileResult.codeRelations)
        if (this.streamProcessing && index % this.batchSize === 0) {
          this.forceGarbageCollection()
        }
        if (onProgress) {
          onProgress({
            processed: index + 1,
            total: filePaths.length,
            entities: result.codeEntities.length,
            relations: result.codeRelations.length,
          })
        }
      } catch (error) {
        applicationLogger.warn(`Failed to parse file: ${filePath}`, error)
      }
    })
  }

  private async parseFilesInParallel(
    filePaths: string[],
    result: CodeParsingResult,
    onProgress?: (progress: {
      processed: number
      total: number
      entities: number
      relations: number
    }) => void
  ): Promise<void> {
    const chunks = this.chunkFiles(filePaths, this.maxWorkers)
    let processedCount = 0
    const promises = chunks.map(async (chunk, workerIndex) => {
      applicationLogger.debug(`Worker ${workerIndex}: processing ${chunk.length} files`)
      const parser = new EnhancedTypeScriptCodeParser(this.symbolTableManager)
      const chunkResult: CodeParsingResult = {
        codeEntities: [],
        codeRelations: [],
      }
      for (let i = 0; i < chunk.length; i++) {
        try {
          const fileResult = this.parseSingleFile(chunk[i], parser)
          chunkResult.codeEntities.push(...fileResult.codeEntities)
          chunkResult.codeRelations.push(...fileResult.codeRelations)
          if (this.streamProcessing && i % this.batchSize === 0) {
            this.forceGarbageCollection()
          }
        } catch (error) {
          applicationLogger.warn(`Failed to parse file: ${chunk[i]}`, error)
        }
        if (onProgress) {
          processedCount++
          onProgress({
            processed: processedCount,
            total: filePaths.length,
            entities: result.codeEntities.length + chunkResult.codeEntities.length,
            relations: result.codeRelations.length + chunkResult.codeRelations.length,
          })
        }
      }
      return chunkResult
    })
    const allChunkResults = await Promise.all(promises)
    for (const chunkResult of allChunkResults) {
      result.codeEntities.push(...chunkResult.codeEntities)
      result.codeRelations.push(...chunkResult.codeRelations)
    }
  }

  private chunkFiles(filePaths: string[], chunkCount: number): string[][] {
    const chunks: string[][] = Array.from({ length: chunkCount }, () => [])
    filePaths.forEach((filePath, index) => {
      chunks[index % chunkCount].push(filePath)
    })
    return chunks.filter(chunk => chunk.length > 0)
  }

  private parseSingleFile(filePath: string, parser: EnhancedTypeScriptCodeParser): CodeParsingResult {
    const ext = path.extname(filePath).toLowerCase()
    if (['.ts', '.tsx', '.js', '.jsx', '.ets'].includes(ext)) {
      return parser.parseFile(filePath)
    }
    return this.createSimpleFileEntity(filePath)
  }

  private createSimpleFileEntity(filePath: string): CodeParsingResult {
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const fileName = path.basename(filePath)
    const fileExtension = path.extname(filePath).substring(1)
    const linesOfCode = fileContent.split('\n').length
    return {
      codeEntities: [
        {
          entityId: `file-${filePath}`,
          entityData: {
            type: 'File',
            filePath,
            fileName,
            fileExtension,
            linesOfCode,
            lastModifiedTimestamp: Date.now(),
            contentHash: 'simple-hash',
          },
        },
      ],
      codeRelations: [],
    }
  }

  private getMatchingFiles(rootDirectory: string): string[] {
    const allFiles: string[] = []
    for (const includePattern of this.config.parser.include) {
      const pattern = path.join(rootDirectory, includePattern)
      const files = globSync(pattern, {
        ignore: this.config.parser.exclude.map(p => path.join(rootDirectory, p)),
        nodir: true,
        absolute: true,
      })
      allFiles.push(...files)
    }
    return [...new Set(allFiles)]
  }

  private forceGarbageCollection(): void {
    try {
      if ((global as any).gc) {
        ;(global as any).gc()
      }
    } catch {
    }
  }
}
