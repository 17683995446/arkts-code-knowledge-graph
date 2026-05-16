import * as path from 'path'
import * as fs from 'fs'
import { globSync } from 'glob'
import { applicationLogger } from '../../infrastructure/logger'
import { EnhancedTypeScriptCodeParser } from './EnhancedTypeScriptCodeParser'
import { CodeParsingResult, ApplicationConfiguration } from '../../shared'
import { SymbolTableManager } from '../symbol-table'

export class EnhancedProjectCodeParser {
  private enhancedTsParser: EnhancedTypeScriptCodeParser
  private config: ApplicationConfiguration

  constructor(config: ApplicationConfiguration, symbolTableManager: SymbolTableManager) {
    this.config = config
    this.enhancedTsParser = new EnhancedTypeScriptCodeParser(symbolTableManager)
  }

  parseProject(rootDirectory: string): CodeParsingResult {
    applicationLogger.info(`Parsing project in: ${rootDirectory}`)
    const filePaths = this.getMatchingFiles(rootDirectory)
    applicationLogger.info(`Found ${filePaths.length} files to parse`)
    const combinedResult: CodeParsingResult = {
      codeEntities: [],
      codeRelations: [],
    }
    for (const filePath of filePaths) {
      try {
        const fileResult = this.parseSingleFile(filePath)
        combinedResult.codeEntities.push(...fileResult.codeEntities)
        combinedResult.codeRelations.push(...fileResult.codeRelations)
      } catch (error) {
        applicationLogger.warn(`Failed to parse file: ${filePath}`, error)
      }
    }
    applicationLogger.info(
      `Project parsing complete. Entities: ${combinedResult.codeEntities.length}, Relations: ${combinedResult.codeRelations.length}`
    )
    return combinedResult
  }

  private parseSingleFile(filePath: string): CodeParsingResult {
    const ext = path.extname(filePath).toLowerCase()
    if (['.ts', '.tsx', '.js', '.jsx', '.ets'].includes(ext)) {
      return this.enhancedTsParser.parseFile(filePath)
    }
    return this.createSimpleFileEntity(filePath)
  }

  private createSimpleFileEntity(filePath: string): CodeParsingResult {
    applicationLogger.debug(`Creating simple file entity for: ${filePath}`)
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
}
