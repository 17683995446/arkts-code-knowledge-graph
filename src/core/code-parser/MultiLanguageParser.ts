import * as fs from 'fs';
import * as path from 'path';
import { CodeEntityType, CodeRelationType, CodeParsingResult } from '../../shared/index.js';
import { applicationLogger } from '../../infrastructure/logger/index.js';
import { TypeScriptCodeParser } from './TypeScriptCodeParser.js';
import { JavaCodeParser } from './JavaCodeParser.js';
import { PythonCodeParser } from './PythonCodeParser.js';
import { RustCodeParser } from './RustCodeParser.js';

export type LanguageType = 'typescript' | 'javascript' | 'java' | 'python' | 'rust' | 'arkts' | 'unknown';

export interface ParserOptions {
    includePatterns?: string[];
    excludePatterns?: string[];
    maxFileSizeBytes?: number;
}

export class MultiLanguageParser {
    private tsParser: TypeScriptCodeParser;
    private javaParser: JavaCodeParser;
    private pythonParser: PythonCodeParser;
    private rustParser: RustCodeParser;
    private options: ParserOptions;

    constructor(options: ParserOptions = {}) {
        this.tsParser = new TypeScriptCodeParser();
        this.javaParser = new JavaCodeParser();
        this.pythonParser = new PythonCodeParser();
        this.rustParser = new RustCodeParser();
        this.options = {
            includePatterns: options.includePatterns || ['**/*.{ts,tsx,js,jsx,ets,java,py,rs}'],
            excludePatterns: options.excludePatterns || ['node_modules/**', 'dist/**', 'build/**', '.git/**', '__pycache__/**', 'target/**'],
            maxFileSizeBytes: options.maxFileSizeBytes || 1024 * 1024 * 10
        };
    }

    getLanguageFromFile(filePath: string): LanguageType {
        const ext = path.extname(filePath).toLowerCase();
        switch (ext) {
            case '.ts':
            case '.tsx':
                return 'typescript';
            case '.js':
            case '.jsx':
                return 'javascript';
            case '.ets':
                return 'arkts';
            case '.java':
                return 'java';
            case '.py':
                return 'python';
            case '.rs':
                return 'rust';
            default:
                return 'unknown';
        }
    }

    parseFile(filePath: string): CodeParsingResult {
        const language = this.getLanguageFromFile(filePath);
        
        if (!this.isFileAllowed(filePath)) {
            applicationLogger.debug(`Skipping file: ${filePath} (excluded by pattern)`);
            return { codeEntities: [], codeRelations: [] };
        }

        const fileSize = this.getFileSize(filePath);
        if (fileSize > this.options.maxFileSizeBytes!) {
            applicationLogger.warn(`Skipping large file: ${filePath} (${fileSize} bytes)`);
            return { codeEntities: [], codeRelations: [] };
        }

        applicationLogger.debug(`Parsing ${language} file: ${filePath}`);
        
        try {
            switch (language) {
                case 'typescript':
                case 'javascript':
                case 'arkts':
                    return this.tsParser.parseFile(filePath);
                case 'java':
                    return this.javaParser.parseFile(filePath);
                case 'python':
                    return this.pythonParser.parseFile(filePath);
                case 'rust':
                    return this.rustParser.parseFile(filePath);
                default:
                    applicationLogger.warn(`Unsupported language for file: ${filePath}`);
                    return { codeEntities: [], codeRelations: [] };
            }
        } catch (error) {
            applicationLogger.error(`Error parsing file ${filePath}: ${(error as Error).message}`);
            return { codeEntities: [], codeRelations: [] };
        }
    }

    parseDirectory(directoryPath: string): CodeParsingResult {
        applicationLogger.info(`Parsing directory: ${directoryPath}`);
        const allEntities: CodeParsingResult['codeEntities'] = [];
        const allRelations: CodeParsingResult['codeRelations'] = [];

        const files = this.findAllSourceFiles(directoryPath);
        applicationLogger.info(`Found ${files.length} source files`);

        for (const file of files) {
            const result = this.parseFile(file);
            allEntities.push(...result.codeEntities);
            allRelations.push(...result.codeRelations);
        }

        return { codeEntities: allEntities, codeRelations: allRelations };
    }

