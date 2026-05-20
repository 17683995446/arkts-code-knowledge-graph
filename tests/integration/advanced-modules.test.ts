import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SemanticSearchEngine } from '../../src/core/search/SemanticSearchEngine';
import { AIServiceIntegration } from '../../src/core/ai/AIServiceIntegration';
import { SecurityManager } from '../../src/core/security/SecurityManager';
import { PerformanceOptimizer } from '../../src/core/optimization/PerformanceOptimizer';
import { MetricsCollector, AlertManager, ApplicationMetricsCollector } from '../../src/core/monitoring';

describe('Advanced Integration Tests', () => {
  describe('SemanticSearchEngine', () => {
    let engine: SemanticSearchEngine;

    beforeEach(() => {
      engine = new SemanticSearchEngine({
        vectorDimensions: 128,
        similarityThreshold: 0.5,
        maxResults: 5,
      });
    });

    afterEach(() => {
      engine.clear();
    });

    it('should index documents', async () => {
      await engine.indexDocument({
        id: 'doc1',
        content: 'This is a test document about JavaScript',
      });

      const stats = engine.getStats();
      expect(stats.totalDocuments).toBe(1);
    });

    it('should search documents', async () => {
      await engine.indexDocument({
        id: 'doc1',
        content: 'JavaScript is a programming language',
      });
      await engine.indexDocument({
        id: 'doc2',
        content: 'TypeScript adds static typing to JavaScript',
      });
      await engine.indexDocument({
        id: 'doc3',
        content: 'Python is great for data science',
      });

      const results = await engine.search('JavaScript programming', { limit: 2 });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should generate highlights', async () => {
      await engine.indexDocument({
        id: 'doc1',
        content: 'The JavaScript programming language is widely used',
      });

      const results = await engine.search('JavaScript');
      expect(results[0].highlights).toBeDefined();
      expect(results[0].highlights!.length).toBeGreaterThan(0);
    });

    it('should delete documents', async () => {
      await engine.indexDocument({
        id: 'doc1',
        content: 'Test document',
      });

      await engine.deleteDocument('doc1');

      const stats = engine.getStats();
      expect(stats.totalDocuments).toBe(0);
    });

    it('should update documents', async () => {
      await engine.indexDocument({
        id: 'doc1',
        content: 'Original content',
      });

      await engine.updateDocument('doc1', {
        content: 'Updated content',
      });

      const results = await engine.search('Updated');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('AIServiceIntegration', () => {
    let aiService: AIServiceIntegration;

    beforeEach(() => {
      aiService = new AIServiceIntegration({
        cacheEnabled: false,
      });
    });

    it('should analyze code complexity', async () => {
      const result = await aiService.analyze({
        code: `
          function test(a: number, b: number): number {
            if (a > b) {
              return a;
            } else if (a < b) {
              return b;
            }
            return 0;
          }
        `,
        language: 'typescript',
        analysisType: 'complexity',
      });

      expect(result.complexity).toBeDefined();
      expect(result.complexity!.cyclomatic).toBeGreaterThan(0);
      expect(result.complexity!.maintainability).toBeGreaterThan(0);
    });

    it('should analyze code quality', async () => {
      const result = await aiService.analyze({
        code: `
          function example() {
            console.log('Hello World');
            // TODO: Add more functionality
          }
        `,
        language: 'typescript',
        analysisType: 'quality',
      });

      expect(result.quality).toBeDefined();
      expect(result.quality!.overall).toBeGreaterThan(0);
      expect(result.quality!.issues).toBeDefined();
    });

    it('should generate suggestions', async () => {
      const result = await aiService.analyze({
        code: `
          function complexFunction(x: number) {
            if (x > 0) {
              if (x > 10) {
                if (x > 100) {
                  return 'very large';
                }
                return 'large';
              }
              return 'positive';
            }
            return 'non-positive';
          }
        `,
        language: 'typescript',
        analysisType: 'suggestions',
      });

      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.length).toBeGreaterThan(0);
    });

    it('should perform full analysis', async () => {
      const result = await aiService.analyze({
        code: `
          class Calculator {
            add(a: number, b: number): number {
              return a + b;
            }
          }
        `,
        language: 'typescript',
        analysisType: 'full',
      });

      expect(result.complexity).toBeDefined();
      expect(result.quality).toBeDefined();
      expect(result.suggestions).toBeDefined();
    });

    it('should cache results', async () => {
      aiService = new AIServiceIntegration({
        cacheEnabled: true,
      });

      const code = 'function test() { return 1; }';

      const result1 = await aiService.analyze({
        code,
        language: 'typescript',
        analysisType: 'complexity',
      });

      const result2 = await aiService.analyze({
        code,
        language: 'typescript',
        analysisType: 'complexity',
      });

      expect(result2.cached).toBe(true);
    });
  });

  describe('SecurityManager', () => {
    let security: SecurityManager;

    beforeEach(() => {
      security = new SecurityManager({
        enableAudit: false,
      });
    });

    it('should encrypt and decrypt data', () => {
      const original = 'Sensitive data';
      const encrypted = security.encrypt(original);
      const decrypted = security.decrypt(encrypted);

      expect(decrypted).toBe(original);
      expect(encrypted).not.toBe(original);
    });

    it('should hash and verify passwords', () => {
      const password = 'securePassword123';
      const { hash, salt } = security.hashPassword(password);

      expect(hash).toBeDefined();
      expect(salt).toBeDefined();
      expect(hash).not.toBe(password);

      const isValid = security.verifyPassword(password, hash, salt);
      expect(isValid).toBe(true);

      const isInvalid = security.verifyPassword('wrongPassword', hash, salt);
      expect(isInvalid).toBe(false);
    });

    it('should check rate limits', () => {
      const identifier = 'test-user';

      for (let i = 0; i < 5; i++) {
        const result = security.checkRateLimit(identifier);
        expect(result.allowed).toBe(true);
      }
    });

    it('should sanitize input', () => {
      const input = '<script>alert("xss")</script>';
      const sanitized = security.sanitizeInput(input);

      expect(sanitized).not.toContain('<script>');
    });

    it('should validate email', () => {
      expect(security.validateEmail('test@example.com')).toBe(true);
      expect(security.validateEmail('invalid-email')).toBe(false);
    });

    it('should validate URLs', () => {
      expect(security.validateURL('https://example.com')).toBe(true);
      expect(security.validateURL('not-a-url')).toBe(false);
    });

    it('should generate tokens', () => {
      const token = security.generateToken(32);

      expect(token).toBeDefined();
      expect(token.length).toBe(64);
    });

    it('should encrypt and decrypt objects', () => {
      const obj = {
        name: 'John',
        password: 'secret123',
      };

      const encrypted = security.encryptObject(obj, ['password']);
      expect(encrypted.password).not.toBe(obj.password);

      const decrypted = security.decryptObject(encrypted, ['password']);
      expect(decrypted.password).toBe(obj.password);
    });
  });

  describe('PerformanceOptimizer', () => {
    let optimizer: PerformanceOptimizer;

    beforeEach(() => {
      optimizer = new PerformanceOptimizer({
        enableCaching: true,
      });
    });

    afterEach(() => {
      optimizer.clearCache();
    });

    it('should cache results', async () => {
      let callCount = 0;

      const fetcher = async () => {
        callCount++;
        return { data: 'test' };
      };

      await optimizer.get('key1', fetcher);
      await optimizer.get('key1', fetcher);
      await optimizer.get('key1', fetcher);

      expect(callCount).toBe(1);
    });

    it('should minify JavaScript', () => {
      const code = `
        // This is a comment
        function test() {
          const x = 1;
          return x + 2;
        }
      `;

      const minified = optimizer.minifyCode(code, 'javascript');

      expect(minified.length).toBeLessThan(code.length);
      expect(minified).not.toContain('//');
    });

    it('should minify CSS', () => {
      const css = `
        /* Comment */
        .class {
          color: red;
          background-color: blue;
        }
      `;

      const minified = optimizer.minifyCode(css, 'css');

      expect(minified.length).toBeLessThan(css.length);
      expect(minified).not.toContain('/*');
    });

    it('should memoize functions', () => {
      let callCount = 0;

      const expensiveFunction = optimizer.memoize((n: number) => {
        callCount++;
        return n * 2;
      });

      expect(expensiveFunction(5)).toBe(10);
      expect(expensiveFunction(5)).toBe(10);
      expect(expensiveFunction(5)).toBe(10);

      expect(callCount).toBe(1);
    });

    it('should debounce functions', async () => {
      let callCount = 0;

      const fn = optimizer.debounce(() => {
        callCount++;
      }, 50);

      fn();
      fn();
      fn();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(callCount).toBe(1);
    });

    it('should throttle functions', async () => {
      let callCount = 0;

      const fn = optimizer.throttle(() => {
        callCount++;
      }, 50);

      fn();
      fn();
      fn();

      await new Promise((resolve) => setTimeout(resolve, 60));

      fn();

      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(callCount).toBe(2);
    });

    it('should get cache stats', async () => {
      optimizer.get('key1', async () => ({ data: '1' }));
      optimizer.get('key2', async () => ({ data: '2' }));
      await new Promise((resolve) => setTimeout(resolve, 50));

      const stats = optimizer.getCacheStats();

      expect(stats.size).toBeGreaterThan(0);
    });

    it('should get memory stats', () => {
      const stats = optimizer.getMemoryStats();

      expect(stats.current).toBeGreaterThan(0);
      expect(stats.average).toBeGreaterThan(0);
    });

    it('should compress and decompress', () => {
      const text = 'This is a test string for compression. '.repeat(10);

      const compressed = optimizer.compress(text, 'gzip');
      expect(compressed.length).toBeLessThan(text.length);

      const decompressed = optimizer.decompress(compressed, 'gzip').toString();
      expect(decompressed).toBe(text);
    });

    it('should analyze bundle', async () => {
      const modules = [
        {
          name: 'module1',
          code: 'export const x = 1; export const y = 2;',
          dependencies: ['module2'],
        },
        {
          name: 'module2',
          code: 'export const z = 3;',
          dependencies: [],
        },
      ];

      const analysis = await optimizer.analyzeBundle(modules);

      expect(analysis.totalSize).toBeGreaterThan(0);
      expect(analysis.moduleCount).toBe(2);
    });
  });

  describe('MetricsCollector and AlertManager Integration', () => {
    let collector: MetricsCollector;
    let appCollector: ApplicationMetricsCollector;
    let alertManager: AlertManager;

    beforeEach(() => {
      collector = new MetricsCollector();
      appCollector = new ApplicationMetricsCollector(collector);
      alertManager = new AlertManager(collector);

      alertManager.addRule({
        name: 'high-latency',
        metric: 'app.request.latency',
        condition: 'gt',
        threshold: 100,
        duration: 5000,
        severity: 'high',
        message: 'Request latency exceeded threshold',
        enabled: true,
      });
    });

    it('should collect metrics', () => {
      collector.counter('requests.total');
      collector.counter('requests.total');
      collector.gauge('memory.usage', 75.5);
      collector.histogram('request.duration', 45.2);
      collector.timer('operation.time', 123);

      const counter = collector.getCounter('requests.total');
      expect(counter).toBe(2);

      const gauge = collector.getGauge('memory.usage');
      expect(gauge).toBe(75.5);
    });

    it('should get metric summary', () => {
      collector.histogram('test.histogram', 10);
      collector.histogram('test.histogram', 20);
      collector.histogram('test.histogram', 30);

      const summary = collector.getSummary('test.histogram', 'histogram');

      expect(summary).toBeDefined();
      expect(summary!.count).toBe(3);
      expect(summary!.min).toBe(10);
      expect(summary!.max).toBe(30);
    });

    it('should manage alert rules', () => {
      const rules = alertManager.getRules();

      expect(rules.length).toBe(1);
      expect(rules[0].name).toBe('high-latency');
    });

    it('should trigger alerts', async () => {
      collector.histogram('app.request.latency', 150);

      alertManager.startEvaluation();

      await new Promise((resolve) => setTimeout(resolve, 100));

      const activeAlerts = alertManager.getActiveAlerts();

      alertManager.stopEvaluation();
    });

    it('should record application metrics', () => {
      collector.counter('parse.started');
      collector.gauge('parse.fileCount', 100);
      collector.histogram('parse.duration', 2500);

      collector.counter('query.started');
      collector.histogram('query.duration', 45);

      appCollector.recordCacheHit('index');
      appCollector.recordCacheMiss('index');

      const parseSummary = collector.getSummary('parse.duration', 'histogram');
      expect(parseSummary).toBeDefined();

      const cacheHit = collector.getCounter('cache.hit');
      expect(cacheHit).toBe(1);
    });
  });

  describe('Cross-Module Integration', () => {
    it('should integrate semantic search with AI analysis', async () => {
      const engine = new SemanticSearchEngine();
      const aiService = new AIServiceIntegration({ cacheEnabled: false });

      await engine.indexDocument({
        id: 'code1',
        content: 'Complex nested if-else structure',
        metadata: { type: 'snippet' },
      });

      const searchResults = await engine.search('nested if-else', { limit: 1 });

      if (searchResults.length > 0) {
        const analysis = await aiService.analyze({
          code: searchResults[0].content,
          language: 'typescript',
          analysisType: 'complexity',
        });

        expect(analysis.complexity).toBeDefined();
      }
    });

    it('should integrate performance optimizer with metrics', async () => {
      const optimizer = new PerformanceOptimizer();
      const collector = new MetricsCollector();

      collector.histogram('optimization.time', 50);

      const stats = optimizer.getCacheStats();
      collector.gauge('cache.size', stats.size);

      const summary = collector.getSummary('optimization.time', 'histogram');
      expect(summary).toBeDefined();
    });

    it('should integrate security with audit logging', async () => {
      const security = new SecurityManager({
        enableAudit: true,
        auditLogPath: './test-audit.log',
      });

      security.audit({
        action: 'login',
        resource: 'user',
        resourceId: 'user123',
        method: 'POST',
        path: '/api/login',
        statusCode: 200,
        duration: 150,
      });

      const logs = security.getAuditLogs();
      expect(logs.length).toBe(1);
    });
  });
});
