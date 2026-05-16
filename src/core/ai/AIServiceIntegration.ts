import { EventEmitter } from 'events';
import * as crypto from 'crypto';

export interface AIConfig {
  provider: 'openai' | 'claude' | 'local';
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  retryAttempts: number;
  cacheEnabled: boolean;
  cacheTTL: number;
}

export interface AnalysisRequest {
  code: string;
  language: string;
  context?: {
    filePath?: string;
    projectType?: string;
    framework?: string;
  };
  analysisType: 'complexity' | 'quality' | 'suggestions' | 'full';
}

export interface AnalysisResult {
  id: string;
  request: AnalysisRequest;
  complexity?: CodeComplexity;
  quality?: CodeQuality;
  suggestions?: AISuggestion[];
  generatedAt: Date;
  duration: number;
  cached: boolean;
}

export interface CodeComplexity {
  score: number;
  cyclomatic: number;
  cognitive: number;
  halstead: HalsteadMetrics;
  maintainability: number;
  estimatedTimeToUnderstand: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface HalsteadMetrics {
  volume: number;
  difficulty: number;
  effort: number;
  time: number;
  bugs: number;
}

export interface CodeQuality {
  overall: number;
  readability: number;
  maintainability: number;
  performance: number;
  security: number;
  testability: number;
  issues: QualityIssue[];
}

export interface QualityIssue {
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: string;
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
  rule?: string;
}

export interface AISuggestion {
  type: 'optimization' | 'refactor' | 'security' | 'best-practice' | 'documentation';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  original: string;
  suggested: string;
  rationale: string;
  impact: {
    performance?: number;
    maintainability?: number;
    security?: number;
  };
  effort: 'low' | 'medium' | 'high';
}

export class AIServiceIntegration extends EventEmitter {
  private config: AIConfig;
  private cache: Map<string, { result: AnalysisResult; timestamp: number }> = new Map();
  private requestQueue: Array<{ request: AnalysisRequest; resolve: Function; reject: Function }> = [];
  private processing: boolean = false;

  constructor(config: Partial<AIConfig> = {}) {
    super();

    this.config = {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.3,
      maxTokens: 2000,
      timeout: 30000,
      retryAttempts: 3,
      cacheEnabled: true,
      cacheTTL: 3600000,
      ...config,
    };
  }

  public async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(request);

    if (this.config.cacheEnabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return { ...cached, cached: true };
      }
    }

