#!/usr/bin/env node
import { Command } from 'commander';
import { CodeKnowledgeGraphService } from '../services/index.js';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';

const program = new Command();

program
    .name('arkts-code-graph')
    .description('🎯 ArkTS 代码知识图谱系统 - 企业级代码分析平台\n\n' +
    '示例:\n' +
    '  $ arkts-code-graph parse ./src        # 解析项目\n' +
    '  $ arkts-code-graph search Calculator # 搜索代码\n' +
    '  $ arkts-code-graph stats             # 查看统计\n' +
    '  $ arkts-code-graph demo              # 运行演示')
    .version('2.0.0');

program
    .command('demo')
    .description('🚀 运行示例演示')
    .action(async () => {
        const spinner = ora('🚀 正在初始化...').start();
        try {
            const service = new CodeKnowledgeGraphService();
            await service.initialize();
            spinner.text = '📁 解析示例项目...';
            const projectPath = path.join(process.cwd(), 'examples', 'sample-project');
            const result = await service.analyzeProject(projectPath);
            spinner.succeed('✅ 解析完成！');

            console.log(chalk.bold('\n📊 快速统计：'));
            const stats = result.knowledgeGraph.getStatistics();
            console.log(`   • 总实体数: ${chalk.cyan(stats.totalEntityCount)}`);
            console.log(`   • 类数: ${chalk.magenta(stats.classEntityCount)}`);
            console.log(`   • 函数数: ${chalk.blue(stats.functionEntityCount)}`);

            console.log(chalk.bold('\n🔍 快速搜索 "Calculator"：'));
            const classes = result.queryEngine.searchEntitiesByName('Calculator');
            classes.forEach((cls, index) => {
                const className = cls.entityData.className || 'Unknown';
                console.log(`   ${index + 1}. [${chalk.yellow('Class')}] ${chalk.white(className)}`);
            });

            console.log(chalk.bold('\n🧮 代码质量分析：'));
            console.log(`   • 质量评分: ${chalk.cyan(result.metrics.quality.overallScore.toFixed(1))}/100`);
            console.log(`   • 复杂度水平: ${chalk.blue(result.metrics.quality.complexityLevel)}`);

            console.log(chalk.bold('\n💡 接下来你可以：'));
            console.log('   1. 解析你的项目: arkts-code-graph parse ./your-project');
            console.log('   2. 搜索代码: arkts-code-graph search "your-query"');
            console.log('   3. 查看帮助: arkts-code-graph --help\n');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.log(chalk.red(`\n❌ 演示失败: ${errorMessage}\n`));
            process.exit(1);
        }
    });

program
    .command('parse')
    .description('📁 解析项目并构建知识图谱')
    .argument('<directory>', '项目根目录路径')
    .option('-s, --save', '解析后自动保存', true)
    .action(async (directory, options) => {
        const spinner = ora('🔄 正在解析项目...').start();
        try {
            const service = new CodeKnowledgeGraphService();
            await service.initialize();
            spinner.text = '📝 正在解析文件...';
            const result = await service.analyzeProject(directory);
            const stats = result.knowledgeGraph.getStatistics();
            spinner.succeed('✅ 解析完成！');

            console.log(chalk.bold('\n📊 解析结果：'));
            console.log(`   • 总实体数: ${chalk.cyan(stats.totalEntityCount)}`);
            console.log(`   • 总关系数: ${chalk.cyan(stats.totalRelationCount)}`);
            console.log(`   • 文件数: ${chalk.green(stats.fileEntityCount)}`);
            console.log(`   • 函数数: ${chalk.blue(stats.functionEntityCount)}`);
            console.log(`   • 类数: ${chalk.magenta(stats.classEntityCount)}`);

            if (options.save) {
                await service.saveToDisk();
                console.log(chalk.green('\n💾 图谱已保存！'));
            }
        } catch (error) {
            spinner.fail('❌ 项目解析失败');
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.log(chalk.red(`\n错误: ${errorMessage}\n`));
            process.exit(1);
        }
    });

