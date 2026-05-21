#!/usr/bin/env node
/**
 * 快速深度问题发现测试
 * 
 * 测试目的：快速找出系统的实际问题
 */

import { KnowledgeGraphDatabase } from '../src/core/knowledge-graph/KnowledgeGraphDatabase.js';
import { CodeEntityType, CodeRelationType } from '../src/shared/index.js';
import * as os from 'os';
import * as path from 'path';

console.log('🔍 快速深度问题发现测试');
console.log('='.repeat(80));

const issuesFound: any[] = [];

function recordIssue(name: string, description: string, details: any = null) {
    console.log(`❌ 发现问题: ${name}`);
    console.log(`   ${description}`);
    issuesFound.push({ name, description, details });
}

async function test1_InvalidEntityType() {
    console.log('\n🧪 测试1: 无效实体类型验证...');
    const db = new KnowledgeGraphDatabase({
        dataDirectory: path.join(os.tmpdir(), 'test1'),
        persistToFileSystem: false
    });
    
    try {
        // 尝试使用无效的类型
        db.addCodeEntity('test-id', {
            type: 'THIS_IS_NOT_A_VALID_TYPE' as any,
            entityName: 'test'
        });
        recordIssue('无效类型未验证', '系统接受了无效的实体类型，没有抛出错误');
    } catch (e) {
        console.log('✅ 正确：无效类型被拒绝');
    }
}

async function test2_NullEntityData() {
    console.log('\n🧪 测试2: null/undefined 实体数据...');
    const db = new KnowledgeGraphDatabase({
        dataDirectory: path.join(os.tmpdir(), 'test2'),
        persistToFileSystem: false
    });
    
    try {
        db.addCodeEntity('test-id', null as any);
        recordIssue('null 数据未验证', '系统接受了 null 实体数据');
    } catch (e) {
        console.log('✅ 正确：null 数据被拒绝');
    }
    
    try {
        db.addCodeEntity('test-id', undefined as any);
        recordIssue('undefined 数据未验证', '系统接受了 undefined 实体数据');
    } catch (e) {
        console.log('✅ 正确：undefined 数据被拒绝');
    }
}

async function test3_DeleteNonExistentEntity() {
    console.log('\n🧪 测试3: 删除不存在的实体...');
    const db = new KnowledgeGraphDatabase({
        dataDirectory: path.join(os.tmpdir(), 'test3'),
        persistToFileSystem: false
    });
    
    const result = db.removeEntity('does-not-exist-at-all');
    console.log(`📊 删除不存在的实体返回: ${result}`);
    
    if (result !== false) {
        recordIssue('删除操作返回值异常', '删除不存在的实体应返回 false');
    } else {
        console.log('✅ 正确：返回 false');
    }
}

async function test4_CircularRelationships() {
    console.log('\n🧪 测试4: 循环关系处理...');
    const db = new KnowledgeGraphDatabase({
        dataDirectory: path.join(os.tmpdir(), 'test4'),
        persistToFileSystem: false
    });
    
    try {
        // 自引用关系
        db.addCodeEntity('self', { type: CodeEntityType.FUNCTION, entityName: 'self' });
        db.addCodeRelation('self-rel', 'self', 'self', { type: CodeRelationType.CALLS });
        
        // 循环 A->B, B->C, C->A
        db.addCodeEntity('A', { type: CodeEntityType.CLASS, entityName: 'A' });
        db.addCodeEntity('B', { type: CodeEntityType.CLASS, entityName: 'B' });
        db.addCodeEntity('C', { type: CodeEntityType.CLASS, entityName: 'C' });
        
        db.addCodeRelation('AB', 'A', 'B', { type: CodeRelationType.CALLS });
        db.addCodeRelation('BC', 'B', 'C', { type: CodeRelationType.CALLS });
        db.addCodeRelation('CA', 'C', 'A', { type: CodeRelationType.CALLS });
        
        console.log('✅ 循环关系处理正常');
    } catch (e) {
        recordIssue('循环关系处理失败', '处理循环关系时出错', e);
    }
}

async function test5_IndexConsistency() {
    console.log('\n🧪 测试5: 索引一致性...');
    const db = new KnowledgeGraphDatabase({
        dataDirectory: path.join(os.tmpdir(), 'test5'),
        persistToFileSystem: false
    });
    
    // 添加实体
    db.addCodeEntity('e1', { type: CodeEntityType.FUNCTION, entityName: 'f1' });
    db.addCodeEntity('e2', { type: CodeEntityType.CLASS, entityName: 'c1' });
    db.addCodeEntity('e3', { type: CodeEntityType.FUNCTION, entityName: 'f2' });
    
    // 查询数量应该匹配
    const funcEntities = db.getCodeEntitiesByType(CodeEntityType.FUNCTION);
    const classEntities = db.getCodeEntitiesByType(CodeEntityType.CLASS);
    
    if (funcEntities.length !== 2) {
        recordIssue('类型索引错误', `预期 2 个函数，找到 ${funcEntities.length} 个`);
    }
    
    if (classEntities.length !== 1) {
        recordIssue('类型索引错误', `预期 1 个类，找到 ${classEntities.length} 个`);
    }
    
    // 测试删除后索引更新
    db.removeEntity('e1');
    const funcAfterDelete = db.getCodeEntitiesByType(CodeEntityType.FUNCTION);
    
    if (funcAfterDelete.length !== 1) {
        recordIssue('索引删除不同步', `删除后预期 1 个函数，找到 ${funcAfterDelete.length} 个`);
    } else {
        console.log('✅ 索引一致性正常');
    }
}

