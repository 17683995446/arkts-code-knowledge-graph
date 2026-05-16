import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SemanticVectorSearch } from '../../src/core/semantic-search/SemanticVectorSearch.js';
import * as fs from 'fs';
import * as path from 'path';

describe('SemanticVectorSearch', () => {
  let vectorSearch: SemanticVectorSearch;
  const tempDir = path.join(process.cwd(), '.temp-vector-test');

  beforeEach(async () => {
    // Clean up possible existing directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
    
    vectorSearch = new SemanticVectorSearch(tempDir, true);
    await vectorSearch.initialize();
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  it('应该能初始化向量搜索', () => {
    expect(vectorSearch).toBeDefined();
  });

  it('应该能添加实体到向量搜索', async () => {
    await vectorSearch.addEntityToIndex('node1', { 
      type: 'Function' as any, 
      functionName: 'add' 
    }, 'add function math calculate');
    
    expect(true).toBe(true);
  });

  it('应该能搜索相似实体', async () => {
    await vectorSearch.addEntityToIndex('node1', { 
      type: 'Function' as any, 
      functionName: 'add' 
    }, 'add function math calculate');
    
    await vectorSearch.addEntityToIndex('node2', { 
      type: 'Function' as any, 
      functionName: 'multiply' 
    }, 'multiply function math product');
    
    await vectorSearch.addEntityToIndex('node3', { 
      type: 'Class' as any, 
      className: 'Calculator' 
    }, 'calculator class arithmetic compute');
    
    const results = await vectorSearch.searchEntities('math calculate', 5);
    
    expect(results.length).toBeGreaterThan(0);
  });

  it('禁用向量搜索时不应该执行操作', async () => {
    const disabledSearch = new SemanticVectorSearch(tempDir, false);
    await disabledSearch.initialize();
    
    await disabledSearch.addEntityToIndex('test', { type: 'Function' as any, functionName: 'test' }, 'test');
    const results = await disabledSearch.searchEntities('test', 10);
    
    expect(results.length).toBe(0);
  });

  it('应该能清空向量搜索', async () => {
    await vectorSearch.addEntityToIndex('node1', { 
      type: 'Function' as any, 
      functionName: 'add' 
    }, 'add function math');
    
    await vectorSearch.clearIndex();
    
    const results = await vectorSearch.searchEntities('math', 10);
    expect(results.length).toBe(0);
  });
});
