import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { KnowledgeGraphDatabase } from '../src/core/knowledge-graph/KnowledgeGraphDatabase';
import { CodeEntityType, CodeRelationType } from '../src/shared/index';
import * as os from 'os';
import * as path from 'path';

describe('深度问题发现测试', () => {
    let tempDir: string;
    
    beforeAll(() => {
        tempDir = path.join(os.tmpdir(), 'deep-bug-find');
    });
    
    describe('测试1: 无效实体类型验证', () => {
        it('应该拒绝无效的实体类型', () => {
            const db = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: false
            });
            
            expect(() => {
                db.addCodeEntity('test-id', {
                    type: 'THIS_IS_NOT_A_VALID_TYPE' as any,
                    entityName: 'test'
                });
            }).toThrow();
        });
    });
    
    describe('测试2: null/undefined 实体数据', () => {
        it('应该拒绝 null 数据', () => {
            const db = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: false
            });
            
            expect(() => {
                db.addCodeEntity('test-id', null as any);
            }).toThrow();
        });
        
        it('应该拒绝 undefined 数据', () => {
            const db = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: false
            });
            
            expect(() => {
                db.addCodeEntity('test-id', undefined as any);
            }).toThrow();
        });
    });
    
    describe('测试3: 删除不存在的实体', () => {
        it('删除不存在的实体应该返回 false', () => {
            const db = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: false
            });
            
            const result = db.removeEntity('does-not-exist-at-all');
            expect(result).toBe(false);
        });
    });
    
    describe('测试4: 循环关系处理', () => {
        it('应该能够处理自引用关系', () => {
            const db = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: false
            });
            
            db.addCodeEntity('self', { 
                type: CodeEntityType.FUNCTION, 
                entityName: 'self' 
            });
            
            expect(() => {
                db.addCodeRelation('self-rel', 'self', 'self', { 
                    type: CodeRelationType.CALLS 
                });
            }).not.toThrow();
        });
        
        it('应该能够处理循环关系网络', () => {
            const db = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: false
            });
            
            db.addCodeEntity('A', { type: CodeEntityType.CLASS, entityName: 'A' });
            db.addCodeEntity('B', { type: CodeEntityType.CLASS, entityName: 'B' });
            db.addCodeEntity('C', { type: CodeEntityType.CLASS, entityName: 'C' });
            
            expect(() => {
                db.addCodeRelation('AB', 'A', 'B', { type: CodeRelationType.CALLS });
                db.addCodeRelation('BC', 'B', 'C', { type: CodeRelationType.CALLS });
                db.addCodeRelation('CA', 'C', 'A', { type: CodeRelationType.CALLS });
            }).not.toThrow();
        });
    });
    
    describe('测试5: 索引一致性', () => {
        let db: KnowledgeGraphDatabase;
        
        beforeEach(() => {
            db = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: false
            });
        });
        
        it('类型索引应该正确统计', () => {
            db.addCodeEntity('e1', { type: CodeEntityType.FUNCTION, entityName: 'f1' });
            db.addCodeEntity('e2', { type: CodeEntityType.CLASS, entityName: 'c1' });
            db.addCodeEntity('e3', { type: CodeEntityType.FUNCTION, entityName: 'f2' });
            
            const funcEntities = db.getCodeEntitiesByType(CodeEntityType.FUNCTION);
            const classEntities = db.getCodeEntitiesByType(CodeEntityType.CLASS);
            
            expect(funcEntities.length).toBe(2);
            expect(classEntities.length).toBe(1);
        });
        
        it('删除实体后索引应该更新', () => {
            db.addCodeEntity('e1', { type: CodeEntityType.FUNCTION, entityName: 'f1' });
            db.addCodeEntity('e2', { type: CodeEntityType.FUNCTION, entityName: 'f2' });
            
            db.removeEntity('e1');
            
            const funcAfterDelete = db.getCodeEntitiesByType(CodeEntityType.FUNCTION);
            expect(funcAfterDelete.length).toBe(1);
        });
    });
    
    describe('测试6: 空字符串和特殊值处理', () => {
        it('应该处理空 ID（虽然不推荐）', () => {
            const db = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: false
            });
            
            expect(() => {
                db.addCodeEntity('', { 
                    type: CodeEntityType.FILE, 
                    entityName: 'empty-id' 
                });
            }).not.toThrow();
        });
        
        it('应该处理空名称', () => {
            const db = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: false
            });
            
            expect(() => {
                db.addCodeEntity('valid-id', { 
                    type: CodeEntityType.FILE, 
                    entityName: '' 
                });
            }).not.toThrow();
        });
    });
    
    describe('测试7: 特殊字符处理', () => {
        it('应该处理包含特殊字符的 ID', () => {
            const db = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: false
            });
            
            const specialIds = [
                'id-with--dashes',
                'id.with.dots',
                'id/with/slashes',
                'id with spaces',
                'id😀with🚀emoji'
            ];
            
            specialIds.forEach(id => {
                expect(() => {
                    db.addCodeEntity(id, { 
                        type: CodeEntityType.FUNCTION, 
                        entityName: id 
                    });
                }).not.toThrow();
            });
        });
    });
    
    describe('测试8: 清空操作', () => {
        it('清空后应该删除所有数据', () => {
            const db = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: false
            });
            
            for (let i = 0; i < 100; i++) {
                db.addCodeEntity(`e${i}`, { 
                    type: CodeEntityType.FUNCTION, 
                    entityName: `f${i}` 
                });
            }
            
            db.clear();
            
            const stats = db.getStatistics();
            expect(stats.totalEntityCount).toBe(0);
        });
        
        it('清空后索引也应该清空', () => {
            const db = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: false
            });
            
            db.addCodeEntity('e1', { type: CodeEntityType.FUNCTION, entityName: 'f1' });
            db.clear();
            
            const results = db.getCodeEntitiesByType(CodeEntityType.FUNCTION);
            expect(results.length).toBe(0);
        });
    });
    
    describe('测试9: 快速连续操作', () => {
        it('应该处理快速添加和删除', () => {
            const db = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: false
            });
            
            expect(() => {
                for (let i = 0; i < 1000; i++) {
                    db.addCodeEntity(`rapid-${i}`, { 
                        type: CodeEntityType.FUNCTION, 
                        entityName: `r${i}` 
                    });
                    if (i % 2 === 0) {
                        db.removeEntity(`rapid-${i}`);
                    }
                }
            }).not.toThrow();
        });
    });
    
    describe('测试10: 大量小操作', () => {
        it('应该快速添加大量实体', () => {
            const db = new KnowledgeGraphDatabase({
                dataDirectory: tempDir,
                persistToFileSystem: false
            });
            
            const start = Date.now();
            for (let i = 0; i < 10000; i++) {
                db.addCodeEntity(`mass-${i}`, { 
                    type: CodeEntityType.FUNCTION, 
                    entityName: `m${i}` 
                });
            }
            const duration = Date.now() - start;
            
            const stats = db.getStatistics();
            expect(stats.totalEntityCount).toBe(10000);
            
            // 性能检查 - 10秒内完成
            expect(duration).toBeLessThan(10000);
        });
    });
});