async function test6_EmptyValues() {
    console.log('\n🧪 测试6: 空字符串、空值处理...');
    const db = new KnowledgeGraphDatabase({
        dataDirectory: path.join(os.tmpdir(), 'test6'),
        persistToFileSystem: false
    });
    
    try {
        db.addCodeEntity('', { type: CodeEntityType.FILE, entityName: 'empty-id' });
        console.log('✅ 空 ID 处理正常（虽然不推荐）');
    } catch (e) {
        console.log('✅ 空 ID 被正确拒绝');
    }
    
    try {
        db.addCodeEntity('valid-id', { type: CodeEntityType.FILE, entityName: '' });
        console.log('✅ 空名称处理正常');
    } catch (e) {
        console.log('✅ 空名称被拒绝');
    }
}

async function test7_SpecialCharacters() {
    console.log('\n🧪 测试7: 特殊字符处理...');
    const db = new KnowledgeGraphDatabase({
        dataDirectory: path.join(os.tmpdir(), 'test7'),
        persistToFileSystem: false
    });
    
    const specialIds = [
        'id-with--dashes',
        'id.with.dots',
        'id/with/slashes',
        'id\\with\\backslashes',
        'id with spaces',
        'id😀with🚀emoji',
        'id\nwith\nnewlines',
        'id\x00with\x00nulls'
    ];
    
    let success = 0;
    let fail = 0;
    
    for (const id of specialIds) {
        try {
            db.addCodeEntity(id, { type: CodeEntityType.FUNCTION, entityName: id });
            success++;
        } catch (e) {
            fail++;
        }
    }
    
    console.log(`📊 特殊字符测试: ${success} 成功, ${fail} 失败`);
    console.log('✅ 特殊字符处理完成');
}

async function test8_ClearOperation() {
    console.log('\n🧪 测试8: 清空操作...');
    const db = new KnowledgeGraphDatabase({
        dataDirectory: path.join(os.tmpdir(), 'test8'),
        persistToFileSystem: false
    });
    
    // 添加数据
    for (let i = 0; i < 100; i++) {
        db.addCodeEntity(`e${i}`, { type: CodeEntityType.FUNCTION, entityName: `f${i}` });
    }
    
    // 清空
    db.clear();
    
    const stats = db.getStatistics();
    if (stats.totalEntityCount !== 0) {
        recordIssue('清空操作不彻底', `清空后还有 ${stats.totalEntityCount} 个实体`);
    } else {
        console.log('✅ 清空操作正常');
    }
    
    // 测试清空后的查询
    const results = db.getCodeEntitiesByType(CodeEntityType.FUNCTION);
    if (results.length !== 0) {
        recordIssue('索引未清空', `清空后索引还有 ${results.length} 个实体`);
    }
}

async function test9_RapidOperations() {
    console.log('\n🧪 测试9: 快速连续操作...');
    const db = new KnowledgeGraphDatabase({
        dataDirectory: path.join(os.tmpdir(), 'test9'),
        persistToFileSystem: false
    });
    
    // 快速添加和删除
    for (let i = 0; i < 1000; i++) {
        db.addCodeEntity(`rapid-${i}`, { type: CodeEntityType.FUNCTION, entityName: `r${i}` });
        if (i % 2 === 0) {
            db.removeEntity(`rapid-${i}`);
        }
    }
    
    const stats = db.getStatistics();
    console.log(`📊 快速操作后: ${stats.totalEntityCount} 个实体`);
    console.log('✅ 快速操作完成');
}

async function test10_MassiveSmallOperations() {
    console.log('\n🧪 测试10: 大量小操作...');
    const db = new KnowledgeGraphDatabase({
        dataDirectory: path.join(os.tmpdir(), 'test10'),
        persistToFileSystem: false
    });
    
    const start = Date.now();
    for (let i = 0; i < 10000; i++) {
        db.addCodeEntity(`mass-${i}`, { type: CodeEntityType.FUNCTION, entityName: `m${i}` });
    }
    const duration = Date.now() - start;
    
    const stats = db.getStatistics();
    console.log(`📊 10,000 实体添加耗时: ${duration}ms`);
    console.log(`📊 实体总数: ${stats.totalEntityCount}`);
    
    if (duration > 5000) {
        recordIssue('性能问题', '添加 10,000 实体超过 5 秒');
    } else {
        console.log('✅ 性能正常');
    }
}

async function main() {
    console.log('开始执行 10 项深度测试...\n');
    
    await test1_InvalidEntityType();
    await test2_NullEntityData();
    await test3_DeleteNonExistentEntity();
    await test4_CircularRelationships();
    await test5_IndexConsistency();
    await test6_EmptyValues();
    await test7_SpecialCharacters();
    await test8_ClearOperation();
    await test9_RapidOperations();
    await test10_MassiveSmallOperations();
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 测试总结');
    console.log('='.repeat(80));
    
    if (issuesFound.length === 0) {
        console.log('🎉 太棒了！没有发现问题！');
    } else {
        console.log(`❌ 发现 ${issuesFound.length} 个问题:`);
        issuesFound.forEach((issue, idx) => {
            console.log(`\n  ${idx + 1}. ${issue.name}`);
            console.log(`     ${issue.description}`);
        });
    }
    
    console.log('\n✅ 深度测试完成');
    process.exit(issuesFound.length > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('💥 测试执行失败:', err);
    process.exit(1);
});

