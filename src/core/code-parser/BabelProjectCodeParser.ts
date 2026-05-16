import * as path from 'path'
import { globSync } from 'glob'
import { applicationLogger } from '../../infrastructure/logger'
import { BabelCodeParser } from './BabelCodeParser'
import { CodeParsingResult, ApplicationConfiguration } from '../../shared'
import { SymbolTableManager } from '../symbol-table'

export class BabelProjectCodeParser {
  private config: ApplicationConfiguration
  private symbolTableManager: SymbolTableManager
  private readonly batchSize: number
  private readonly streamProcessing: boolean

  constructor(
    config: ApplicationConfiguration,
    symbolTableManager: SymbolTableManager,
    options: {
      batchSize?: number
      streamProcessing?: boolean
    } = {}
  ) {
    this.config = config
    this.symbolTableManager = symbolTableManager
    this.batchSize = options.batchSize || 50
    this.streamProcessing = options.streamProcessing ?? true
    applicationLogger.info(
      `BabelProjectCodeParser initialized with ` +
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
    applicationLogger.info(`Parsing project with Babel parser in: ${rootDirectory}`)
    const filePaths = this.getMatchingFiles(rootDirectory)
    applicationLogger.info(`Found ${filePaths.length} files to parse`)
    if (filePaths.length === 0) {
      return { codeEntities: [], codeRelations: [] }
    }
    const combinedResult: CodeParsingResult = {
      codeEntities: [],
      codeRelations: [],
    }
    await this.parseFilesWithBabel(filePaths, combinedResult, onProgress)
    applicationLogger.info(
      `Babel project parsing complete. ` +
      `Entities: ${combinedResult.codeEntities.length}, ` +
      `Relations: ${combinedResult.codeRelations.length}`
    )
    return combinedResult
  }

  private async parseFilesWithBabel(
    filePaths: string[],
    result: CodeParsingResult,
    onProgress?: (progress: {
      processed: number
      total: number
      entities: number
      relations: number
    }) => void
  ): Promise<void> {
    const parser = new BabelCodeParser(this.symbolTableManager)
    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i]
      try {
        const fileResult = parser.parse(filePath)
        result.codeEntities.push(...fileResult.codeEntities)
        result.codeRelations.push(...fileResult.codeRelations)
        if (this.streamProcessing && i > 0 && i % this.batchSize === 0) {
          this.forceGarbageCollection()
        }
        if (onProgress) {
          onProgress({
            processed: i + 1,
            total: filePaths.length,
            entities: result.codeEntities.length,
            relations: result.codeRelations.length,
          })
        }
      } catch (error) {
        applicationLogger.warn(`Failed to parse file: ${filePath}`, error)
      }
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
