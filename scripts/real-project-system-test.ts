#!/usr/bin/env node
/**
 * ArkTS 知识图谱系统 - 真实项目系统测试
 */

import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService.js';
import chalk from 'chalk';

console.log(chalk.bold.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🎯 ArkTS 知识图谱系统 - 真实项目系统测试                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));

const NESTJS_PACKAGES_PATH = './nest.js/packages/common';

async function main() {
    try {
        console.log(chalk.bold.yellow('📋 测试1: 初始化知识图谱服务'));
        console.log(chalk.gray('正在创建服务实例...'));
        
        const service = new EnhancedCodeKnowledgeGraphService();
        await service.initialize();
        console.log(chalk.green('✅ 服务初始化成功\n'));
        
        console.log(chalk.bold.yellow('📋 测试2: 解析真实 Nest.js 项目 (packages/common)'));
        console.log(chalk.gray(`目标路径: ${NESTJS_PACKAGES_PATH}`));
        
        const start = Date.now();
        const initialMemory = process.memoryUsage().heapUsed;
        
        const result = await service.analyzeProject(NESTJS_PACKAGES_PATH);
        
        const duration = Date.now() - start;
        const finalMemory = process.memoryUsage().heapUsed;
        const memoryUsedMB = (finalMemory - initialMemory) / 1024 / 1024;
        
        console.log(chalk.green('✅ 项目解析成功\n'));
        
        console.log(chalk.bold.blue('📊 解析结果统计:'));
        const stats = result.knowledgeGraph.getStatistics();
        
        console.log(`   - 总节点数: ${chalk.yellow(stats.totalEntityCount)}`);
        console.log(`   - 总关系数: ${chalk.yellow(stats.totalRelationCount)}`);
        console.log(`   - 文件节点: ${chalk.cyan(stats.fileEntityCount)}`);
        console.log(`   - 类节点: ${chalk.magenta(stats.classEntityCount)}`);
        console.log(`   - 函数节点: ${chalk.blue(stats.functionEntityCount)}`);
        console.log(`   - 解析耗时: ${chalk.green(`${duration}ms`)}`);
        console.log(`   - 内存使用: ${chalk.magenta(`${memoryUsedMB.toFixed(2)}MB`)}`);
        
        console.log(chalk.gray('\n节点类型分布:'));
        Object.entries(stats.entityCountByType || {}).forEach(([type, count]) => {
            if (count > 0) {
                console.log(`   - ${type}: ${count}`);
            }
        });
        
        console.log(chalk.bold.yellow('\n📋 测试3: 查询引擎功能验证'));
        const queryEngine = service.getQueryEngine();
        
        // 搜索包含 "Module" 的实体
        console.log(chalk.gray('\n搜索包含 "Module" 的实体...'));
        const searchResults = queryEngine.searchEntitiesByName('Module');
        console.log(`找到 ${chalk.yellow(searchResults.length)} 个结果:`);
        searchResults.slice(0, 5).forEach(res => {
            const name = 'fileName' in res.entityData ? res.entityData.fileName :
                        'className' in res.entityData ? res.entityData.className :
                        'functionName' in res.entityData ? res.entityData.functionName :
                        'entityName' in res.entityData ? res.entityData.entityName :
                        'Unnamed';
            console.log(`   - [${res.entityData.type}] ${name}`);
        });
        
        console.log(chalk.bold.yellow('\n📋 测试4: 语义向量搜索'));
        const semanticSearch = service.getSemanticSearch();
        
        console.log(chalk.gray('\n语义搜索 "decorator" 相关的实体...'));
        const semanticResults = await semanticSearch.searchEntities('decorator', 5);
        console.log(`找到 ${chalk.yellow(semanticResults.length)} 个语义相似结果:`);
        semanticResults.forEach((res, idx) => {
            const name = 'fileName' in res.entityData ? res.entityData.fileName :
                        'className' in res.entityData ? res.entityData.className :
                        'functionName' in res.entityData ? res.entityData.functionName :
                        'interfaceName' in res.entityData ? res.entityData.interfaceName :
                        'entityName' in res.entityData ? res.entityData.entityName :
                        'Unnamed';
            console.log(`   ${idx + 1}. [${res.entityData.type}] ${name} (相似度: ${res.relevanceScore.toFixed(3)})`);
        });
        
        console.log(chalk.bold.green('\n═══════════════════════════════════════════════════════════'));
        console.log(chalk.bold.green('🎉 所有系统测试通过！系统工作正常！'));
        console.log(chalk.bold.green('═══════════════════════════════════════════════════════════\n'));
        
    } catch (error) {
        console.error(chalk.red('❌ 系统测试失败:'), error);
        process.exit(1);
    }
}

main();
