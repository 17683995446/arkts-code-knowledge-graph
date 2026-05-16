import * as path from 'path';
import * as fs from 'fs';
import { globSync } from 'glob';
import { applicationLogger } from '../../infrastructure/logger/index.js';
import { TypeScriptCodeParser } from './TypeScriptCodeParser.js';
import { CodeParsingResult, ApplicationConfiguration } from '../../shared/index.js';

/** 项目代码解析器 */
export class ProjectCodeParser {
    private tsParser: TypeScriptCodeParser;
    private config: ApplicationConfiguration;

    constructor(config: ApplicationConfiguration) {
        this.config = config;
        this.tsParser = new TypeScriptCodeParser();
    }

    /**
     * 解析整个项目
     * @param rootDirectory 项目根目录
     * @returns 完整的解析结果
     */
    parseProject(rootDirectory: string): CodeParsingResult {
        applicationLogger.info(`Parsing project in: ${rootDirectory}`);
        
        const filePaths = this.getMatchingFiles(rootDirectory);
        applicationLogger.info(`Found ${filePaths.length} files to parse`);

        const combinedResult: CodeParsingResult = {
            codeEntities: [],
            codeRelations: []
        };

        for (const filePath of filePaths) {
            try {
                const fileResult = this.parseSingleFile(filePath);
                combinedResult.codeEntities.push(...fileResult.codeEntities);
                combinedResult.codeRelations.push(...fileResult.codeRelations);
            }
            catch (error) {
                applicationLogger.warn(`Failed to parse file: ${filePath}`, error);
            }
        }

        applicationLogger.info(`Project parsing complete. Entities: ${combinedResult.codeEntities.length}, Relations: ${combinedResult.codeRelations.length}`);
        return combinedResult;
    }

    /**
     * 解析单个文件
     * @param filePath 文件路径
     */
    private parseSingleFile(filePath: string): CodeParsingResult {
        const ext = path.extname(filePath).toLowerCase();
        if (['.ts', '.tsx', '.js', '.jsx', '.ets'].includes(ext)) {
            return this.tsParser.parseFile(filePath);
        }
        return this.createSimpleFileEntity(filePath);
    }

    /**
     * 为非 TypeScript/JavaScript 文件创建简单的文件实体
     */
    private createSimpleFileEntity(filePath: string): CodeParsingResult {
        applicationLogger.debug(`Creating simple file entity for: ${filePath}`);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const fileName = path.basename(filePath);
        const fileExtension = path.extname(filePath).substring(1);
        const linesOfCode = fileContent.split('\n').length;

        return {
            codeEntities: [{
                    entityId: `file-${filePath}`,
                    entityData: {
                        type: 'File' as any,
                        filePath,
                        fileName,
                        fileExtension,
                        linesOfCode,
                        lastModifiedTimestamp: Date.now(),
                        contentHash: 'simple-hash'
                    }
                }],
            codeRelations: []
        };
    }

    /**
     * 获取所有匹配的文件
     * @param rootDirectory 根目录
     */
    private getMatchingFiles(rootDirectory: string): string[] {
        const allFiles: string[] = [];
        for (const includePattern of this.config.parser.include) {
            const pattern = path.join(rootDirectory, includePattern);
            const files = globSync(pattern, {
                ignore: this.config.parser.exclude.map(p => path.join(rootDirectory, p)),
                nodir: true,
                absolute: true
            });
            allFiles.push(...files);
        }
        return [...new Set(allFiles)];
    }
}
