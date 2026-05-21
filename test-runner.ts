#!/usr/bin/env tsx
// file: /workspace/test-runner.ts

import { KnowledgeGraphDatabase } from './src/core/knowledge-graph/KnowledgeGraphDatabase';
import { CodeEntityType, CodeRelationType } from './src/shared/index';
import * as os from 'os';
import * as path from 'path';

console.log('🔍 深度问题发现 - 直接 TypeScript 测试');
console.log('='.repeat(80));

const issues: any[] = [];

function recordIssue(name: string, description: string, details: any = null) {
    console.log(`❌ 发现问题: ${name}`);
    console.log(`   ${description}`);
    issues.push({ name, description, details });
}

async function main() {
    console.log('\n✅ 模块成功加载');
    
    // 测试1：删除后索引一致性
    console.log('\n🧪 测试 1: 删除后索引一致性');
    await test1_indexConsistencyAfterDelete();
    
    // 测试2：清空操作
    console.log('\n🧪 测试 2: 清空操作');
    await test2_clearOperation();
    
    // 测试3：关系处理
    console.log('\n🧪 测试 3: 关系和查询');
    await test3_relationsAndQueries();
    
    // 测试4：边界情况
    console.log('\n🧪 测试 4: 边界情况');
    await test4_edgeCases();
    
    // 总结
    console.log('\n📊 测试结束');
    console.log('='.repeat(80));
    if (issues.length === 0) {
        console.log('🎉 太棒了！没有发现问题');
    } else {
        console.log(`❌ 发现了 ${issues.length} 个问题`);
        process.exit(1);
    }
}

async function test1_indexConsistencyAfterDelete() {
    const db = new KnowledgeGraphDatabase({
        dataDirectory: path.join(os.tmpdir(), 'test1'),
        persistToFileSystem: false
    });
    
    // 添加两个函数
    db.addCodeEntity('e1', { type: CodeEntityType.FUNCTION, entityName: 'f1' });
    db.addCodeEntity('e2', { type: CodeEntityType.FUNCTION, entityName: 'f2' });
    
    const before = db.getCodeEntitiesByType(CodeEntityType.FUNCTION);
    console.log(`  📊 删除前: ${before.length} 函数`);
    
    if (before.length !== 2) {
        recordIssue('初始索引错误', `预期 2，实际 ${before.length}`);
    }
    
    // 删除一个
    const removed = db.removeEntity('e1');
    console.log(`  📊 删除返回值: ${removed}`);
    
    const after = db.getCodeEntitiesByType(CodeEntityType.FUNCTION);
    console.log(`  📊 删除后: ${after.length} 函数`);
    
    if (after.length !== 1) {
        recordIssue('删除后索引不一致', 
            `删除后预期 1，实际 ${after.length}`);
        console.log('  🔍 调试 - 实体数据:', after.map((item: any) => item));
    } else {
        console.log('✅ 删除后索引同步正常');
    }
}

async function test2_clearOperation() {
    const db = new KnowledgeGraphDatabase({
        dataDirectory: path.join(os.tmpdir(), 'test2'),
        persistToFileSystem: false
    });
    
    for (let i = 0; i < 10; i++) {
        db.addCodeEntity(`e${i}`, { 
            type: CodeEntityType.FUNCTION, 
            entityName: `f${i}` 
        });
    }
    
    db.clear();
    
    const stats = db.getStatistics();
    const byType = db.getCodeEntitiesByType(CodeEntityType.FUNCTION);
    
    if (stats.totalEntityCount === 0 && byType.length === 0) {
        console.log('✅ 清空操作正常');
    } else {
        recordIssue('清空后残留', 
            `实体: ${stats.totalEntityCount}, 类型索引: ${byType.length}`);
    }
}

async function test3_relationsAndQueries() {
    const db = new KnowledgeGraphDatabase({
        dataDirectory: path.join(os.tmpdir(), 'test3'),
        persistToFileSystem: false
    });
    
    db.addCodeEntity('A', { type: CodeEntityType.CLASS, entityName: 'A' });
    db.addCodeEntity('B', { type: CodeEntityType.CLASS, entityName: 'B' });
    db.addCodeEntity('C', { type: CodeEntityType.CLASS, entityName: 'C' });
    
    db.addCodeRelation('AB', 'A', 'B', { type: CodeRelationType.CALLS });
    db.addCodeRelation('BC', 'B', 'C', { type: CodeRelationType.EXTENDS });
    db.addCodeRelation('self-A', 'A', 'A', { type: CodeRelationType.CALLS });
    
    const outgoingA = db.getOutgoingRelations('A');
    const incomingB = db.getIncomingRelations('B');
    
    console.log(`  📊 A的出度: ${outgoingA.length}`);
    console.log(`  📊 B的入度: ${incomingB.length}`);
    
    if (outgoingA.length === 2 && incomingB.length === 1) {
        console.log('✅ 关系查询正常');
    } else {
        recordIssue('关系查询异常', 
            `A出度期望 2，实际 ${outgoingA.length}; B入度期望 1，实际 ${incomingB.length}`);
    }
}

async function test4_edgeCases() {
    const db = new KnowledgeGraphDatabase({
        dataDirectory: path.join(os.tmpdir(), 'test4'),
        persistToFileSystem: false
    });
    
    // 测试删除不存在的实体
    const removeResult = db.removeEntity('does-not-exist');
    console.log(`  📊 删除不存在的返回: ${removeResult}`);
    
    if (removeResult === false) {
        console.log('✅ 删除不存在的返回 false');
    } else {
        recordIssue('删除操作返回值异常', 
            `删除不存在的应该返回 false，实际 ${removeResult}`);
    }
    
    // 测试空 ID
    try {
        db.addCodeEntity('', { 
            type: CodeEntityType.FILE, 
            entityName: 'empty' 
        });
        console.log('✅ 空 ID 接受');
    } catch (e) {
        console.log('⚠️ 空 ID 被拒绝');
    }
    
    // 测试大量操作
    console.log('  📊 执行 1,000 操作...');
    for (let i = 0; i < 1000; i++) {
        db.addCodeEntity(`many-${i}`, { 
            type: CodeEntityType.FUNCTION, 
            entityName: `many${i}` 
        });
        if (i % 2 === 0) {
            db.removeEntity(`many-${i}`);
        }
    }
    
    const stats = db.getStatistics();
    console.log(`  📊 最终实体: ${stats.totalEntityCount}`);
    console.log('✅ 大量操作完成');
}

main().catch(err => {
    console.error('💥 测试运行失败:', err);
    process.exit(1);
});

