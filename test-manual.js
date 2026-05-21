// file: /workspace/test-manual.ts

const fs = require('fs');
const os = require('os');
const path = require('path');

// 使用 CommonJS 包装器，让我们直接运行 TypeScript 代码
require('tsx/cjs');
// 让我们用纯 JS 来测试核心逻辑！

console.log('🔍 手动深度问题发现测试');
console.log('='.repeat(80));

const issues = [];

function recordIssue(name, description, details = null) {
    console.log(`❌ 发现问题: ${name}`);
    console.log(`   ${description}`);
    issues.push({ name, description, details });
}

async function runTests() {
    console.log('\n📦 正在加载核心模块...');

    // 让我们查看 src/core/knowledge-graph/KnowledgeGraphDatabase 看看源代码
    try {
        const KnowledgeGraphDatabasePath = path.join(__dirname, 'src', 'core', 'knowledge-graph', 'KnowledgeGraphDatabase.ts');
        console.log('📄 正在读取源代码:', KnowledgeGraphDatabasePath);
        
        // 先查看代码审查：
        console.log('\n📖 代码审查阶段');
        console.log('------------------');
        
        // 读取文件
        const code = fs.readFileSync(KnowledgeGraphDatabasePath, 'utf-8');
        console.log('✅ 源代码读取成功');
        
        // 让我们通过编译后的代码
        const { CodeEntityType, CodeRelationType, KnowledgeGraphDatabase } = require('./dist/index.js');
        
        console.log('✅ 模块加载成功');
        
        console.log('\n🧪 开始测试...');
        
        // 测试 1: 无效类型检查
        await test1_InvalidType(KnowledgeGraphDatabase, CodeEntityType);
        
        // 测试 2: 删除后索引同步
        await test2_DeleteIndex(KnowledgeGraphDatabase, CodeEntityType);
        
        // 测试 3: 清空
        await test3_ClearIndex(KnowledgeGraphDatabase, CodeEntityType);
        
        // 测试 4: 特殊ID
        await test4_SpecialIds(KnowledgeGraphDatabase, CodeEntityType);
        
    } catch (err) {
        console.error('💥 错误:', err);
        issues.push({ name: '模块加载失败', error: err });
    }

    console.log('\n📊 测试完成');
    console.log('='.repeat(80));
    
    if (issues.length === 0) {
        console.log('🎉 太棒了！没有发现问题！');
    } else {
        console.log(`❌ 发现了 ${issues.length} 个问题:`);
        issues.forEach((issue, idx) => {
            console.log(`  ${idx + 1}. ${issue.name}`);
        });
    }
}

async function test1_InvalidType(KGD, CET) {
    console.log('\n🧪 测试1: 无效类型验证...');
    try {
        const db = new KGD({
            dataDirectory: path.join(os.tmpdir(), 't1'),
            persistToFileSystem: false
        });
        
        let threw = false;
        
        try {
            db.addCodeEntity('test-id', {
                type: 'BAD_TYPE',
                entityName: 'test'
            });
        } catch (e) {
            threw = true;
        }
        
        if (threw) {
            console.log('✅ 正确拒绝了无效类型');
        } else {
            recordIssue('无效类型未被拒绝', '系统接受了无效的实体类型');
        }
        
    } catch (err) {
        recordIssue('测试1 执行失败', err.message);
    }
}

async function test2_DeleteIndex(KGD, CET) {
    console.log('\n🧪 测试2: 删除后索引同步...');
    try {
        const db = new KGD({
            dataDirectory: path.join(os.tmpdir(), 't2'),
            persistToFileSystem: false
        });
        
        db.addCodeEntity('e1', { type: CET.FUNCTION, entityName: 'f1' });
        db.addCodeEntity('e2', { type: CET.FUNCTION, entityName: 'f2' });
        
        const beforeDelete = db.getCodeEntitiesByType(CET.FUNCTION);
        console.log(`📊 删除前函数数量: ${beforeDelete.length}`);
        
        db.removeEntity('e1');
        
        const afterDelete = db.getCodeEntitiesByType(CET.FUNCTION);
        console.log(`📊 删除后函数数量: ${afterDelete.length}`);
        
        if (afterDelete.length === 1) {
            console.log('✅ 删除后索引更新正确');
        } else {
            recordIssue('删除操作后索引不同步', 
                `预期: 1, 实际: ${afterDelete.length}`);
        }
        
    } catch (err) {
        recordIssue('测试2 执行失败', err.message);
    }
}

async function test3_ClearIndex(KGD, CET) {
    console.log('\n🧪 测试3: 清空操作...');
    try {
        const db = new KGD({
            dataDirectory: path.join(os.tmpdir(), 't3'),
            persistToFileSystem: false
        });
        
        for (let i = 0; i < 10; i++) {
            db.addCodeEntity(`e${i}`, { type: CET.FUNCTION, entityName: `f${i}` });
        }
        
        db.clear();
        
        const stats = db.getStatistics();
        const typeResults = db.getCodeEntitiesByType(CET.FUNCTION);
        
        if (stats.totalEntityCount === 0 && typeResults.length === 0) {
            console.log('✅ 清空操作正常');
        } else {
            recordIssue('清空操作后数据残留', 
                `实体剩余: ${stats.totalEntityCount}, 类型索引剩余: ${typeResults.length}');
        }
        
    } catch (err) {
        recordIssue('测试3 执行失败', err.message);
    }
}

async function test4_SpecialIds(KGD, CET) {
    console.log('\n🧪 测试4: 特殊字符 ID...');
    try {
        const db = new KGD({
            dataDirectory: path.join(os.tmpdir(), 't4'),
            persistToFileSystem: false
        });
        
        const specialIds = ['', '😀', 'a'.repeat(10000), '123', '!@#$%^&*()'];
        
        for (const id of specialIds) {
            try {
                db.addCodeEntity(id, { type: CET.FILE, entityName: id });
                console.log(`✅ ID "${id.slice(0, 20)} 成功`);
            } catch (e) {
                console.log(`⚠️ ID "${id.slice(0, 20)}" 失败`);
            }
        }
        
    } catch (err) {
        recordIssue('测试4 执行失败', err.message);
    }
}

// 先让我们构建项目！
const { execSync } = require('child_process');
console.log('🔨 构建项目...');
try {
    console.log('运行: npm run build');
    execSync('npm run build', { cwd: __dirname, stdio: 'inherit' });
    console.log('✅ 构建成功');
    runTests();
} catch (e) {
    console.error('❌ 构建失败');
    // 那我们直接 TypeScript 编译
    console.log('🔨 尝试直接运行 tsx 直接运行');
    const { spawn } = require('child_process');
    
    const child = spawn('npx', ['tsx', path.join(__dirname, 'test-manual-ts.ts')], {
        cwd: __dirname,
        stdio: 'inherit'
    });
    child.on('exit', (code) => {
        if (code === 0) {
            console.log('✅');
        }
    });
}

