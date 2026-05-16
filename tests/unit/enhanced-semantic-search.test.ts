import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SemanticVectorSearch } from '../../src/core/semantic-search/SemanticVectorSearch';
import { KnowledgeGraphDatabase } from '../../src/core/knowledge-graph/KnowledgeGraphDatabase';
import * as path from 'path';
import * as fs from 'fs';

describe('Enhanced Semantic Search', () => {
  let tempDir: string;
  
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(process.cwd(), '.temp-vector-search-test-'));
  });
  
  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('Vector Model Types', () => {
    it('should initialize with simple model', async () => {
      const search = new SemanticVectorSearch(tempDir, true, 'simple');
      await search.initialize();
      
      // Should not throw any errors
      expect(true).toBe(true);
    });

    it('should initialize with tfidf model (default)', async () => {
      const search = new SemanticVectorSearch(tempDir, true, 'tfidf');
      await search.initialize();
      
      // Should not throw any errors
      expect(true).toBe(true);
    });

    it('should initialize with local model', async () => {
      const search = new SemanticVectorSearch(tempDir, true, 'local');
      await search.initialize();
      
      // Should not throw any errors
      expect(true).toBe(true);
    });
  });

  describe('Search Functionality', () => {
    it('should perform semantic search with different queries', async () => {
      const search = new SemanticVectorSearch(tempDir, true, 'tfidf');
      await search.initialize();
      
      // Add test entities
      const entities = [
        {
          id: 'class-calculator',
          data: {
            type: 'Class',
            className: 'Calculator',
            isExported: true,
            isDefaultExport: false,
            accessModifiers: ['public']
          },
          text: 'Type: Class. Class: Calculator. Modifiers: public'
        },
        {
          id: 'function-add',
          data: {
            type: 'Function',
            functionName: 'add',
            isAsyncFunction: false,
            isExported: true,
            isDefaultExport: false,
            isGeneratorFunction: false,
            parameters: [],
            accessModifiers: []
          },
          text: 'Type: Function. Function: add'
        },
        {
          id: 'file-utils',
          data: {
            type: 'File',
            filePath: '/tmp/utils.ts',
            fileName: 'utils',
            fileExtension: '.ts',
            linesOfCode: 100,
            lastModifiedTimestamp: Date.now(),
            contentHash: 'abc123'
          },
          text: 'Type: File. File: utils. Path: /tmp/utils.ts'
        }
      ];

      // Add all entities
      for (const entity of entities) {
        await search.addEntityToIndex(entity.id, entity.data as any, entity.text);
      }

      // Search for calculator
      const calculatorResults = await search.searchEntities('calculator');
      expect(calculatorResults.length).toBeGreaterThan(0);

      // Search for function
      const functionResults = await search.searchEntities('function add');
      expect(functionResults.length).toBeGreaterThan(0);

      // Search for utils
      const utilsResults = await search.searchEntities('utils');
      expect(utilsResults.length).toBeGreaterThan(0);
    });
  });

  describe('Knowledge Graph Integration', () => {
    it('should add entities from knowledge graph successfully', async () => {
      const graph = new KnowledgeGraphDatabase({ persistToFileSystem: false });
      
      // Add test entities
      graph.addCodeEntity('test-class', {
        type: 'Class',
        className: 'TestClass',
        isAbstract: false,
        isExported: true,
        isDefaultExport: false,
        accessModifiers: []
      });
      
      graph.addCodeEntity('test-function', {
        type: 'Function',
        functionName: 'testFunction',
        isAsyncFunction: false,
        isExported: true,
        isDefaultExport: false,
        isGeneratorFunction: false,
        parameters: [],
        accessModifiers: []
      });
      
      const search = new SemanticVectorSearch(tempDir, true, 'tfidf');
      await search.initialize();
      await search.addEntitiesFromGraph(graph);
      
      // Should be able to search for these entities
      const results = await search.searchEntities('TestClass');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Index Management', () => {
    it('should clear index and remove all entities', async () => {
      const search = new SemanticVectorSearch(tempDir, true, 'tfidf');
      await search.initialize();
      
      // Add an entity
      await search.addEntityToIndex('test-entity', {
        type: 'Function',
        functionName: 'test',
        isAsyncFunction: false,
        isExported: true,
        isDefaultExport: false,
        isGeneratorFunction: false,
        parameters: [],
        accessModifiers: []
      }, 'Type: Function. Function: test');
      
      // Search should find it
      const initialResults = await search.searchEntities('test');
      expect(initialResults.length).toBeGreaterThan(0);
      
      // Clear the index
      await search.clearIndex();
      
      // Search should not find anything
      const afterClearResults = await search.searchEntities('test');
      expect(afterClearResults.length).toBe(0);
    });

    it('should remove specific entity from index', async () => {
      const search = new SemanticVectorSearch(tempDir, true, 'tfidf');
      await search.initialize();
      
      // Add multiple entities
      const entity1Id = 'entity-1';
      const entity2Id = 'entity-2';
      
      await search.addEntityToIndex(entity1Id, {
        type: 'Function',
        functionName: 'function1',
        isAsyncFunction: false,
        isExported: true,
        isDefaultExport: false,
        isGeneratorFunction: false,
        parameters: [],
        accessModifiers: []
      }, 'Type: Function. Function: function1');
      
      await search.addEntityToIndex(entity2Id, {
        type: 'Function',
        functionName: 'function2',
        isAsyncFunction: false,
        isExported: true,
        isDefaultExport: false,
        isGeneratorFunction: false,
        parameters: [],
        accessModifiers: []
      }, 'Type: Function. Function: function2');
      
      // Remove entity 1
      await search.removeEntityFromIndex(entity1Id);
      
      // Should still find entity 2
      const results = await search.searchEntities('function2');
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
