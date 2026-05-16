import { EventEmitter } from 'events';
import * as crypto from 'crypto';

export type AIProvider = 'openai' | 'claude' | 'gemini' | 'siliconflow' | 'local' | 'hybrid';

export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  retryAttempts: number;
  cacheEnabled: boolean;
  cacheTTL: number;
  maxConcurrentRequests: number;
  rateLimitPerMinute: number;
}

export interface AnalysisRequest {
  code: string;
  language: string;
  context?: {
    filePath?: string;
    projectType?: string;
    framework?: string;
    dependencies?: string[];
    relatedCode?: string[];
  };
  analysisType: 'complexity' | 'quality' | 'suggestions' | 'full' | 'security' | 'performance';
  options?: {
    includeRefactoringSuggestions?: boolean;
    includePerformanceTips?: boolean;
    includeSecurityAnalysis?: boolean;
    detailed?: boolean;
  };
}

export interface AnalysisResult {
  id: string;
  request: AnalysisRequest;
  complexity?: CodeComplexity;
  quality?: CodeQuality;
  suggestions?: AISuggestion[];
  securityIssues?: SecurityIssue[];
  generatedAt: Date;
  duration: number;
  cached: boolean;
  aiModelUsed?: string;
  confidenceScore?: number;
}

export interface CodeComplexity {
  score: number;
  cyclomatic: number;
  cognitive: number;
  halstead: HalsteadMetrics;
  maintainability: number;
  estimatedTimeToUnderstand: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  hotspots: ComplexityHotspot[];
}

export interface ComplexityHotspot {
  line: number;
  column: number;
  complexity: number;
  type: 'cyclomatic' | 'cognitive' | 'nesting';
  suggestion: string;
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
  metrics: QualityMetrics;
}

export interface QualityMetrics {
  linesOfCode: number;
  functionsCount: number;
  classesCount: number;
  commentDensity: number;
  averageFunctionLength: number;
  maxNestingDepth: number;
}

export interface QualityIssue {
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: string;
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
  rule?: string;
  code?: string;
}

export interface SecurityIssue {
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'xss' | 'sql-injection' | 'path-traversal' | 'hardcoded-secret' | 'weak-crypto' | 'csrf' | 'insecure-config' | 'other';
  message: string;
  line?: number;
  column?: number;
  code?: string;
  cwe?: string;
  cvssScore?: number;
  fixSuggestion: string;
}

export interface AISuggestion {
  type: 'optimization' | 'refactor' | 'security' | 'best-practice' | 'documentation' | 'performance';
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
    readability?: number;
  };
  effort: 'low' | 'medium' | 'high';
  estimatedImpact?: number;
}

export interface CodeContext {
  imports: string[];
  exports: string[];
  functions: FunctionInfo[];
  classes: ClassInfo[];
  variables: VariableInfo[];
  dependencies: string[];
}

export interface FunctionInfo {
  name: string;
  parameters: string[];
  returnType: string;
  line: number;
  complexity: number;
}

export interface ClassInfo {
  name: string;
  extends?: string;
  implements?: string[];
  methods: string[];
  line: number;
}

export interface VariableInfo {
  name: string;
  type?: string;
  isConst: boolean;
  line: number;
}

export class EnhancedAIService extends EventEmitter {
  private config: AIConfig;
  private cache: Map<string, { result: AnalysisResult; timestamp: number }> = new Map();
  private requestQueue: Array<{ request: AnalysisRequest; resolve: Function; reject: Function }> = [];
  private processing: boolean = false;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();

