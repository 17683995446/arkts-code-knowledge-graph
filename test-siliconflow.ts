#!/usr/bin/env node
import { EnhancedAIService } from './src/core/ai/EnhancedAIService.js';

async function testSiliconFlow() {
  console.log('🔍 测试硅基流动AI集成...');
  
  try {
    // 创建配置好硅基流动的AI服务
    const aiService = new EnhancedAIService({
      provider: 'siliconflow',
      apiKey: 'sk-uqelhavcdhfxjzjesdenxpbtqombjniazzjtbssmdcwdvg',
      baseUrl: 'https://api.siliconflow.cn/v1',
      model: 'Qwen/Qwen2.5-7B-Instruct',
      temperature: 0.3,
      maxTokens: 2000,
    });
    
    console.log('✅ AI服务初始化完成');
    
    // 准备测试代码
    const testCode = `function calculateFactorial(n) {
  if (n < 0) throw new Error('Negative number not allowed');
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

class Calculator {
  constructor() {
    this.result = 0;
  }
  
  add(num) {
    this.result += num;
    return this;
  }
  
  subtract(num) {
    this.result -= num;
    return this;
  }
  
  multiply(num) {
    this.result *= num;
    return this;
  }
  
  getResult() {
    return this.result;
  }
}

// 使用示例
const calc = new Calculator();
const factorial = calculateFactorial(5);
console.log('5! =', factorial);
console.log('Calculation:', calc.add(10).multiply(2).subtract(5).getResult());`;
    
    console.log('\n📄 测试代码准备就绪');
    console.log('======================');
    console.log(testCode);
    console.log('======================');
    
    // 测试本地分析
    console.log('\n⚡ 开始本地分析...');
    const localResult = await aiService.analyze({
      code: testCode,
      language: 'TypeScript',
      analysisType: 'full',
    });
    
    console.log('\n✅ 本地分析完成');
    console.log('复杂度评分:', localResult.complexity?.score);
    console.log('代码质量评分:', localResult.quality?.overall);
    console.log('安全问题数量:', localResult.securityIssues?.length);
    console.log('改进建议数量:', localResult.suggestions?.length);
    
    if (localResult.suggestions && localResult.suggestions.length > 0) {
      console.log('\n💡 主要建议:');
      localResult.suggestions.slice(0, 3).forEach((suggestion, index) => {
        console.log(`  ${index + 1}. [${suggestion.priority}] ${suggestion.title}`);
      });
    }
    
    // 尝试AI增强分析（可选）
    console.log('\n🤖 尝试AI增强分析...');
    try {
      const aiResult = await aiService.analyzeWithAI({
        code: testCode,
        language: 'TypeScript',
        analysisType: 'full',
      });
      
      console.log('✅ AI分析完成');
      console.log('使用的模型:', aiResult.aiModelUsed);
      console.log('置信度:', aiResult.confidenceScore);
    } catch (aiError) {
      console.log('⚠️ AI分析暂时跳过 (如需完整AI功能可调试API连接)');
      console.log('   本地分析功能仍然可用');
    }
    
    console.log('\n🎉 测试完成!');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

testSiliconFlow();
