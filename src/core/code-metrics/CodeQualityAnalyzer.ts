import { CodeEntityType } from '../../shared/index.js';

/** 代码质量指标 */
export interface CodeQualityMetrics {
    maintainability: number;
    readability: number;
    testability: number;
    overallScore: number;
    metrics: {
        linesOfCode: number;
        commentLines: number;
        blankLines: number;
        commentRatio: number;
        avgFunctionLength: number;
        avgFunctionParams: number;
        maxFunctionLength: number;
        fileCount: number;
        classCount: number;
        functionCount: number;
        interfaceCount: number;
    };
    issues: CodeQualityIssue[];
}

/** 代码质量问题 */
export interface CodeQualityIssue {
    severity: 'info' | 'warning' | 'error';
    type: string;
    message: string;
    location?: {
        file: string;
        line: number;
        column: number;
    };
}

/** 代码实体数据用于分析 */
interface EntityDataForAnalysis {
    type: CodeEntityType;
    name?: string;
    [key: string]: any;
}

/** 代码质量分析器 */
export class CodeQualityAnalyzer {
    /**
     * 计算代码质量指标
     * @param entities 实体数据数组
     */
    static calculateQualityMetrics(entities: Array<{
        data: EntityDataForAnalysis;
        location?: any;
    }>): CodeQualityMetrics {
        const metrics = CodeQualityAnalyzer.extractMetrics(entities);
        const maintainability = CodeQualityAnalyzer.calculateMaintainabilityIndex(metrics);
        const readability = CodeQualityAnalyzer.calculateReadabilityScore(metrics);
        const testability = CodeQualityAnalyzer.calculateTestabilityScore(metrics);
        const issues = CodeQualityAnalyzer.detectQualityIssues(entities, metrics);
        return {
            maintainability,
            readability,
            testability,
            overallScore: (maintainability + readability + testability) / 3,
            metrics,
            issues
        };
    }

    /**
     * 从实体中提取指标
     */
    private static extractMetrics(entities: any[]) {
        let totalLinesOfCode = 0;
        let commentLines = 0;
        let blankLines = 0;
        let functionLengths: number[] = [];
        let functionParams: number[] = [];
        let maxFunctionLength = 0;
        let fileCount = 0;
        let classCount = 0;
        let functionCount = 0;
        let interfaceCount = 0;

        for (const entity of entities) {
            const data = entity.data;
            if (data.type === CodeEntityType.FILE) {
                fileCount++;
                totalLinesOfCode += data.linesOfCode || 0;
                commentLines += data.commentLines || 0;
                blankLines += data.blankLines || 0;
            } else if (data.type === CodeEntityType.FUNCTION || data.type === CodeEntityType.METHOD) {
                functionCount++;
                const length = CodeQualityAnalyzer.estimateFunctionLength(data);
                functionLengths.push(length);
                maxFunctionLength = Math.max(maxFunctionLength, length);
                if (data.parameters) {
                    functionParams.push(data.parameters.length);
                }
            } else if (data.type === CodeEntityType.CLASS) {
                classCount++;
            } else if (data.type === CodeEntityType.INTERFACE) {
                interfaceCount++;
            }
        }

        const commentRatio = totalLinesOfCode > 0 ? commentLines / totalLinesOfCode : 0;
        const avgFunctionLength = functionLengths.length > 0
            ? functionLengths.reduce((a, b) => a + b, 0) / functionLengths.length
            : 0;
        const avgFunctionParams = functionParams.length > 0
            ? functionParams.reduce((a, b) => a + b, 0) / functionParams.length
            : 0;

        return {
            linesOfCode: totalLinesOfCode,
            commentLines,
            blankLines,
            commentRatio,
            avgFunctionLength,
            avgFunctionParams,
            maxFunctionLength,
            fileCount,
            classCount,
            functionCount,
            interfaceCount
        };
    }

    /**
     * 估计函数长度
     */
    private static estimateFunctionLength(fn: any): number {
        if (fn.location) {
            const { start, end } = fn.location;
            if (start && end && start.line && end.line) {
                return Math.max(0, end.line - start.line + 1);
            }
        }
        return 5;
    }