program
    .command('search')
    .description('🔍 在知识图谱中搜索代码实体')
    .argument('<query>', '搜索关键词')
    .option('-l, --limit <number>', '结果数量限制', '10')
    .option('-v, --verbose', '显示详细信息')
    .action(async (query, options) => {
        const spinner = ora('🔍 正在搜索...').start();
        try {
            const service = new CodeKnowledgeGraphService();
            await service.initialize();
            const projectPath = path.join(process.cwd(), 'examples', 'sample-project');
            await service.analyzeProject(projectPath);
            const limit = parseInt(options.limit || '10');
            const results = await service.getSemanticSearch().searchEntities(query, limit);
            spinner.succeed('✅ 搜索完成！');
            if (results.length === 0) {
                console.log(chalk.yellow(`\n未找到 "${query}" 的匹配结果。\n`));
            } else {
                console.log(chalk.bold(`\n🔍 找到 ${results.length} 个匹配结果：\n`));
                results.forEach((result, index) => {
                    const entityData = result.entityData;
                    const type = entityData?.type || 'Unknown';
                    const name = entityData?.className || entityData?.functionName || entityData?.fileName || 'Unknown';
                    const typeColor = type === 'Class' ? chalk.magenta :
                        type === 'Function' ? chalk.blue :
                            type === 'Method' ? chalk.cyan :
                                type === 'File' ? chalk.green :
                                    chalk.cyan;
                    console.log(`  ${chalk.cyan(String(index + 1).padStart(2, ' '))}. [${typeColor(type)}] ${chalk.white(name)}`);
                    console.log(`      相似度: ${chalk.gray((result.relevanceScore * 100).toFixed(1))}%`);
                });
                console.log();
            }
        } catch (error) {
            spinner.fail('❌ 搜索失败');
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.log(chalk.red(`\n错误: ${errorMessage}\n`));
            process.exit(1);
        }
    });

program
    .command('stats')
    .description('📈 查看知识图谱统计信息')
    .option('-j, --json', '输出JSON格式')
    .action(async (options) => {
        const spinner = ora('📊 加载统计信息...').start();
        try {
            const service = new CodeKnowledgeGraphService();
            await service.initialize();
            const projectPath = path.join(process.cwd(), 'examples', 'sample-project');
            const result = await service.analyzeProject(projectPath);
            const stats = result.knowledgeGraph.getStatistics();
            spinner.succeed('✅ 统计信息加载完成！');
            if (options.json) {
                console.log(JSON.stringify(stats, null, 2));
            } else {
                console.log(chalk.bold(`
╔═══════════════════════════════════════════════════════════════╗
║                     📊 知识图谱统计                          ║
╚═══════════════════════════════════════════════════════════════╝`));
                console.log(chalk.bold('\n  📈 总览：'));
                console.log(`     • 实体总数: ${chalk.cyan(stats.totalEntityCount)}`);
                console.log(`     • 关系总数: ${chalk.cyan(stats.totalRelationCount)}`);
                console.log(chalk.bold('\n  📦 代码实体：'));
                console.log(`     • 文件数: ${chalk.green(stats.fileEntityCount)}`);
                console.log(`     • 类数: ${chalk.magenta(stats.classEntityCount)}`);
                console.log(`     • 函数数: ${chalk.blue(stats.functionEntityCount)}`);
                console.log(chalk.bold('\n  ═══════════════════════════════════════════════════════════\n'));
            }
        } catch (error) {
            spinner.fail('❌ 获取统计信息失败');
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.log(chalk.red(`\n错误: ${errorMessage}\n`));
            process.exit(1);
        }
    });

program
    .command('list')
    .description('📋 列出所有代码实体')
    .option('-t, --type <type>', '按类型过滤 (Class, Function, File, etc.)')
    .option('-l, --limit <number>', '结果数量限制', '20')
    .action(async (options) => {
        const spinner = ora('📋 加载实体列表...').start();
        try {
            const service = new CodeKnowledgeGraphService();
            await service.initialize();
            const projectPath = path.join(process.cwd(), 'examples', 'sample-project');
            const result = await service.analyzeProject(projectPath);
            const limit = parseInt(options.limit || '20');
            const entityType = options.type;
            let entities;
            if (entityType) {
                entities = result.knowledgeGraph.getCodeEntitiesByType(entityType);
            } else {
                const stats = result.knowledgeGraph.getStatistics();
                const types = Object.keys(stats.entityCountByType);
                entities = [];
                for (const type of types) {
                    entities.push(...result.knowledgeGraph.getCodeEntitiesByType(type));
                }
            }
            spinner.succeed('✅ 加载完成！');
            console.log(chalk.bold(`\n📋 代码实体列表 (${Math.min(entities.length, limit)}/${entities.length}):\n`));
            entities.slice(0, limit).forEach((entity, index) => {
                const entityData = entity.entityData;
                const type = entityData?.type || 'Unknown';
                const name = entityData?.className || entityData?.functionName || entityData?.fileName || entityData?.interfaceName || entityData?.enumName || 'Unknown';
                const typeColor = type === 'Class' ? chalk.magenta :
                    type === 'Function' ? chalk.blue :
                        type === 'Method' ? chalk.cyan :
                            type === 'File' ? chalk.green :
                                type === 'Interface' ? chalk.yellow :
                                    type === 'Enum' ? chalk.red :
                                        chalk.cyan;
                console.log(`  ${chalk.cyan(String(index + 1).padStart(2, ' '))}. [${typeColor(type)}] ${chalk.white(name)}`);
            });
            console.log();
        } catch (error) {
            spinner.fail('❌ 加载失败');
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.log(chalk.red(`\n错误: ${errorMessage}\n`));
            process.exit(1);
        }
    });

program.parse();
