import { Project } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';
import { ComplexityCalculator } from './ComplexityCalculator.js';
import { CodeQualityAnalyzer } from './CodeQualityAnalyzer.js';
import { applicationLogger } from '../../infrastructure/logger/index.js';
import { fileMatchesGlobPatterns } from '../../shared/utilities.js';

/** 项目指标 */
export interface ProjectMetrics {
    overview: {
        totalFiles: number;
        totalClasses: number;
        totalFunctions: number;
        totalInterfaces: number;
        totalLinesOfCode: number;
    };
    complexity: {
        avgCyclomatic: number;
        maxCyclomatic: number;
        highComplexityFunctions: Array<{
            name: string;
            complexity: number;
            file: string;
        }>;
        complexityDistribution: {
            low: number;
            moderate: number;
            high: number;
            veryHigh: number;
        };
    };
    quality: any;
}

/** 项目指标分析器 */
export class ProjectMetricsAnalyzer {
    private project: Project;
    private complexityCalculator: ComplexityCalculator;

    constructor() {
        this.project = new Project();
        this.complexityCalculator = new ComplexityCalculator();
    }

    /**
     * 分析项目
     * @param rootDirectory 项目根目录
     * @param includePatterns 包含的文件模式
     * @param excludePatterns 排除的文件模式
     */
    analyzeProject(rootDirectory: string, includePatterns?: string[], excludePatterns?: string[]): ProjectMetrics {
        applicationLogger.info(`Starting project analysis for: ${rootDirectory}`);
        
        const sourceFiles: string[] = [];
        this.findSourceFiles(rootDirectory, includePatterns || ['**/*.{ts,tsx,js,jsx,ets}'], excludePatterns || ['node_modules/**', 'dist/**', 'build/**', '.git/**'], sourceFiles);
        applicationLogger.info(`Found ${sourceFiles.length} source files`);

        for (const filePath of sourceFiles) {
            try {
                this.project.addSourceFileAtPath(filePath);
            } catch (error) {
                applicationLogger.debug(`Skipping invalid file: ${filePath}`);
            }
        }

        const projectSourceFiles = this.project.getSourceFiles();
        const overview = this.analyzeOverview(projectSourceFiles);
        const complexity = this.analyzeComplexity(projectSourceFiles);
        const quality = this.analyzeQuality(projectSourceFiles, overview);

        applicationLogger.info('Project analysis complete');
        return {
            overview,
            complexity,
            quality
        };
    }