  constructor(config: Partial<AIConfig> = {}) {
    super();

    this.config = {
      provider: 'siliconflow',
      model: 'Qwen/Qwen2.5-7B-Instruct',
      apiKey: 'sk-uqelhavcdhfxjzjesdenxpbtqombjniazzjtbssmdcwdvg',
      baseUrl: 'https://api.siliconflow.cn/v1',
      temperature: 0.2,
      maxTokens: 4000,
      timeout: 60000,
      retryAttempts: 3,
      cacheEnabled: true,
      cacheTTL: 3600000,
      maxConcurrentRequests: 5,
      rateLimitPerMinute: 30,
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

    await this.waitForRateLimit();

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

  public async analyzeWithAI(request: AnalysisRequest): Promise<AnalysisResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(request);

    if (this.config.cacheEnabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return { ...cached, cached: true };
      }
    }

    await this.waitForRateLimit();

    try {
      const result = await this.performAIAnalysis(request, startTime);

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

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    if (now - this.lastResetTime > 60000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    while (this.requestCount >= this.config.rateLimitPerMinute) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.requestCount++;
  }

  private async performAnalysis(request: AnalysisRequest, startTime: number): Promise<AnalysisResult> {
    const id = crypto.randomUUID();
    const codeContext = await this.analyzeCodeContext(request);

    switch (request.analysisType) {
      case 'complexity':
        return {
          id,
          request,
          complexity: await this.analyzeComplexity(request, codeContext),
          generatedAt: new Date(),
          duration: Date.now() - startTime,
          cached: false,
          aiModelUsed: 'local',
          confidenceScore: 0.95,
        };

      case 'quality':
        return {
          id,
          request,
          quality: await this.analyzeQuality(request, codeContext),
          generatedAt: new Date(),
          duration: Date.now() - startTime,
          cached: false,
          aiModelUsed: 'local',
          confidenceScore: 0.95,
        };

      case 'security':
        return {
          id,
          request,
          securityIssues: await this.analyzeSecurity(request),
          generatedAt: new Date(),
          duration: Date.now() - startTime,
          cached: false,
          aiModelUsed: 'local',
          confidenceScore: 0.90,
        };

      case 'performance':
        return {
          id,
          request,
          suggestions: await this.generatePerformanceSuggestions(request, codeContext),
          generatedAt: new Date(),
          duration: Date.now() - startTime,
          cached: false,
          aiModelUsed: 'local',
          confidenceScore: 0.92,
        };

      case 'suggestions':
        return {
          id,
          request,
          suggestions: await this.generateSuggestions(request, codeContext),
          generatedAt: new Date(),
          duration: Date.now() - startTime,
          cached: false,
          aiModelUsed: 'local',
          confidenceScore: 0.88,
        };

      case 'full':
      default:
        const [complexity, quality, securityIssues, suggestions] = await Promise.all([
          this.analyzeComplexity(request, codeContext),
          this.analyzeQuality(request, codeContext),
          this.analyzeSecurity(request),
          this.generateSuggestions(request, codeContext),
        ]);

        return {
          id,
          request,
          complexity,
          quality,
          securityIssues,
          suggestions,
          generatedAt: new Date(),
          duration: Date.now() - startTime,
          cached: false,
          aiModelUsed: 'local',
          confidenceScore: 0.93,
        };
    }
  }

  private async performAIAnalysis(request: AnalysisRequest, startTime: number): Promise<AnalysisResult> {
    const id = crypto.randomUUID();

    try {
      const aiResult = await this.callAIProvider(request);
      
      return {
        id,
        request,
        ...aiResult,
        generatedAt: new Date(),
        duration: Date.now() - startTime,
        cached: false,
        aiModelUsed: this.config.model,
        confidenceScore: aiResult.confidenceScore || 0.85,
      };
    } catch (error) {
      return this.performAnalysis(request, startTime);
    }
  }

  private async callAIProvider(request: AnalysisRequest): Promise<Partial<AnalysisResult>> {
    const prompt = this.buildAIPrompt(request);
    
    try {
      if (this.config.provider === 'siliconflow') {
        return await this.callSiliconFlow(prompt, request);
      } else if (this.config.provider === 'openai' || this.config.provider === 'hybrid') {
        return await this.callOpenAI(prompt, request);
      } else if (this.config.provider === 'claude') {
        return await this.callClaude(prompt, request);
      } else if (this.config.provider === 'gemini') {
        return await this.callGemini(prompt, request);
      }
    } catch {
      if (this.config.provider === 'hybrid') {
        return await this.callFallbackProvider(prompt, request);
      }
      throw new Error('AI provider failed');
    }
    
    return {};
  }

  private async callSiliconFlow(prompt: string, request: AnalysisRequest): Promise<Partial<AnalysisResult>> {
    if (!this.config.apiKey) {
      throw new Error('SiliconFlow API key not configured');
    }

    const baseUrl = this.config.baseUrl || 'https://api.siliconflow.cn/v1';
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || 'Qwen/Qwen2.5-7B-Instruct',
        messages: [
          {
            role: 'system',
            content: 'You are an expert code analysis assistant. Analyze the provided code and return JSON with detailed analysis.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      }),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SiliconFlow API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('Empty response from SiliconFlow');
    }

    return this.parseAIResponse(content);
  }

  private async callOpenAI(prompt: string, request: AnalysisRequest): Promise<Partial<AnalysisResult>> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1';
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert code analysis assistant. Analyze the provided code and return JSON with detailed analysis.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        response_format: { type: 'json_object' },
      }),
      timeout: this.config.timeout,
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return this.parseAIResponse(content);
  }

