/**
 * 迭代2：真实项目极限测试
 * 
 * 测试目标：
 * - 分析 nest.js 项目（大型Node.js框架）
 * - 分析 vue-core 项目（Vue.js核心）
 * - 分析本地 src 目录
 * - 验证真实场景下的性能和数据正确性
 */

import { describe, it, expect } from 'vitest';
import { EnhancedCodeKnowledgeGraphService } from '../src/services/EnhancedCodeKnowledgeGraphService';
import * as path from 'path';

describe('迭代2：真实项目极限测试', () => {
    describe('2.1 nest.js 项目分析', () => {
        it('应该成功分析 nest.js 完整项目', async () => {
            const service = new EnhancedCodeKnowledgeGraphService({
                dataDirectory: '/tmp/nestjs-test'
            });
            
            await service.initialize();
            
            const startTime = Date.now();
            const result = await service.analyzeProject('/workspace/nest.js');
            const duration = Date.now() - startTime;
            
            console.log(`📊 nest.js 分析结果:`);
            console.log(`   耗时: ${duration}ms`);
            console.log(`   实体数: ${result.knowledgeGraph.getStatistics().totalEntityCount}`);
            console.log(`   关系数: ${result.knowledgeGraph.getStatistics().totalRelationCount}`);
            
            expect(result.duration).toBeGreaterThan(0);
            expect(result.knowledgeGraph.getStatistics().totalEntityCount).toBeGreaterThan(0);
            
            console.log(`✅ nest.js 分析完成`);
        }, 300000); // 5分钟超时
    });

    describe('2.2 vue-core 项目分析', () => {
        it('应该成功分析 vue-core 项目', async () => {
            const service = new EnhancedCodeKnowledgeGraphService({
                dataDirectory: '/tmp/vue-test'
            });
            
            await service.initialize();
            
            const startTime = Date.now();
            const result = await service.analyzeProject('/workspace/vue-core');
            const duration = Date.now() - startTime;
            
            console.log(`📊 vue-core 分析结果:`);
            console.log(`   耗时: ${duration}ms`);
            console.log(`   实体数: ${result.knowledgeGraph.getStatistics().totalEntityCount}`);
            console.log(`   关系数: ${result.knowledgeGraph.getStatistics().totalRelationCount}`);
            
            expect(result.duration).toBeGreaterThan(0);
            expect(result.knowledgeGraph.getStatistics().totalEntityCount).toBeGreaterThan(0);
            
            console.log(`✅ vue-core 分析完成`);
        }, 300000); // 5分钟超时
    });

    describe('2.3 src 目录项目分析', () => {
        it('应该成功分析本地 src 目录', async () => {
            const service = new EnhancedCodeKnowledgeGraphService({
                dataDirectory: '/tmp/src-test'
            });
            
            await service.initialize();
            
            const startTime = Date.now();
            const result = await service.analyzeProject('/workspace/src');
            const duration = Date.now() - startTime;
            
            console.log(`📊 src 分析结果:`);
            console.log(`   耗时: ${duration}ms`);
            console.log(`   实体数: ${result.knowledgeGraph.getStatistics().totalEntityCount}`);
            console.log(`   关系数: ${result.knowledgeGraph.getStatistics().totalRelationCount}`);
            
            expect(result.duration).toBeGreaterThan(0);
            expect(result.knowledgeGraph.getStatistics().totalEntityCount).toBeGreaterThan(0);
            
            console.log(`✅ src 分析完成`);
        }, 60000); // 1分钟超时
    });

    describe('2.4 多次分析一致性测试', () => {
        it('应该保证多次分析结果一致', async () => {
            const projectPath = '/workspace/examples/sample-project';
            
            const service1 = new EnhancedCodeKnowledgeGraphService({
                dataDirectory: '/tmp/consistency-test-1'
            });
            await service1.initialize();
            const result1 = await service1.analyzeProject(projectPath);
            
            const service2 = new EnhancedCodeKnowledgeGraphService({
                dataDirectory: '/tmp/consistency-test-2'
            });
            await service2.initialize();
            const result2 = await service2.analyzeProject(projectPath);
            
            const stats1 = result1.knowledgeGraph.getStatistics();
            const stats2 = result2.knowledgeGraph.getStatistics();
            
            console.log(`📊 第一次分析: 实体=${stats1.totalEntityCount}, 关系=${stats1.totalRelationCount}`);
            console.log(`📊 第二次分析: 实体=${stats2.totalEntityCount}, 关系=${stats2.totalRelationCount}`);
            
            expect(stats1.totalEntityCount).toBe(stats2.totalEntityCount);
            expect(stats1.totalRelationCount).toBe(stats2.totalRelationCount);
            
            console.log(`✅ 一致性验证通过`);
        }, 60000);
    });

    describe('2.5 查询性能测试', () => {
        it('应该在大规模数据下保持查询性能', async () => {
            const service = new EnhancedCodeKnowledgeGraphService({
                dataDirectory: '/tmp/query-perf-test'
            });
            
            await service.initialize();
            
            // 先分析一个大项目
            await service.analyzeProject('/workspace/src');
            
            const queryEngine = service.getQueryEngine();
            
            const queryStart = Date.now();
            for (let i = 0; i < 1000; i++) {
                queryEngine.getStatistics();
            }
            const queryDuration = Date.now() - queryStart;
            
            console.log(`📊 1000次查询耗时: ${queryDuration}ms`);
            expect(queryDuration).toBeLessThan(5000); // 应该在5秒内
            
            console.log(`✅ 查询性能达标`);
        }, 120000);
    });

    describe('2.6 持久化测试', () => {
        it('应该正确保存和加载大规模数据', async () => {
            const service = new EnhancedCodeKnowledgeGraphService({
                dataDirectory: '/tmp/persist-test'
            });
            
            await service.initialize();
            
            // 分析项目
            await service.analyzeProject('/workspace/examples/sample-project');
            
            const beforeStats = service.getKnowledgeGraph().getStatistics();
            console.log(`📊 保存前: ${beforeStats.totalEntityCount} 实体`);
            
            // 保存
            await service.saveToDisk();
            
            // 重新加载
            const newService = new EnhancedCodeKnowledgeGraphService({
                dataDirectory: '/tmp/persist-test'
            });
            await newService.initialize();
            await newService.loadFromDisk();
            
            const afterStats = newService.getKnowledgeGraph().getStatistics();
            console.log(`📊 加载后: ${afterStats.totalEntityCount} 实体`);
            
            expect(afterStats.totalEntityCount).toBe(beforeStats.totalEntityCount);
            expect(afterStats.totalRelationCount).toBe(beforeStats.totalRelationCount);
            
            console.log(`✅ 持久化验证通过`);
        }, 60000);
    });
});

