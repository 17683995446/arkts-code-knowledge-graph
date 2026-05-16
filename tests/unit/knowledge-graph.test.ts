import { describe, it, beforeEach, expect } from 'vitest';
import { KnowledgeGraphDatabase } from '../../src/core/knowledge-graph/KnowledgeGraphDatabase.js';
import { CodeEntityType, CodeRelationType } from '../../src/shared/types.js';
import { generateUniqueIdentifier } from '../../src/shared/utilities.js';

describe('KnowledgeGraphDatabase', () => {
  let db: KnowledgeGraphDatabase;

  beforeEach(() => {
    db = new KnowledgeGraphDatabase({ persistToFileSystem: false });
  });

  it('should add and retrieve a code entity', () => {
    const entityId = generateUniqueIdentifier();
    const entityData = {
      type: CodeEntityType.CLASS,
      className: 'TestClass',
      isAbstract: false,
      isExported: true,
      isDefaultExport: false,
      accessModifiers: []
    };

    db.addCodeEntity(entityId, entityData);

    const result = db.getCodeEntity(entityId);
    expect(result).toEqual(entityData);
  });

  it('should add and retrieve a code relation', () => {
    const sourceId = generateUniqueIdentifier();
    const targetId = generateUniqueIdentifier();
    const relationId = generateUniqueIdentifier();

    db.addCodeEntity(sourceId, {
      type: CodeEntityType.CLASS,
      className: 'ParentClass',
      isAbstract: false,
      isExported: true,
      isDefaultExport: false,
      accessModifiers: []
    });

    db.addCodeEntity(targetId, {
      type: CodeEntityType.CLASS,
      className: 'ChildClass',
      isAbstract: false,
      isExported: true,
      isDefaultExport: false,
      accessModifiers: []
    });

    const relationData = { type: CodeRelationType.EXTENDS };
    db.addCodeRelation(relationId, targetId, sourceId, relationData);

    const result = db.getCodeRelation(relationId);
    expect(result).not.toBeNull();
    expect(result!.sourceEntityId).toBe(targetId);
    expect(result!.targetEntityId).toBe(sourceId);
    expect(result!.relationData).toEqual(relationData);
  });

  it('should retrieve entities by type', () => {
    const class1 = generateUniqueIdentifier();
    const class2 = generateUniqueIdentifier();
    const func1 = generateUniqueIdentifier();

    db.addCodeEntity(class1, {
      type: CodeEntityType.CLASS,
      className: 'Class1',
      isAbstract: false,
      isExported: true,
      isDefaultExport: false,
      accessModifiers: []
    });

    db.addCodeEntity(class2, {
      type: CodeEntityType.CLASS,
      className: 'Class2',
      isAbstract: false,
      isExported: true,
      isDefaultExport: false,
      accessModifiers: []
    });

    db.addCodeEntity(func1, {
      type: CodeEntityType.FUNCTION,
      functionName: 'func1',
      isAsyncFunction: false,
      isExported: true,
      isDefaultExport: false,
      isGeneratorFunction: false,
      parameters: [],
      accessModifiers: []
    });

    const classEntities = db.getCodeEntitiesByType(CodeEntityType.CLASS);
    expect(classEntities.length).toBe(2);
  });

  it('should find entities by name', () => {
    const entityId = generateUniqueIdentifier();
    db.addCodeEntity(entityId, {
      type: CodeEntityType.FUNCTION,
      functionName: 'testFunction',
      isAsyncFunction: false,
      isExported: true,
      isDefaultExport: false,
      isGeneratorFunction: false,
      parameters: [],
      accessModifiers: []
    });

    const results = db.searchCodeEntitiesByName('testFunction');
    expect(results.length).toBe(1);
    expect(results[0].entityId).toBe(entityId);
  });

  it('should get stats', () => {
    const class1 = generateUniqueIdentifier();
    const file1 = generateUniqueIdentifier();

    db.addCodeEntity(file1, {
      type: CodeEntityType.FILE,
      filePath: '/test.ts',
      fileName: 'test.ts',
      fileExtension: '.ts',
      linesOfCode: 100,
      lastModifiedTimestamp: Date.now(),
      contentHash: 'abc123'
    });

    db.addCodeEntity(class1, {
      type: CodeEntityType.CLASS,
      className: 'TestClass',
      isAbstract: false,
      isExported: true,
      isDefaultExport: false,
      accessModifiers: []
    });

    const stats = db.getStatistics();
    expect(stats.totalEntityCount).toBe(2);
    expect(stats.totalRelationCount).toBe(0);
    expect(stats.classEntityCount).toBe(1);
    expect(stats.fileEntityCount).toBe(1);
  });

  it('should clear all data', () => {
    const entityId = generateUniqueIdentifier();
    db.addCodeEntity(entityId, {
      type: CodeEntityType.CLASS,
      className: 'TestClass',
      isAbstract: false,
      isExported: true,
      isDefaultExport: false,
      accessModifiers: []
    });

    db.clear();

    expect(db.getStatistics().totalEntityCount).toBe(0);
    expect(db.getCodeEntity(entityId)).toBeNull();
  });
});
