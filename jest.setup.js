// jest.setup.js

// 模拟环境变量
process.env.FEISHU_APP_ID = 'test_app_id'
process.env.FEISHU_APP_SECRET = 'test_app_secret'

// 全局测试设置
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock fetch if not available
if (!global.fetch) {
  global.fetch = jest.fn()
} 