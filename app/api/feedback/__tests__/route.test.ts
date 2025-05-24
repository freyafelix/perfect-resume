import { NextRequest } from 'next/server'
import { POST } from '../route'

// Mock fetch globally
global.fetch = jest.fn()

describe('/api/feedback', () => {
  let mockRequest: NextRequest

  beforeEach(() => {
    // 重置所有mocks
    jest.clearAllMocks()
    
    // 设置默认的mock fetch response
    ;(global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          code: 0,
          tenant_access_token: 'mock_access_token',
          data: {
            record: {
              record_id: 'mock_record_id'
            }
          }
        })
      })
    )
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('成功场景', () => {
    test('应该成功提交bug反馈', async () => {
      const requestBody = {
        type: 'bug',
        content: '页面加载时出现错误'
      }

      mockRequest = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'Mozilla/5.0 (test browser)',
          'x-forwarded-for': '192.168.1.1'
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.message).toBe('反馈提交成功，感谢您的宝贵意见！')
      expect(responseData.recordId).toBe('mock_record_id')
      
      // 验证飞书API调用
      expect(global.fetch).toHaveBeenCalledTimes(2) // token + submit
    })

    test('应该成功提交功能建议', async () => {
      const requestBody = {
        type: 'suggestion',
        content: '希望增加深色模式'
      }

      mockRequest = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'Mozilla/5.0 (test browser)',
          'x-forwarded-for': '192.168.1.2'
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      
      // 验证提交到飞书的数据格式
      const submitCall = (global.fetch as jest.Mock).mock.calls.find(call => 
        call[0].includes('/records')
      )
      expect(submitCall).toBeDefined()
      
      const submitBody = JSON.parse(submitCall[1].body)
      expect(submitBody.fields['反馈类型']).toBe('功能建议')
      expect(submitBody.fields['反馈内容']).toBe('希望增加深色模式')
      expect(submitBody.fields['用户标识']).toBe('192.168.1.2')
    })

    test('应该成功提交表扬反馈', async () => {
      const requestBody = {
        type: 'compliment',
        content: '界面设计很棒！'
      }

      mockRequest = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
    })

    test('应该处理其他类型的反馈', async () => {
      const requestBody = {
        type: 'other',
        content: '其他类型的反馈'
      }

      mockRequest = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      
      // 验证其他类型映射
      const submitCall = (global.fetch as jest.Mock).mock.calls.find(call => 
        call[0].includes('/records')
      )
      const submitBody = JSON.parse(submitCall[1].body)
      expect(submitBody.fields['反馈类型']).toBe('其他')
    })

    test('应该处理未知反馈类型', async () => {
      const requestBody = {
        type: 'unknown_type',
        content: '未知类型的反馈'
      }

      mockRequest = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      
      // 验证未知类型映射为"其他"
      const submitCall = (global.fetch as jest.Mock).mock.calls.find(call => 
        call[0].includes('/records')
      )
      const submitBody = JSON.parse(submitCall[1].body)
      expect(submitBody.fields['反馈类型']).toBe('其他')
    })
  })

  describe('验证失败场景', () => {
    test('应该拒绝空的反馈类型', async () => {
      const requestBody = {
        type: '',
        content: '测试内容'
      }

      mockRequest = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('反馈类型和内容不能为空')
    })

    test('应该拒绝空的反馈内容', async () => {
      const requestBody = {
        type: 'bug',
        content: ''
      }

      mockRequest = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('反馈类型和内容不能为空')
    })

    test('应该拒绝缺少反馈类型字段', async () => {
      const requestBody = {
        content: '测试内容'
      }

      mockRequest = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('反馈类型和内容不能为空')
    })

    test('应该拒绝缺少反馈内容字段', async () => {
      const requestBody = {
        type: 'bug'
      }

      mockRequest = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('反馈类型和内容不能为空')
    })
  })

  describe('飞书API失败场景', () => {
    test('应该处理获取访问令牌失败', async () => {
      // Mock token request failure
      ;(global.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            json: () => Promise.resolve({
              code: 1,
              msg: '应用配置错误'
            })
          })
        )

      const requestBody = {
        type: 'bug',
        content: '测试内容'
      }

      mockRequest = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.message).toBe('反馈已收到，我们会认真处理！')
    })

    test('应该处理提交记录失败', async () => {
      // Mock successful token but failed record submission
      ;(global.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            json: () => Promise.resolve({
              code: 0,
              tenant_access_token: 'mock_access_token'
            })
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            json: () => Promise.resolve({
              code: 1,
              msg: '记录提交失败'
            })
          })
        )

      const requestBody = {
        type: 'bug',
        content: '测试内容'
      }

      mockRequest = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.message).toBe('反馈已收到，我们会认真处理！')
    })

    test('应该处理网络错误', async () => {
      // Mock network error
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('网络错误'))

      const requestBody = {
        type: 'bug',
        content: '测试内容'
      }

      mockRequest = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.message).toBe('反馈已收到，我们会认真处理！')
    })
  })

  describe('缺少飞书配置场景', () => {
    test('应该处理缺少APP_ID配置', async () => {
      // 临时删除环境变量
      const originalAppId = process.env.FEISHU_APP_ID
      delete process.env.FEISHU_APP_ID

      const requestBody = {
        type: 'bug',
        content: '测试内容'
      }

      mockRequest = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.message).toBe('反馈已收到，我们会认真处理！')
      
      // 不应该调用飞书API
      expect(global.fetch).not.toHaveBeenCalled()

      // 恢复环境变量
      process.env.FEISHU_APP_ID = originalAppId
    })

    test('应该处理缺少APP_SECRET配置', async () => {
      // 临时删除环境变量
      const originalAppSecret = process.env.FEISHU_APP_SECRET
      delete process.env.FEISHU_APP_SECRET

      const requestBody = {
        type: 'bug',
        content: '测试内容'
      }

      mockRequest = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.message).toBe('反馈已收到，我们会认真处理！')

      // 恢复环境变量
      process.env.FEISHU_APP_SECRET = originalAppSecret
    })
  })

  describe('用户信息提取', () => {
    test('应该正确提取用户代理信息', async () => {
      const requestBody = {
        type: 'bug',
        content: '测试内容'
      }

      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      mockRequest = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'user-agent': userAgent
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(mockRequest)
      expect(response.status).toBe(200)
    })

    test('应该处理缺少用户代理的情况', async () => {
      const requestBody = {
        type: 'bug',
        content: '测试内容'
      }

      mockRequest = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(mockRequest)
      expect(response.status).toBe(200)
    })

    test('应该正确提取IP地址（x-forwarded-for）', async () => {
      const requestBody = {
        type: 'bug',
        content: '测试内容'
      }

      mockRequest = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '203.0.113.1, 198.51.100.1'
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(mockRequest)
      expect(response.status).toBe(200)
      
      // 验证IP地址被正确提取和使用
      const submitCall = (global.fetch as jest.Mock).mock.calls.find(call => 
        call[0].includes('/records')
      )
      if (submitCall) {
        const submitBody = JSON.parse(submitCall[1].body)
        expect(submitBody.fields['用户标识']).toBe('203.0.113.1, 198.51.100.1')
      }
    })

    test('应该正确提取IP地址（x-real-ip）', async () => {
      const requestBody = {
        type: 'bug',
        content: '测试内容'
      }

      mockRequest = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-real-ip': '203.0.113.5'
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(mockRequest)
      expect(response.status).toBe(200)
      
      // 验证IP地址被正确提取和使用
      const submitCall = (global.fetch as jest.Mock).mock.calls.find(call => 
        call[0].includes('/records')
      )
      if (submitCall) {
        const submitBody = JSON.parse(submitCall[1].body)
        expect(submitBody.fields['用户标识']).toBe('203.0.113.5')
      }
    })

    test('应该处理缺少IP信息的情况', async () => {
      const requestBody = {
        type: 'bug',
        content: '测试内容'
      }

      mockRequest = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(mockRequest)
      expect(response.status).toBe(200)
      
      // 验证使用默认值
      const submitCall = (global.fetch as jest.Mock).mock.calls.find(call => 
        call[0].includes('/records')
      )
      if (submitCall) {
        const submitBody = JSON.parse(submitCall[1].body)
        expect(submitBody.fields['用户标识']).toBe('未知IP')
      }
    })
  })

  describe('异常处理', () => {
    test('应该处理无效的JSON请求体', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: 'invalid json'
      })

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('提交失败，请稍后重试')
    })

    test('应该处理空的请求体', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: ''
      })

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('提交失败，请稍后重试')
    })
  })
}) 