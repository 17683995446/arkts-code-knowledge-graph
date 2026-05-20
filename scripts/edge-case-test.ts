import { MultiLanguageParser } from '../src/core/code-parser/MultiLanguageParser';
import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService';
import { ApplicationLogger } from '../src/infrastructure/logger/Logger';

const logger = ApplicationLogger.getInstance();

async function testEdgeCase1_NonExistentPath() {
    logger.info('=== 边界测试1: 不存在的路径 ===');
    const parser = new MultiLanguageParser();
    
    try {
        const result = parser.parseDirectory('/non/existent/path');
        logger.info(`结果: ${result.codeEntities.length}实体, ${result.codeRelations.length}关系`);
        return { success: true, entities: result.codeEntities.length };
    } catch (e) {
        logger.error(`错误: ${e}`);
        return { success: false, error: String(e) };
    }
}

async function testEdgeCase2_EmptyDirectory() {
    logger.info('=== 边界测试2: 空目录 ===');
    const parser = new MultiLanguageParser();
    
    const emptyPath = '/tmp/empty_test_dir';
    const fs = require('fs');
    if (!fs.existsSync(emptyPath)) {
        fs.mkdirSync(emptyPath);
    }
    
    try {
        const result = parser.parseDirectory(emptyPath);
        logger.info(`结果: ${result.codeEntities.length}实体`);
        return { success: true, entities: result.codeEntities.length };
    } catch (e) {
        logger.error(`错误: ${e}`);
        return { success: false, error: String(e) };
    }
}

async function testEdgeCase3_InvalidQuery() {
    logger.info('=== 边界测试3: 无效查询 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.buildKnowledgeGraph('/workspace/src');
    
    try {
        const result = service.queryEntities({ type: 'nonExistentType' });
        logger.info(`无效类型查询结果: ${result.length}`);
        
        const result2 = service.queryEntities({ name: 'NonExistentName123' });
        logger.info(`无效名称查询结果: ${result2.length}`);
        
        const result3 = service.queryEntities({});
        logger.info(`空查询结果: ${result3.length}`);
        
        return { success: true, results: { type: result.length, name: result2.length, empty: result3.length } };
    } catch (e) {
        logger.error(`错误: ${e}`);
        return { success: false, error: String(e) };
    }
}

async function testEdgeCase4_SpecialCharacters() {
    logger.info('=== 边界测试4: 特殊字符文件名 ===');
    const parser = new MultiLanguageParser();
    
    const specialDir = '/tmp/special_chars_test';
    const fs = require('fs');
    
    try {
        fs.mkdirSync(specialDir, { recursive: true });
        fs.writeFileSync(`${specialDir}/test-file.js`, 'export const test = 1;');
        fs.writeFileSync(`${specialDir}/test file.js`, 'export const test2 = 2;');
        
        const result = parser.parseDirectory(specialDir);
        logger.info(`特殊字符文件解析: ${result.codeEntities.length}实体`);
        
        return { success: true, entities: result.codeEntities.length };
    } catch (e) {
        logger.error(`错误: ${e}`);
        return { success: false, error: String(e) };
    }
}

async function testEdgeCase5_CircularDependencies() {
    logger.info('=== 边界测试5: 循环依赖检测 ===');
    const parser = new MultiLanguageParser();
    
    const circularDir = '/tmp/circular_test';
    const fs = require('fs');
    
    try {
        fs.mkdirSync(circularDir, { recursive: true });
        fs.writeFileSync(`${circularDir}/a.ts`, 'import { B } from "./b"; export const A = 1;');
        fs.writeFileSync(`${circularDir}/b.ts`, 'import { A } from "./a"; export const B = 2;');
        
        const result = parser.parseDirectory(circularDir);
        logger.info(`循环依赖解析: ${result.codeEntities.length}实体, ${result.codeRelations.length}关系`);
        
        return { success: true, entities: result.codeEntities.length, relations: result.codeRelations.length };
    } catch (e) {
        logger.error(`错误: ${e}`);
        return { success: false, error: String(e) };
    }
}

async function testEdgeCase6_DeepNesting() {
    logger.info('=== 边界测试6: 深层嵌套目录 ===');
    const parser = new MultiLanguageParser();
    
    const deepDir = '/tmp/deep/nesting/test/path';
    const fs = require('fs');
    
    try {
        fs.mkdirSync(deepDir, { recursive: true });
        fs.writeFileSync(`${deepDir}/deep.ts`, 'export class DeepClass { deepMethod() { return 1; } }');
        
        const result = parser.parseDirectory('/tmp/deep');
        logger.info(`深层嵌套解析: ${result.codeEntities.length}实体`);
        
        return { success: true, entities: result.codeEntities.length };
    } catch (e) {
        logger.error(`错误: ${e}`);
        return { success: false, error: String(e) };
    }
}

async function testEdgeCase7_LargeFile() {
    logger.info('=== 边界测试7: 大文件解析 ===');
    const parser = new MultiLanguageParser();
    
    const largeFile = '/tmp/large_test.ts';
    const fs = require('fs');
    
    try {
        let content = 'export class LargeClass {\n';
        for (let i = 0; i < 1000; i++) {
            content += `  method${i}() { return ${i}; }\n`;
        }
        content += '}';
        fs.writeFileSync(largeFile, content);
        
        const result = parser.parseFile(largeFile);
        logger.info(`大文件解析: ${result.codeEntities.length}实体`);
        
        return { success: true, entities: result.codeEntities.length };
    } catch (e) {
        logger.error(`错误: ${e}`);
        return { success: false, error: String(e) };
    }
}

async function testEdgeCase8_ConcurrentClearCache() {
    logger.info('=== 边界测试8: 并发清空缓存 ===');
    const service = new EnhancedCodeKnowledgeGraphService();
    await service.buildKnowledgeGraph('/workspace/src');
    
    try {
        const promises = [];
        for (let i = 0; i < 20; i++) {
            promises.push(Promise.all([
                service.queryEntities({ type: 'class' }),
                service.clearCache(),
                service.queryEntities({ type: 'function' })
            ]));
        }
        
        await Promise.all(promises);
        logger.info('并发清空缓存测试完成');
        
        return { success: true };
    } catch (e) {
        logger.error(`错误: ${e}`);
        return { success: false, error: String(e) };
    }
}

async function runEdgeCaseTests() {
    logger.info('========== 开始边界测试 ==========');
    
    const results: any = {};
    
    results.edge1 = await testEdgeCase1_NonExistentPath();
    results.edge2 = await testEdgeCase2_EmptyDirectory();
    results.edge3 = await testEdgeCase3_InvalidQuery();
    results.edge4 = await testEdgeCase4_SpecialCharacters();
    results.edge5 = await testEdgeCase5_CircularDependencies();
    results.edge6 = await testEdgeCase6_DeepNesting();
    results.edge7 = await testEdgeCase7_LargeFile();
    results.edge8 = await testEdgeCase8_ConcurrentClearCache();
    
    logger.info('========== 边界测试完成 ==========');
    console.log(JSON.stringify(results, null, 2));
    
    return results;
}

runEdgeCaseTests().catch(console.error);