    try {
      const result = await this.performAnalysis(request, startTime);

      if (this.config.cacheEnabled) {
        this.setToCache(cacheKey, result);
      }

      this.emit('analysis:complete', result);
      return result;
    } catch (error) {
      this.emit('analysis:error', error);
      throw error;
    }
  }

  private async performAnalysis(request: AnalysisRequest, startTime: number): Promise<AnalysisResult> {
    const id = crypto.randomUUID();

    switch (request.analysisType) {
      case 'complexity':
        return {
          id,
          request,
          complexity: await this.analyzeComplexity(request),
          generatedAt: new Date(),
          duration: Date.now() - startTime,
          cached: false,
        };

      case 'quality':
        return {
          id,
          request,
          quality: await this.analyzeQuality(request),
          generatedAt: new Date(),
          duration: Date.now() - startTime,
          cached: false,
        };

      case 'suggestions':
        return {
          id,
          request,
          suggestions: await this.generateSuggestions(request),
          generatedAt: new Date(),
          duration: Date.now() - startTime,
          cached: false,
        };

      case 'full':
      default:
        const [complexity, quality, suggestions] = await Promise.all([
          this.analyzeComplexity(request),
          this.analyzeQuality(request),
          this.generateSuggestions(request),
        ]);

        return {
          id,
          request,
          complexity,
          quality,
          suggestions,
          generatedAt: new Date(),
          duration: Date.now() - startTime,
          cached: false,
        };
    }
  }

  private async analyzeComplexity(request: AnalysisRequest): Promise<CodeComplexity> {
    const code = request.code;
    const lines = code.split('\n');

    const cyclomatic = this.calculateCyclomaticComplexity(code);
    const cognitive = this.calculateCognitiveComplexity(code);
    const halstead = this.calculateHalsteadMetrics(code);
    const maintainability = this.calculateMaintainabilityIndex(cyclomatic, halstead, lines.length);

    const score = this.calculateComplexityScore(cyclomatic, cognitive, halstead, maintainability);
    const estimatedTime = this.estimateUnderstandingTime(score);
    const riskLevel = this.determineRiskLevel(score);

    return {
      score,
      cyclomatic,
      cognitive,
      halstead,
      maintainability,
      estimatedTimeToUnderstand: estimatedTime,
      riskLevel,
    };
  }

  private calculateCyclomaticComplexity(code: string): number {
    let complexity = 1;
    const patterns = [
      /\bif\b/g,
      /\belse\s+if\b/g,
      /\bwhile\b/g,
      /\bfor\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\b\?\s*[^:]+:[^:]+\b/g,
      /\b&&\b/g,
      /\b\|\|b/g,
    ];

    for (const pattern of patterns) {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  private calculateCognitiveComplexity(code: string): number {
    let cognitive = 0;
    let nestingLevel = 0;
    let lastWasIncrement = false;

    const lines = code.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();

      if (/^(if|while|for|switch|catch|\?|\&\&|\|\|)/.test(trimmed)) {
        if (!lastWasIncrement || nestingLevel === 0) {
          cognitive++;
        }
        if (!trimmed.startsWith('}') && !trimmed.endsWith('{')) {
          nestingLevel++;
        }
        lastWasIncrement = true;
      } else if (trimmed.startsWith('}')) {
        nestingLevel = Math.max(0, nestingLevel - 1);
        lastWasIncrement = false;
      } else if (trimmed.includes('function') || trimmed.includes('=>') || trimmed.includes('class')) {
        cognitive += nestingLevel + 1;
        lastWasIncrement = false;
      } else {
        lastWasIncrement = false;
      }
    }

    return cognitive;
  }

  private calculateHalsteadMetrics(code: string): HalsteadMetrics {
    const operators = code.match(/[\+\-\*\/\%\=\<\>\!\&\|\?\:\~\^]|&&|\|\||==|!=|<=|>=|<<|>>|>>>|\+\+|--|->|::|\[\]|typeof|void|delete|new|instanceof|in)/g) || [];
    const operands = code.match(/\b[a-zA-Z_]\w*\b/g) || [];

    const uniqueOperators = new Set(operators).size;
    const uniqueOperands = new Set(operands).size;
    const totalOperators = operators.length;
    const totalOperands = operands.length;

    const N = totalOperators + totalOperands;
    const n = uniqueOperators + uniqueOperands;

    const volume = N * Math.log2(n || 1);
    const difficulty = (uniqueOperators / 2) * (totalOperands / (uniqueOperands || 1));
    const effort = volume * difficulty;
    const time = effort / 18;
    const bugs = volume / 3000;

    return {
      volume: Math.round(volume),
      difficulty: Math.round(difficulty * 100) / 100,
      effort: Math.round(effort),
      time: Math.round(time),
      bugs: Math.round(bugs * 100) / 100,
    };
  }

  private calculateMaintainabilityIndex(
    cyclomatic: number,
    halstead: HalsteadMetrics,
    linesOfCode: number
  ): number {
    const mi = 171 -
      5.2 * Math.log(halstead.volume || 1) -
      0.23 * cyclomatic -
      16.2 * Math.log(linesOfCode || 1);

    return Math.max(0, Math.min(100, Math.round(mi * 100) / 100));
  }

  private calculateComplexityScore(
    cyclomatic: number,
    cognitive: number,
    halstead: HalsteadMetrics,
    maintainability: number
  ): number {
    const cyclomaticScore = Math.min(cyclomatic / 20, 1) * 30;
    const cognitiveScore = Math.min(cognitive / 20, 1) * 20;
    const halsteadScore = Math.min(halstead.difficulty / 50, 1) * 25;
    const maintainabilityScore = (100 - maintainability) / 100 * 25;

    return Math.round(cyclomaticScore + cognitiveScore + halsteadScore + maintainabilityScore);
  }

  private estimateUnderstandingTime(score: number): number {
    const baseTime = 5;
    return Math.round(baseTime * Math.pow(score / 10, 1.5));
  }

  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score < 20) return 'low';
    if (score < 40) return 'medium';
    if (score < 60) return 'high';
    return 'critical';
  }

  private async analyzeQuality(request: AnalysisRequest): Promise<CodeQuality> {
    const code = request.code;
    const issues: QualityIssue[] = [];

    const readability = this.assessReadability(code, issues);
    const maintainability = this.assessMaintainability(code, issues);
    const performance = this.assessPerformance(code, issues);
    const security = this.assessSecurity(code, issues);
    const testability = this.assessTestability(code, issues);

    const overall = Math.round((readability + maintainability + performance + security + testability) / 5);

    return {
      overall,
      readability,
      maintainability,
      performance,
      security,
      testability,
      issues,
    };
  }

  private assessReadability(code: string, issues: QualityIssue[]): number {
    let score = 100;
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.length > 120) {
        issues.push({
          severity: 'warning',
          category: 'readability',
          message: `Line ${i + 1} exceeds 120 characters (${line.length} chars)`,
          line: i + 1,
          suggestion: 'Break this line into multiple lines for better readability',
        });
        score -= 2;
      }

      if (/[A-Z]/.test(line) && line === line.toUpperCase() && line.length > 3) {
        issues.push({
          severity: 'info',
          category: 'readability',
          message: `Line ${i + 1} contains uppercase text`,
          line: i + 1,
        });
        score -= 1;
      }
    }

    const avgLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
    if (avgLineLength > 80) {
      score -= 5;
    }

    return Math.max(0, score);
  }

  private assessMaintainability(code: string, issues: QualityIssue[]): number {
    let score = 100;

    const functionMatches = code.match(/function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(|class\s+\w+/g) || [];
    const lines = code.split('\n');

    if (functionMatches.length > 20) {
      issues.push({
        severity: 'warning',
        category: 'maintainability',
        message: `Too many functions/classes (${functionMatches.length}). Consider breaking into modules.`,
        suggestion: 'Split into multiple modules or classes',
      });
      score -= 10;
    }

    if (lines.length > 500) {
      issues.push({
        severity: 'warning',
        category: 'maintainability',
        message: `File has ${lines.length} lines. Consider splitting.`,
        suggestion: 'Break into smaller, focused files',
      });
      score -= 15;
    }

    const commentLines = code.match(/\/\/|\/\*|\*|#/g)?.length || 0;
    const commentRatio = commentLines / lines.length;
    if (commentRatio < 0.1) {
      issues.push({
        severity: 'info',
        category: 'maintainability',
        message: 'Low comment ratio. Consider adding more documentation.',
        suggestion: 'Add JSDoc comments for functions and classes',
      });
      score -= 5;
    }

    return Math.max(0, score);
  }

  private assessPerformance(code: string, issues: QualityIssue[]): number {
    let score = 100;

    if (/\.forEach\s*\(/g.test(code)) {
      issues.push({
        severity: 'info',
        category: 'performance',
        message: 'Using forEach. Consider for...of or map for better performance.',
        suggestion: 'Use for...of loop for better performance in hot paths',
      });
      score -= 3;
    }

    if (/JSON\.parse\s*\(.*JSON\.stringify/g.test(code)) {
      issues.push({
        severity: 'warning',
        category: 'performance',
        message: 'Deep cloning using JSON.parse/stringify detected',
        suggestion: 'Consider using structuredClone or a proper cloning utility',
      });
      score -= 5;
    }

    if (/new\s+Array\s*\(\s*\)/g.test(code)) {
      issues.push({
        severity: 'info',
        category: 'performance',
        message: 'Array constructor detected',
        suggestion: 'Use array literal [] or Array.from() for better performance',
      });
      score -= 2;
    }

    return Math.max(0, score);
  }

  private assessSecurity(code: string, issues: QualityIssue[]): number {
    let score = 100;

    const securityPatterns = [
      { pattern: /eval\s*\(/g, message: 'Use of eval() is a security risk', severity: 'critical' as const },
      { pattern: /innerHTML\s*=/g, message: 'Direct innerHTML assignment can lead to XSS', severity: 'high' as const },
      { pattern: /document\.write\s*\(/g, message: 'document.write() can lead to XSS', severity: 'high' as const },
      { pattern: /password\s*=\s*['"`][^'"`]+['"`]/gi, message: 'Hardcoded password detected', severity: 'critical' as const },
      { pattern: /secret\s*=\s*['"`][^'"`]+['"`]/gi, message: 'Hardcoded secret detected', severity: 'critical' as const },
      { pattern: /api[_-]?key\s*=\s*['"`][^'"`]+['"`]/gi, message: 'Hardcoded API key detected', severity: 'critical' as const },
      { pattern: /SQL\s*\+\s*['"`]/gi, message: 'Potential SQL injection vulnerability', severity: 'critical' as const },
      { pattern: /localhost|127\.0\.0\.1/g, message: 'Hardcoded localhost detected', severity: 'info' as const },
    ];

    for (const { pattern, message, severity } of securityPatterns) {
      if (pattern.test(code)) {
        issues.push({
          severity,
          category: 'security',
          message,
          suggestion: 'Use environment variables for sensitive data',
        });
        score -= severity === 'critical' ? 15 : severity === 'high' ? 10 : 2;
      }
    }

    return Math.max(0, score);
  }

  private assessTestability(code: string, issues: QualityIssue[]): number {
    let score = 100;

    const hasExports = /export\s+(default\s+)?(class|function|const)/g.test(code);
    const hasTests = /describe\(|it\(|test\(|expect\(/g.test(code);

    if (!hasExports && !hasTests) {
      issues.push({
        severity: 'info',
        category: 'testability',
        message: 'No exports or test patterns found',
        suggestion: 'Ensure the code exports functions or classes for testing',
      });
      score -= 10;
    }

    if (!hasTests && hasExports) {
      issues.push({
        severity: 'warning',
        category: 'testability',
        message: 'Exports found but no test patterns detected',
        suggestion: 'Add unit tests for exported functions',
      });
      score -= 15;
    }

    const hardcodedValues = code.match(/setTimeout|setInterval/g)?.length || 0;
    if (hardcodedValues > 3) {
      issues.push({
        severity: 'info',
        category: 'testability',
        message: 'Multiple setTimeout/setInterval calls may affect testability',
        suggestion: 'Consider dependency injection for timing functions',
      });
      score -= 5;
    }

    return Math.max(0, score);
  }

  private async generateSuggestions(request: AnalysisRequest): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];

    const complexity = await this.analyzeComplexity(request);

    if (complexity.score > 40) {
      suggestions.push({
        type: 'refactor',
        priority: 'high',
        title: 'High Cyclomatic Complexity',
        description: 'This code has high cyclomatic complexity which makes it harder to test and maintain.',
        original: 'Multiple nested conditionals',
        suggested: 'Consider extracting methods or using strategy pattern',
        rationale: 'Reduces complexity and improves maintainability',
        impact: { maintainability: 30, performance: 5 },
        effort: 'medium',
      });
    }

    const quality = await this.analyzeQuality(request);

    if (quality.security < 80) {
      suggestions.push({
        type: 'security',
        priority: 'critical',
        title: 'Security Issues Detected',
        description: 'Multiple security issues found in the code.',
        original: 'Hardcoded secrets/credentials',
        suggested: 'Use environment variables or a secrets manager',
        rationale: 'Prevents credential leakage and improves security',
        impact: { security: 50 },
        effort: 'low',
      });
    }

    if (quality.readability < 70) {
      suggestions.push({
        type: 'best-practice',
        priority: 'medium',
        title: 'Improve Code Readability',
        description: 'Lines are too long or formatting could be improved.',
        original: 'Long lines (>120 chars)',
        suggested: 'Break long lines and improve formatting',
        rationale: 'Better readability leads to easier maintenance',
        impact: { maintainability: 20 },
        effort: 'low',
      });
    }

    if (complexity.maintainability < 65) {
      suggestions.push({
        type: 'optimization',
        priority: 'medium',
        title: 'Improve Maintainability',
        description: 'The maintainability index is below optimal.',
        original: 'Low maintainability score',
        suggested: 'Add comments, reduce complexity, improve naming',
        rationale: 'Higher maintainability leads to easier future changes',
        impact: { maintainability: 40 },
        effort: 'medium',
      });
    }

    if (quality.performance < 85) {
      suggestions.push({
        type: 'optimization',
        priority: 'high',
        title: 'Performance Optimization',
        description: 'Potential performance bottlenecks detected.',
        original: 'Suboptimal patterns (forEach, JSON.clone, etc.)',
        suggested: 'Use more efficient patterns',
        rationale: 'Better performance improves user experience',
        impact: { performance: 30 },
        effort: 'medium',
      });
    }

    suggestions.push({
      type: 'documentation',
      priority: 'low',
      title: 'Add Documentation',
      description: 'Consider adding more documentation to the code.',
      original: 'Minimal or no comments',
      suggested: 'Add JSDoc comments and inline documentation',
      rationale: 'Better documentation helps other developers understand the code',
      impact: { maintainability: 15 },
      effort: 'low',
    });

    return suggestions.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private generateCacheKey(request: AnalysisRequest): string {
    const hash = crypto.createHash('md5');
    hash.update(JSON.stringify(request));
    return hash.digest('hex');
  }

  private getFromCache(key: string): AnalysisResult | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
      return cached.result;
    }
    return null;
  }

  private setToCache(key: string, result: AnalysisResult): void {
    if (this.cache.size > 1000) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, { result, timestamp: Date.now() });
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0,
    };
  }
}

export default AIServiceIntegration;
