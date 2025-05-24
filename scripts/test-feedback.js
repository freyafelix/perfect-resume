#!/usr/bin/env node

/**
 * 反馈API快速测试脚本
 * 用于验证API的基本功能（不依赖Jest）
 */

const http = require('http');

// 测试用例数据
const testCases = [
  {
    name: '成功提交bug反馈',
    data: { type: 'bug', content: '测试bug反馈' },
    expectedStatus: 200
  },
  {
    name: '成功提交功能建议',
    data: { type: 'suggestion', content: '测试功能建议' },
    expectedStatus: 200
  },
  {
    name: '拒绝空内容',
    data: { type: 'bug', content: '' },
    expectedStatus: 400
  },
  {
    name: '拒绝空类型',
    data: { type: '', content: '测试内容' },
    expectedStatus: 400
  }
];

// 发送测试请求
async function sendTestRequest(testCase) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(testCase.data);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/feedback',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'TestScript/1.0'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: response
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

// 运行所有测试
async function runTests() {
  console.log('🚀 开始运行反馈API测试...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    try {
      console.log(`📝 测试: ${testCase.name}`);
      
      const result = await sendTestRequest(testCase);
      
      if (result.status === testCase.expectedStatus) {
        console.log(`✅ 通过 - 状态码: ${result.status}`);
        if (result.data.message) {
          console.log(`   消息: ${result.data.message}`);
        }
        passed++;
      } else {
        console.log(`❌ 失败 - 期望状态码: ${testCase.expectedStatus}, 实际: ${result.status}`);
        console.log(`   响应: ${JSON.stringify(result.data)}`);
        failed++;
      }
      
    } catch (error) {
      console.log(`❌ 错误 - ${error.message}`);
      failed++;
    }
    
    console.log(''); // 空行分隔
  }
  
  // 测试总结
  console.log('📊 测试总结:');
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`📈 成功率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 所有测试通过！');
    process.exit(0);
  } else {
    console.log('\n⚠️  有测试失败，请检查API实现');
    process.exit(1);
  }
}

// 检查服务器是否运行
async function checkServer() {
  try {
    await sendTestRequest({ data: {}, expectedStatus: 400 });
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ 错误: 无法连接到开发服务器');
      console.log('请先运行: npm run dev');
      return false;
    }
    return true; // 其他错误认为服务器是运行的
  }
}

// 主函数
async function main() {
  console.log('反馈API测试工具');
  console.log('================\n');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }
  
  await runTests();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { sendTestRequest, runTests }; 