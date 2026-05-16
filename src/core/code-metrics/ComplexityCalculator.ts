import { FunctionDeclaration, MethodDeclaration, ClassDeclaration } from 'ts-morph';

/** 复杂度计算结果 */
export interface ComplexityResult {
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    linesOfCode: number;
    parametersCount: number;
    maxNestedLevel: number;
    cognitiveContributors: CognitiveContributor[];
}

/** 认知复杂度贡献因子 */
export interface CognitiveContributor {
    type: string;
    nestingLevel: number;
    value: number;
}

/** 复杂度计算器 */
export class ComplexityCalculator {
    constructor() { }

    /**
     * 计算函数的复杂度
     * @param fn 函数声明或方法声明
     */
    calculateFunctionComplexity(fn: FunctionDeclaration | MethodDeclaration): ComplexityResult {
        const linesOfCode = this.countLines(fn);
        const parametersCount = fn.getParameters().length;
        const { cyclomatic, cognitive, maxNesting, contributors } = this.calculateComplexityRecursive(fn);
        return {
            cyclomaticComplexity: cyclomatic,
            cognitiveComplexity: cognitive,
            linesOfCode,
            parametersCount,
            maxNestedLevel: maxNesting,
            cognitiveContributors: contributors
        };
    }

    /**
     * 计算类的复杂度
     * @param cls 类声明
     */
    calculateClassComplexity(cls: ClassDeclaration) {
        const methods = cls.getMethods();
        const methodComplexities = [];
        let totalCyclomaticComplexity = 0;
        
        for (const method of methods) {
            const complexity = this.calculateFunctionComplexity(method);
            methodComplexities.push({
                method: method.getName() || 'anonymous',
                complexity
            });
            totalCyclomaticComplexity += complexity.cyclomaticComplexity;
        }
        
        const avgMethodComplexity = methods.length > 0 ? totalCyclomaticComplexity / methods.length : 0;
        const classComplexity = totalCyclomaticComplexity + methods.length;
        
        return {
            classComplexity,
            methodComplexities,
            avgMethodComplexity,
            totalMethods: methods.length
        };
    }

    /**
     * 计算代码行数
     */
    private countLines(node: any): number {
        const startLine = node.getStartLineNumber();
        const endLine = node.getEndLineNumber();
        return Math.max(0, endLine - startLine + 1);
    }

    /**
     * 递归计算复杂度
     */
    private calculateComplexityRecursive(node: any) {
        let cyclomatic = 1;
        let cognitive = 0;
        let maxNesting = 0;
        const contributors: CognitiveContributor[] = [];

        const processNode = (n: any, depth = 0) => {
            maxNesting = Math.max(maxNesting, depth);
            const kindName = n.getKindName ? n.getKindName() : '';
            
            switch (kindName) {
                case 'IfStatement':
                    cyclomatic++;
                    cognitive += depth + 1;
                    contributors.push({ type: 'if', nestingLevel: depth, value: depth + 1 });
                    break;
                case 'ForStatement':
                case 'ForInStatement':
                case 'ForOfStatement':
                    cyclomatic++;
                    cognitive += depth + 1;
                    contributors.push({ type: 'loop', nestingLevel: depth, value: depth + 1 });
                    break;
                case 'WhileStatement':
                case 'DoStatement':
                    cyclomatic++;
                    cognitive += depth + 1;
                    contributors.push({ type: 'while', nestingLevel: depth, value: depth + 1 });
                    break;
                case 'SwitchStatement': {
                    const cases = n.getCases ? n.getCases() : [];
                    cyclomatic += cases.length;
                    cognitive += depth + cases.length;
                    contributors.push({ type: 'switch', nestingLevel: depth, value: depth + cases.length });
                    break;
                }
                case 'CaseClause':
                    cyclomatic++;
                    cognitive += depth;
                    break;
                case 'CatchClause':
                    cognitive += depth;
                    contributors.push({ type: 'catch', nestingLevel: depth, value: depth });
                    break;
                case 'ConditionalExpression':
                    cyclomatic++;
                    cognitive += depth + 1;
                    contributors.push({ type: 'ternary', nestingLevel: depth, value: depth + 1 });
                    break;
                case 'BinaryExpression': {
                    const op = n.getOperatorToken ? n.getOperatorToken().getText() : '';
                    if (['&&', '||', '??', '?.'].includes(op)) {
                        cyclomatic++;
                        cognitive += depth + 1;
                        contributors.push({ type: 'logical', nestingLevel: depth, value: depth + 1 });
                    }
                    break;
                }
                case 'LogicalExpression':
                    cyclomatic++;
                    cognitive += depth + 1;
                    contributors.push({ type: 'logical', nestingLevel: depth, value: depth + 1 });
                    break;
                case 'CallExpression':
                    if (depth > 0) {
                        cognitive += 1;
                        contributors.push({ type: 'function_call', nestingLevel: depth, value: 1 });
                    }
                    break;
                case 'ArrowFunction':
                case 'FunctionExpression':
                    if (depth > 0) {
                        cognitive += 1;
                        contributors.push({ type: 'function', nestingLevel: depth, value: 1 });
                    }
                    break;
                case 'TryStatement':
                    cognitive += depth;
                    contributors.push({ type: 'try', nestingLevel: depth, value: depth });
                    break;
            }

            const children = n.getChildren ? n.getChildren() : [];
            for (const child of children) {
                processNode(child, depth + 1);
            }
        };

        processNode(node);
        return { cyclomatic, cognitive, maxNesting, contributors };
    }

    /**
     * 获取复杂度等级
     * @param cyclomaticComplexity 圈复杂度
     */
    getComplexityLevel(cyclomaticComplexity: number): {
        level: string;
        description: string;
        color: string;
    } {
        if (cyclomaticComplexity <= 10) {
            return {
                level: 'Low',
                description: 'Simple code, easy to understand and maintain',
                color: 'green'
            };
        } else if (cyclomaticComplexity <= 20) {
            return {
                level: 'Moderate',
                description: 'Moderate complexity, some risk',
                color: 'yellow'
            };
        } else if (cyclomaticComplexity <= 50) {
            return {
                level: 'High',
                description: 'High complexity, needs refactoring',
                color: 'orange'
            };
        } else {
            return {
                level: 'Very High',
                description: 'Extremely complex, refactor immediately',
                color: 'red'
            };
        }
    }
}