    /**
     * 计算可维护性指数
     */
    private static calculateMaintainabilityIndex(metrics: any): number {
        let score = 100;
        if (metrics.avgFunctionLength > 20) {
            score -= (metrics.avgFunctionLength - 20) * 0.5;
        }
        if (metrics.maxFunctionLength > 50) {
            score -= (metrics.maxFunctionLength - 50) * 0.3;
        }
        if (metrics.commentRatio < 0.1) {
            score -= (0.1 - metrics.commentRatio) * 50;
        }
        score = Math.max(0, Math.min(100, score));
        return Math.round(score * 100) / 100;
    }

    /**
     * 计算可读性分数
     */
    private static calculateReadabilityScore(metrics: any): number {
        let score = 100;
        if (metrics.avgFunctionLength > 30) {
            score -= (metrics.avgFunctionLength - 30) * 0.3;
        }
        if (metrics.avgFunctionParams > 5) {
            score -= (metrics.avgFunctionParams - 5) * 2;
        }
        if (metrics.commentRatio < 0.15) {
            score -= (0.15 - metrics.commentRatio) * 40;
        }
        score = Math.max(0, Math.min(100, score));
        return Math.round(score * 100) / 100;
    }

    /**
     * 计算可测试性分数
     */
    private static calculateTestabilityScore(metrics: any): number {
        let score = 100;
        if (metrics.avgFunctionParams > 3) {
            score -= (metrics.avgFunctionParams - 3) * 3;
        }
        if (metrics.avgFunctionLength > 25) {
            score -= (metrics.avgFunctionLength - 25) * 0.4;
        }
        if (metrics.maxFunctionLength > 40) {
            score -= (metrics.maxFunctionLength - 40) * 0.2;
        }
        score = Math.max(0, Math.min(100, score));
        return Math.round(score * 100) / 100;
    }

    /**
     * 检测代码质量问题
     */
    private static detectQualityIssues(entities: any[], metrics: any): CodeQualityIssue[] {
        const issues: CodeQualityIssue[] = [];
        for (const entity of entities) {
            const data = entity.data;
            if (data.type === CodeEntityType.FUNCTION || data.type === CodeEntityType.METHOD) {
                const length = CodeQualityAnalyzer.estimateFunctionLength(data);
                if (length > 50) {
                    issues.push({
                        severity: 'error',
                        type: 'FunctionTooLong',
                        message: `Function ${data.functionName || data.name || 'unknown'} is too long (${length} lines), consider splitting`,
                        location: entity.location ? {
                            file: entity.location.file || 'unknown',
                            line: entity.location.start?.line || 0,
                            column: entity.location.start?.column || 0
                        } : undefined
                    });
                } else if (length > 30) {
                    issues.push({
                        severity: 'warning',
                        type: 'FunctionLong',
                        message: `Function ${data.functionName || data.name || 'unknown'} is long (${length} lines), consider splitting`,
                        location: entity.location ? {
                            file: entity.location.file || 'unknown',
                            line: entity.location.start?.line || 0,
                            column: entity.location.start?.column || 0
                        } : undefined
                    });
                }
                if (data.parameters && data.parameters.length > 5) {
                    issues.push({
                        severity: 'warning',
                        type: 'TooManyParameters',
                        message: `Function ${data.functionName || data.name || 'unknown'} has too many parameters (${data.parameters.length}), consider using an object`,
                        location: entity.location ? {
                            file: entity.location.file || 'unknown',
                            line: entity.location.start?.line || 0,
                            column: entity.location.start?.column || 0
                        } : undefined
                    });
                }
            }
        }
        if (metrics.commentRatio < 0.1) {
            issues.push({
                severity: 'warning',
                type: 'LowCommentRatio',
                message: `Code comment ratio is low (${(metrics.commentRatio * 100).toFixed(1)}%), consider adding more comments`
            });
        }
        return issues;
    }

    /**
     * 获取质量等级
     * @param score 总分
     */
    static getQualityLevel(score: number): {
        level: string;
        description: string;
        color: string;
    } {
        if (score >= 90) {
            return {
                level: 'Excellent',
                description: 'Excellent code quality',
                color: 'green'
            };
        } else if (score >= 75) {
            return {
                level: 'Good',
                description: 'Good code quality, minor room for improvement',
                color: 'cyan'
            };
        } else if (score >= 60) {
            return {
                level: 'Fair',
                description: 'Fair code quality, needs attention',
                color: 'yellow'
            };
        } else {
            return {
                level: 'Poor',
                description: 'Poor code quality, refactoring recommended',
                color: 'red'
            };
        }
    }
}