    /**
     * 递归查找源文件
     */
    private findSourceFiles(directory: string, includePatterns: string[], excludePatterns: string[], result: string[]): void {
        const entries = fs.readdirSync(directory, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                const shouldExclude = excludePatterns.some(pattern => fileMatchesGlobPatterns(fullPath, [pattern], []));
                if (!shouldExclude && entry.name !== 'node_modules' && entry.name !== '.git') {
                    this.findSourceFiles(fullPath, includePatterns, excludePatterns, result);
                }
            } else if (entry.isFile()) {
                const shouldInclude = includePatterns.some(pattern => fileMatchesGlobPatterns(fullPath, [pattern], []));
                if (shouldInclude) {
                    result.push(fullPath);
                }
            }
        }
    }

    /**
     * 分析项目概览
     */
    private analyzeOverview(sourceFiles: any[]) {
        let totalLinesOfCode = 0;
        let totalClasses = 0;
        let totalFunctions = 0;
        let totalInterfaces = 0;
        for (const sourceFile of sourceFiles) {
            const text = sourceFile.getFullText();
            const lines = text.split('\n').length;
            totalLinesOfCode += lines;
            totalClasses += sourceFile.getClasses().length;
            totalFunctions += sourceFile.getFunctions().length;
            totalInterfaces += sourceFile.getInterfaces().length;
        }
        return {
            totalFiles: sourceFiles.length,
            totalClasses,
            totalFunctions,
            totalInterfaces,
            totalLinesOfCode
        };
    }

    /**
     * 分析项目复杂度
     */
    private analyzeComplexity(sourceFiles: any[]) {
        let totalCyclomaticComplexity = 0;
        let functionCount = 0;
        let maxCyclomaticComplexity = 0;
        const highComplexityFunctions: Array<{ name: string; complexity: number; file: string; }> = [];
        const complexityDistribution = { low: 0, moderate: 0, high: 0, veryHigh: 0 };

        for (const sourceFile of sourceFiles) {
            const filePath = sourceFile.getFilePath();
            const functions = sourceFile.getFunctions();
            for (const fn of functions) {
                const complexity = this.complexityCalculator.calculateFunctionComplexity(fn);
                totalCyclomaticComplexity += complexity.cyclomaticComplexity;
                functionCount++;
                maxCyclomaticComplexity = Math.max(maxCyclomaticComplexity, complexity.cyclomaticComplexity);
                if (complexity.cyclomaticComplexity > 20) {
                    highComplexityFunctions.push({
                        name: fn.getName() || 'anonymous',
                        complexity: complexity.cyclomaticComplexity,
                        file: filePath
                    });
                }
                const level = this.categorizeComplexity(complexity.cyclomaticComplexity);
                complexityDistribution[level]++;
            }

            const classes = sourceFile.getClasses();
            for (const cls of classes) {
                const methods = cls.getMethods();
                for (const method of methods) {
                    const complexity = this.complexityCalculator.calculateFunctionComplexity(method);
                    totalCyclomaticComplexity += complexity.cyclomaticComplexity;
                    functionCount++;
                    maxCyclomaticComplexity = Math.max(maxCyclomaticComplexity, complexity.cyclomaticComplexity);
                    if (complexity.cyclomaticComplexity > 20) {
                        highComplexityFunctions.push({
                            name: `${cls.getName()}.${method.getName() || 'anonymous'}`,
                            complexity: complexity.cyclomaticComplexity,
                            file: filePath
                        });
                    }
                    const level = this.categorizeComplexity(complexity.cyclomaticComplexity);
                    complexityDistribution[level]++;
                }
            }
        }

        const avgCyclomaticComplexity = functionCount > 0 ? totalCyclomaticComplexity / functionCount : 0;

        return {
            avgCyclomatic: Math.round(avgCyclomaticComplexity * 100) / 100,
            maxCyclomatic: maxCyclomaticComplexity,
            highComplexityFunctions: highComplexityFunctions.sort((a, b) => b.complexity - a.complexity),
            complexityDistribution
        };
    }

    /**
     * 分析代码质量
     */
    private analyzeQuality(sourceFiles: any[], _overview: any) {
        const entities = [];
        for (const sourceFile of sourceFiles) {
            const filePath = sourceFile.getFilePath();
            const text = sourceFile.getFullText();
            const lines = text.split('\n');
            const commentLines = lines.filter((line: string) => line.trim().startsWith('//') ||
                line.trim().startsWith('/*') ||
                line.trim().startsWith('*')).length;
            entities.push({
                data: {
                    type: 'File',
                    name: filePath,
                    linesOfCode: lines.length,
                    commentLines,
                    blankLines: lines.filter((l: string) => l.trim() === '').length
                },
                location: { file: filePath, start: { line: 1, column: 0 } }
            });
            for (const fn of sourceFile.getFunctions()) {
                entities.push({
                    data: {
                        type: 'Function',
                        functionName: fn.getName(),
                        parameters: fn.getParameters().map((p: any) => ({ name: p.getName() }))
                    },
                    location: {
                        file: filePath,
                        start: { line: fn.getStartLineNumber(), column: fn.getStart() },
                        end: { line: fn.getEndLineNumber(), column: fn.getEnd() }
                    }
                });
            }
            for (const cls of sourceFile.getClasses()) {
                entities.push({
                    data: { type: 'Class', className: cls.getName() },
                    location: { file: filePath }
                });
            }
            for (const iface of sourceFile.getInterfaces()) {
                entities.push({
                    data: { type: 'Interface', interfaceName: iface.getName() },
                    location: { file: filePath }
                });
            }
        }
        return CodeQualityAnalyzer.calculateQualityMetrics(entities);
    }

    /**
     * 将复杂度分类
     */
    private categorizeComplexity(cyclomaticComplexity: number): 'low' | 'moderate' | 'high' | 'veryHigh' {
        if (cyclomaticComplexity <= 10)
            return 'low';
        if (cyclomaticComplexity <= 20)
            return 'moderate';
        if (cyclomaticComplexity <= 50)
            return 'high';
        return 'veryHigh';
    }

    /**
     * 生成报告
     */
    generateReport(metrics: ProjectMetrics): string {
        const reportLines = [];
        reportLines.push('\n📊 Code Quality Analysis Report');
        reportLines.push('='.repeat(60));
        reportLines.push('\n📈 Project Overview');
        reportLines.push('-'.repeat(40));
        reportLines.push(`   Total Files: ${metrics.overview.totalFiles}`);
        reportLines.push(`   Total Classes: ${metrics.overview.totalClasses}`);
        reportLines.push(`   Total Functions: ${metrics.overview.totalFunctions}`);
        reportLines.push(`   Total Interfaces: ${metrics.overview.totalInterfaces}`);
        reportLines.push(`   Total Lines of Code: ${metrics.overview.totalLinesOfCode}`);
        reportLines.push('\n🧮 Complexity Analysis');
        reportLines.push('-'.repeat(40));
        reportLines.push(`   Average Cyclomatic Complexity: ${metrics.complexity.avgCyclomatic}`);
        reportLines.push(`   Maximum Cyclomatic Complexity: ${metrics.complexity.maxCyclomatic}`);
        reportLines.push('   Complexity Distribution:');
        reportLines.push(`     Low (1-10): ${metrics.complexity.complexityDistribution.low}`);
        reportLines.push(`     Moderate (11-20): ${metrics.complexity.complexityDistribution.moderate}`);
        reportLines.push(`     High (21-50): ${metrics.complexity.complexityDistribution.high}`);
        reportLines.push(`     Very High (>50): ${metrics.complexity.complexityDistribution.veryHigh}`);
        if (metrics.complexity.highComplexityFunctions.length > 0) {
            reportLines.push('\n⚠️ High Complexity Functions (Top 10):');
            metrics.complexity.highComplexityFunctions.slice(0, 10).forEach(fn => {
                const level = this.complexityCalculator.getComplexityLevel(fn.complexity);
                reportLines.push(`  [${level.level}] ${fn.name} (${fn.complexity})`);
                reportLines.push(`      File: ${fn.file}`);
            });
        }
        reportLines.push('\n📋 Quality Score');
        reportLines.push('-'.repeat(40));
        const qualityLevel = CodeQualityAnalyzer.getQualityLevel(metrics.quality.overallScore);
        reportLines.push(`   Overall Score: ${metrics.quality.overallScore.toFixed(2)}/100 (${qualityLevel.level})`);
        reportLines.push(`   Maintainability: ${metrics.quality.maintainability.toFixed(2)}/100`);
        reportLines.push(`   Readability: ${metrics.quality.readability.toFixed(2)}/100`);
        reportLines.push(`   Testability: ${metrics.quality.testability.toFixed(2)}/100`);
        if (metrics.quality.issues.length > 0) {
            reportLines.push('\n🔍 Issues Found:');
            metrics.quality.issues.forEach((issue: any) => {
                const severityIcon = issue.severity === 'error' ? '❌' :
                    issue.severity === 'warning' ? '⚠️' : 'ℹ️';
                reportLines.push(`  ${severityIcon} [${issue.type}] ${issue.message}`);
                if (issue.location) {
                    reportLines.push(`      📍 ${issue.location.file}:${issue.location.line}`);
                }
            });
        }
        reportLines.push('\n' + '='.repeat(60));
        return reportLines.join('\n');
    }
}