  private async callClaude(prompt: string, request: AnalysisRequest): Promise<Partial<AnalysisResult>> {
    if (!this.config.apiKey) {
      throw new Error('Claude API key not configured');
    }

    const baseUrl = this.config.baseUrl || 'https://api.anthropic.com/v1';
    
    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      }),
      timeout: this.config.timeout,
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;
    
    if (!content) {
      throw new Error('Empty response from Claude');
    }

    return this.parseAIResponse(content);
  }

  private async callGemini(prompt: string, request: AnalysisRequest): Promise<Partial<AnalysisResult>> {
    if (!this.config.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const baseUrl = this.config.baseUrl || 'https://generativelanguage.googleapis.com/v1';
    
    const response = await fetch(`${baseUrl}/models/${this.config.model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.config.apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: this.config.temperature,
          maxOutputTokens: this.config.maxTokens,
        },
      }),
      timeout: this.config.timeout,
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      throw new Error('Empty response from Gemini');
    }

    return this.parseAIResponse(content);
  }

  private async callFallbackProvider(prompt: string, request: AnalysisRequest): Promise<Partial<AnalysisResult>> {
    const providers: AIProvider[] = ['siliconflow', 'openai', 'claude', 'gemini'];
    const currentIndex = providers.indexOf(this.config.provider);
    
    for (let i = (currentIndex + 1) % providers.length; i !== currentIndex; i = (i + 1) % providers.length) {
      try {
        const originalProvider = this.config.provider;
        this.config.provider = providers[i];
        
        if (providers[i] === 'siliconflow') {
          return await this.callSiliconFlow(prompt, request);
        } else if (providers[i] === 'openai') {
          return await this.callOpenAI(prompt, request);
        } else if (providers[i] === 'claude') {
          return await this.callClaude(prompt, request);
        } else if (providers[i] === 'gemini') {
          return await this.callGemini(prompt, request);
        }
      } catch {
        continue;
      }
    }
    
    throw new Error('All AI providers failed');
  }

  private buildAIPrompt(request: AnalysisRequest): string {
    const contextInfo = request.context ? `
Context:
- File: ${request.context.filePath || 'unknown'}
- Project Type: ${request.context.projectType || 'unknown'}
- Framework: ${request.context.framework || 'unknown'}
${request.context.dependencies?.length ? `- Dependencies: ${request.context.dependencies.join(', ')}` : ''}
` : '';

    const optionsInfo = request.options ? `
Options:
${request.options.includeRefactoringSuggestions ? '- Include refactoring suggestions' : ''}
${request.options.includePerformanceTips ? '- Include performance tips' : ''}
${request.options.includeSecurityAnalysis ? '- Include security analysis' : ''}
${request.options.detailed ? '- Detailed analysis mode' : ''}
` : '';

    return `Analyze the following ${request.language} code and provide a comprehensive analysis.

${contextInfo}
${optionsInfo}

Code to analyze:
\`\`\`${request.language}
${request.code}
\`\`\`

Analysis Type: ${request.analysisType}

Return your response as JSON with these fields:
- complexity: { score, cyclomatic, cognitive, halstead: { volume, difficulty, effort, time, bugs }, maintainability, estimatedTimeToUnderstand, riskLevel }
- quality: { overall, readability, maintainability, performance, security, testability, issues: [{ severity, category, message, line, suggestion }] }
- suggestions: [{ type, priority, title, description, original, suggested, rationale, impact: { performance, maintainability, security }, effort }]
- securityIssues: [{ severity, category, message, line, cwe, fixSuggestion }]
- confidenceScore: number between 0 and 1
`;
  }

  private parseAIResponse(content: string): Partial<AnalysisResult> {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {};
    } catch {
      return {};
    }
  }

  private async analyzeCodeContext(request: AnalysisRequest): Promise<CodeContext> {
    const code = request.code;
    const lines = code.split('\n');
    
    const imports: string[] = [];
    const exports: string[] = [];
    const functions: FunctionInfo[] = [];
    const classes: ClassInfo[] = [];
    const variables: VariableInfo[] = [];

    const importPattern = /^(import|from)\s+['"`]/gm;
    const exportPattern = /^export\s+(default\s+)?(class|function|const|let|var)/gm;
    const functionPattern = /^(async\s+)?(function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(|let\s+\w+\s*=\s*(?:async\s*)?\()/gm;
    const classPattern = /^class\s+(\w+)(\s+extends\s+(\w+))?(\s+implements\s+([\w, ]+))?/gm;
    const variablePattern = /^(const|let|var)\s+(\w+)(\s*:\s*(\w+))?\s*=/gm;

    let match;
    while ((match = importPattern.exec(code)) !== null) {
      imports.push(match[0]);
    }

    while ((match = exportPattern.exec(code)) !== null) {
      exports.push(match[0]);
    }

    while ((match = functionPattern.exec(code)) !== null) {
      const lineNum = lines.findIndex(line => line.includes(match[0])) + 1;
      functions.push({
        name: match[0].split(/\s+/).filter(w => w && !['function', 'const', 'let', 'async', '='].includes(w))[0] || 'anonymous',
        parameters: [],
        returnType: '',
        line: lineNum,
        complexity: 1,
      });
    }

    while ((match = classPattern.exec(code)) !== null) {
      const lineNum = lines.findIndex(line => line.includes(match[0])) + 1;
      classes.push({
        name: match[1],
        extends: match[3],
        implements: match[5]?.split(',').map(s => s.trim()).filter(Boolean),
        methods: [],
        line: lineNum,
      });
    }

    while ((match = variablePattern.exec(code)) !== null) {
      const lineNum = lines.findIndex(line => line.includes(match[0])) + 1;
      variables.push({
        name: match[2],
        type: match[4],
        isConst: match[1] === 'const',
        line: lineNum,
      });
    }

    return {
      imports,
      exports,
      functions,
      classes,
      variables,
      dependencies: request.context?.dependencies || [],
    };
  }

  private async analyzeComplexity(request: AnalysisRequest, context: CodeContext): Promise<CodeComplexity> {
    const code = request.code;
    const lines = code.split('\n');

    const cyclomatic = this.calculateCyclomaticComplexity(code);
    const cognitive = this.calculateCognitiveComplexity(code);
    const halstead = this.calculateHalsteadMetrics(code);
    const maintainability = this.calculateMaintainabilityIndex(cyclomatic, halstead, lines.length);
    const hotspots = this.findComplexityHotspots(code, lines);

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
      hotspots,
    };
  }

  private findComplexityHotspots(code: string, lines: string[]): ComplexityHotspot[] {
    const hotspots: ComplexityHotspot[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (/^(if|while|for|switch|catch|\?)/.test(trimmed)) {
        const nestingLevel = (line.match(/^\s*/)?.[0]?.length || 0) / 2;
        if (nestingLevel > 3) {
          hotspots.push({
            line: i + 1,
            column: 1,
            complexity: nestingLevel,
            type: 'nesting',
            suggestion: 'Consider reducing nesting depth by extracting inner logic into separate functions',
          });
        }
      }
    }
    
    return hotspots.slice(0, 10);
  }

  private calculateCyclomaticComplexity(code: string): number {
    let complexity = 1;
    const patterns = [
      /\bif\b(?!\s*\()/g,
      /\belse\s+if\b/g,
      /\bwhile\b/g,
      /\bfor\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\b\?\s*[^:]+:[^:]+\b/g,
      /\b&&\b/g,
      /\b\|\|\b/g,
      /\bdo\s+while\b/g,
      /\breturn\b/g,
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

  private async analyzeQuality(request: AnalysisRequest, context: CodeContext): Promise<CodeQuality> {
    const code = request.code;
    const issues: QualityIssue[] = [];

    const lines = code.split('\n');
    const linesOfCode = lines.length;
    const functionsCount = context.functions.length;
    const classesCount = context.classes.length;
    
    const commentLines = code.match(/\/\/.*$|\/\*[\s\S]*?\*\/|#.*$/gm)?.length || 0;
    const commentDensity = Math.round((commentLines / linesOfCode) * 100);
    
    const maxNestingDepth = this.calculateMaxNestingDepth(code);

    const readability = this.assessReadability(code, issues);
    const maintainability = this.assessMaintainability(code, issues, functionsCount, linesOfCode, commentDensity);
    const performance = this.assessPerformance(code, issues);
    const security = this.assessSecurityScore(code);
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
      metrics: {
        linesOfCode,
        functionsCount,
        classesCount,
        commentDensity,
        averageFunctionLength: functionsCount > 0 ? Math.round(linesOfCode / functionsCount) : 0,
        maxNestingDepth,
      },
    };
  }

  private calculateMaxNestingDepth(code: string): number {
    let maxDepth = 0;
    let currentDepth = 0;
    
    for (const char of code) {
      if (char === '{') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === '}') {
        currentDepth--;
      }
    }
    
    return maxDepth;
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
          code: line.trim(),
        });
        score -= 2;
      }

      if (/^[A-Z]+$/.test(line.trim()) && line.length > 3) {
        issues.push({
          severity: 'info',
          category: 'readability',
          message: `Line ${i + 1} contains all uppercase text which may indicate magic constants`,
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

  private assessMaintainability(code: string, issues: QualityIssue[], functionsCount: number, linesOfCode: number, commentDensity: number): number {
    let score = 100;

    if (functionsCount > 20) {
      issues.push({
        severity: 'warning',
        category: 'maintainability',
        message: `Too many functions/classes (${functionsCount}). Consider breaking into modules.`,
        suggestion: 'Split into multiple modules or classes',
      });
      score -= 10;
    }

    if (linesOfCode > 500) {
      issues.push({
        severity: 'warning',
        category: 'maintainability',
        message: `File has ${linesOfCode} lines. Consider splitting.`,
        suggestion: 'Break into smaller, focused files',
      });
      score -= 15;
    }

    if (commentDensity < 10) {
      issues.push({
        severity: 'info',
        category: 'maintainability',
        message: `Low comment density (${commentDensity}%). Consider adding more documentation.`,
        suggestion: 'Add JSDoc comments for functions and classes',
      });
      score -= 5;
    }

    const longFunctions = code.match(/function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\}/g)?.filter(f => f.split('\n').length > 50) || [];
    if (longFunctions.length > 3) {
      issues.push({
        severity: 'warning',
        category: 'maintainability',
        message: `${longFunctions.length} functions exceed 50 lines`,
        suggestion: 'Extract long functions into smaller helper functions',
      });
      score -= 8;
    }

    return Math.max(0, score);
  }

  private assessPerformance(code: string, issues: QualityIssue[]): number {
    let score = 100;

    const performancePatterns = [
      { pattern: /\.forEach\s*\(/g, message: 'Using forEach. Consider for...of or map for better performance', severity: 'info' as const, penalty: 3 },
      { pattern: /JSON\.parse\s*\(.*JSON\.stringify/g, message: 'Deep cloning using JSON.parse/stringify detected', severity: 'warning' as const, penalty: 5 },
      { pattern: /new\s+Array\s*\(\s*\)/g, message: 'Array constructor detected', severity: 'info' as const, penalty: 2 },
      { pattern: /for\s*\(\s*var\s+/g, message: 'Using var in for loop. Consider let or const', severity: 'info' as const, penalty: 2 },
      { pattern: /\beval\s*\(/g, message: 'eval() is slow and insecure', severity: 'warning' as const, penalty: 10 },
      { pattern: /document\.getElementById|document\.getElementsBy/g, message: 'Using outdated DOM methods', severity: 'info' as const, penalty: 3 },
    ];

    for (const { pattern, message, severity, penalty } of performancePatterns) {
      if (pattern.test(code)) {
        issues.push({
          severity,
          category: 'performance',
          message,
          suggestion: 'Use more modern and performant alternatives',
        });
        score -= penalty;
      }
    }

    return Math.max(0, score);
  }

  private assessSecurityScore(code: string): number {
    let score = 100;

    const securityPatterns = [
      { pattern: /eval\s*\(/g, penalty: 20 },
      { pattern: /innerHTML\s*=/g, penalty: 15 },
      { pattern: /document\.write\s*\(/g, penalty: 15 },
      { pattern: /password\s*=\s*['"`][^'"`]+['"`]/gi, penalty: 25 },
      { pattern: /secret\s*=\s*['"`][^'"`]+['"`]/gi, penalty: 25 },
      { pattern: /api[_-]?key\s*=\s*['"`][^'"`]+['"`]/gi, penalty: 25 },
      { pattern: /SQL\s*\+\s*['"`]/gi, penalty: 25 },
    ];

    for (const { pattern, penalty } of securityPatterns) {
      if (pattern.test(code)) {
        score -= penalty;
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

  private async analyzeSecurity(request: AnalysisRequest): Promise<SecurityIssue[]> {
    const code = request.code;
    const issues: SecurityIssue[] = [];

    const securityPatterns: Array<{
      pattern: RegExp;
      category: SecurityIssue['category'];
      message: string;
      severity: SecurityIssue['severity'];
      cwe?: string;
      cvssScore?: number;
      fixSuggestion: string;
    }> = [
      {
        pattern: /eval\s*\(/g,
        category: 'other',
        message: 'Use of eval() is a security risk',
        severity: 'critical',
        cwe: 'CWE-95',
        cvssScore: 9.8,
        fixSuggestion: 'Avoid using eval(). Use safer alternatives like JSON.parse() or function constructors.',
      },
      {
        pattern: /innerHTML\s*=/g,
        category: 'xss',
        message: 'Direct innerHTML assignment can lead to XSS',
        severity: 'critical',
        cwe: 'CWE-79',
        cvssScore: 6.1,
        fixSuggestion: 'Use textContent instead of innerHTML, or sanitize user input before insertion.',
      },
      {
        pattern: /document\.write\s*\(/g,
        category: 'xss',
        message: 'document.write() can lead to XSS',
        severity: 'high',
        cwe: 'CWE-79',
        cvssScore: 6.1,
        fixSuggestion: 'Use safer DOM manipulation methods like appendChild().',
      },
      {
        pattern: /password\s*=\s*['"`][^'"`]+['"`]/gi,
        category: 'hardcoded-secret',
        message: 'Hardcoded password detected',
        severity: 'critical',
        cwe: 'CWE-798',
        cvssScore: 7.5,
        fixSuggestion: 'Store passwords in environment variables or a secure secrets manager.',
      },
      {
        pattern: /secret\s*=\s*['"`][^'"`]+['"`]/gi,
        category: 'hardcoded-secret',
        message: 'Hardcoded secret detected',
        severity: 'critical',
        cwe: 'CWE-798',
        cvssScore: 7.5,
        fixSuggestion: 'Store secrets in environment variables or a secure secrets manager.',
      },
      {
        pattern: /api[_-]?key\s*=\s*['"`][^'"`]+['"`]/gi,
        category: 'hardcoded-secret',
        message: 'Hardcoded API key detected',
        severity: 'critical',
        cwe: 'CWE-798',
        cvssScore: 7.5,
        fixSuggestion: 'Store API keys in environment variables or a secrets manager.',
      },
      {
        pattern: /SQL\s*\+\s*['"`]/gi,
        category: 'sql-injection',
        message: 'Potential SQL injection vulnerability',
        severity: 'critical',
        cwe: 'CWE-89',
        cvssScore: 8.8,
        fixSuggestion: 'Use parameterized queries or prepared statements instead of string concatenation.',
      },
      {
        pattern: /\b(path|file|dir)\s*[=:]\s*['"`].*(\.\.\/|\/etc\/|\/home\/)/gi,
        category: 'path-traversal',
        message: 'Potential path traversal vulnerability',
        severity: 'high',
        cwe: 'CWE-22',
        cvssScore: 7.5,
        fixSuggestion: 'Validate and sanitize user input before using it in file paths.',
      },
      {
        pattern: /(crypto\.createHash|createHash)\s*\(\s*['"`]md5['"`]/g,
        category: 'weak-crypto',
        message: 'Using weak MD5 hash algorithm',
        severity: 'high',
        cwe: 'CWE-327',
        cvssScore: 5.9,
        fixSuggestion: 'Use a stronger hash algorithm like SHA-256 or SHA-3.',
      },
      {
        pattern: /localStorage\s*\.\s*(setItem|getItem)/g,
        category: 'insecure-config',
        message: 'Storing sensitive data in localStorage',
        severity: 'warning',
        cwe: 'CWE-522',
        cvssScore: 5.9,
        fixSuggestion: 'Avoid storing sensitive information in localStorage. Use secure HTTP cookies instead.',
      },
    ];

    for (const { pattern, category, message, severity, cwe, cvssScore, fixSuggestion } of securityPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        issues.push({
          severity,
          category,
          message,
          cwe,
          cvssScore,
          fixSuggestion,
        });
      }
    }

    return issues.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, warning: 2, info: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  private async generatePerformanceSuggestions(request: AnalysisRequest, context: CodeContext): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];
    const code = request.code;

    if (code.includes('.forEach')) {
      suggestions.push({
        type: 'performance',
        priority: 'medium',
        title: 'Replace forEach with for...of',
        description: 'forEach has higher overhead compared to native for loops.',
        original: 'array.forEach(callback)',
        suggested: 'for (const item of array) { ... }',
        rationale: 'for...of loops are generally faster than forEach callbacks',
        impact: { performance: 15 },
        effort: 'low',
        estimatedImpact: 15,
      });
    }

    if (/JSON\.parse\s*\(.*JSON\.stringify/.test(code)) {
      suggestions.push({
        type: 'performance',
        priority: 'high',
        title: 'Replace JSON deep clone',
        description: 'JSON.parse(JSON.stringify()) is inefficient for deep cloning.',
        original: 'JSON.parse(JSON.stringify(obj))',
        suggested: 'structuredClone(obj) or custom clone function',
        rationale: 'structuredClone is optimized and handles more types',
        impact: { performance: 25 },
        effort: 'low',
        estimatedImpact: 25,
      });
    }

    if (code.includes('indexOf') && !code.includes('Set') && !code.includes('Map')) {
      suggestions.push({
        type: 'performance',
        priority: 'medium',
        title: 'Use Set for membership checks',
        description: 'Array.indexOf() is O(n), Set.has() is O(1).',
        original: 'array.indexOf(item) !== -1',
        suggested: 'new Set(array).has(item)',
        rationale: 'Set provides constant-time membership checks',
        impact: { performance: 20 },
        effort: 'low',
        estimatedImpact: 20,
      });
    }

    return suggestions;
  }

  private async generateSuggestions(request: AnalysisRequest, context: CodeContext): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];
    const complexity = await this.analyzeComplexity(request, context);
    const quality = await this.analyzeQuality(request, context);

    if (complexity.score > 40) {
      suggestions.push({
        type: 'refactor',
        priority: 'high',
        title: 'High Cyclomatic Complexity',
        description: 'This code has high cyclomatic complexity which makes it harder to test and maintain.',
        original: 'Multiple nested conditionals and loops',
        suggested: 'Extract methods or use strategy pattern',
        rationale: 'Reduces complexity and improves maintainability',
        impact: { maintainability: 30, performance: 5 },
        effort: 'medium',
        estimatedImpact: 35,
      });
    }

    if (complexity.hotspots.length > 0) {
      suggestions.push({
        type: 'refactor',
        priority: 'medium',
        title: 'Reduce Nesting Depth',
        description: `Found ${complexity.hotspots.length} nesting hotspots in the code.`,
        original: 'Deeply nested code',
        suggested: 'Extract inner logic into helper functions',
        rationale: 'Improves readability and testability',
        impact: { maintainability: 25, readability: 20 },
        effort: 'medium',
        estimatedImpact: 45,
      });
    }

    if (quality.security < 80) {
      suggestions.push({
        type: 'security',
        priority: 'critical',
        title: 'Security Issues Detected',
        description: 'Multiple security issues found in the code.',
        original: 'Potential vulnerabilities detected',
        suggested: 'Review and fix security issues',
        rationale: 'Prevents security breaches',
        impact: { security: 50 },
        effort: 'high',
        estimatedImpact: 50,
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
        impact: { maintainability: 20, readability: 25 },
        effort: 'low',
        estimatedImpact: 45,
      });
    }

    if (quality.maintainability < 65) {
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
        estimatedImpact: 40,
      });
    }

    if (quality.performance < 85) {
      suggestions.push({
        type: 'performance',
        priority: 'high',
        title: 'Performance Optimization',
        description: 'Potential performance bottlenecks detected.',
        original: 'Suboptimal patterns',
        suggested: 'Use more efficient patterns',
        rationale: 'Better performance improves user experience',
        impact: { performance: 30 },
        effort: 'medium',
        estimatedImpact: 30,
      });
    }

    if (quality.metrics.commentDensity < 10) {
      suggestions.push({
        type: 'documentation',
        priority: 'low',
        title: 'Add Documentation',
        description: 'Consider adding more documentation to the code.',
        original: 'Minimal or no comments',
        suggested: 'Add JSDoc comments and inline documentation',
        rationale: 'Better documentation helps other developers understand the code',
        impact: { maintainability: 15, readability: 10 },
        effort: 'low',
        estimatedImpact: 25,
      });
    }

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

  public getConfig(): AIConfig {
    return { ...this.config, apiKey: '***' };
  }

  public updateConfig(config: Partial<AIConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export default EnhancedAIService;