    parseProject(projectPath: string): CodeParsingResult {
        applicationLogger.info(`Parsing project: ${projectPath}`);
        
        const cargoTomlPath = path.join(projectPath, 'Cargo.toml');
        const pomXmlPath = path.join(projectPath, 'pom.xml');
        const buildGradlePath = path.join(projectPath, 'build.gradle');
        const pyProjectTomlPath = path.join(projectPath, 'pyproject.toml');

        if (fs.existsSync(cargoTomlPath)) {
            return this.rustParser.parseCargoProject(projectPath);
        }

        if (fs.existsSync(pomXmlPath) || fs.existsSync(buildGradlePath)) {
            return this.javaParser.parseFile(path.join(projectPath, 'src', 'main', 'java'));
        }

        if (fs.existsSync(pyProjectTomlPath)) {
            return this.pythonParser.parseDirectory(projectPath);
        }

        return this.parseDirectory(projectPath);
    }

    getSupportedLanguages(): LanguageType[] {
        return ['typescript', 'javascript', 'java', 'python', 'rust', 'arkts'];
    }

    getLanguageFileExtensions(language: LanguageType): string[] {
        switch (language) {
            case 'typescript':
                return ['.ts', '.tsx'];
            case 'javascript':
                return ['.js', '.jsx'];
            case 'arkts':
                return ['.ets'];
            case 'java':
                return ['.java'];
            case 'python':
                return ['.py'];
            case 'rust':
                return ['.rs'];
            default:
                return [];
        }
    }

    private findAllSourceFiles(directoryPath: string): string[] {
        const files: string[] = [];
        const items = fs.readdirSync(directoryPath);
        
        for (const item of items) {
            const fullPath = path.join(directoryPath, item);
            
            if (this.isPathExcluded(fullPath)) {
                continue;
            }
            
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                files.push(...this.findAllSourceFiles(fullPath));
            } else if (stat.isFile() && this.isSourceFile(fullPath)) {
                files.push(fullPath);
            }
        }
        
        return files;
    }

    private isSourceFile(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        const supportedExtensions = ['.ts', '.tsx', '.js', '.jsx', '.ets', '.java', '.py', '.rs'];
        return supportedExtensions.includes(ext);
    }

    private isPathExcluded(filePath: string): boolean {
        const normalizedPath = filePath.replace(/\\/g, '/');
        return this.options.excludePatterns!.some(pattern => 
            this.matchesPattern(normalizedPath, pattern)
        );
    }

    private isFileAllowed(filePath: string): boolean {
        const normalizedPath = filePath.replace(/\\/g, '/');
        
        if (this.isPathExcluded(filePath)) {
            return false;
        }
        
        return this.options.includePatterns!.some(pattern => 
            this.matchesPattern(normalizedPath, pattern)
        );
    }

    private matchesPattern(filePath: string, pattern: string): boolean {
        const patternParts = pattern.split('/');
        const pathParts = filePath.split('/');
        
        let patternIndex = 0;
        let pathIndex = 0;
        
        while (patternIndex < patternParts.length && pathIndex < pathParts.length) {
            const patternPart = patternParts[patternIndex];
            
            if (patternPart === '**') {
                if (patternIndex === patternParts.length - 1) {
                    return true;
                }
                
                const nextPatternPart = patternParts[patternIndex + 1];
                const foundIndex = pathParts.indexOf(nextPatternPart, pathIndex);
                if (foundIndex === -1) {
                    return false;
                }
                patternIndex += 2;
                pathIndex = foundIndex + 1;
            } else if (patternPart === '*') {
                patternIndex++;
                pathIndex++;
            } else if (patternPart.includes('*')) {
                const regexPattern = patternPart.replace(/\./g, '\\.').replace(/\*/g, '.*');
                if (!new RegExp(`^${regexPattern}$`).test(pathParts[pathIndex])) {
                    return false;
                }
                patternIndex++;
                pathIndex++;
            } else if (patternPart === pathParts[pathIndex]) {
                patternIndex++;
                pathIndex++;
            } else {
                return false;
            }
        }
        
        return patternIndex === patternParts.length && pathIndex === pathParts.length;
    }

    private getFileSize(filePath: string): number {
        try {
            return fs.statSync(filePath).size;
        } catch {
            return 0;
        }
    }
}