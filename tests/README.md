# 测试说明

## 概述

本项目为反馈API `/api/feedback` 提供了完整的测试覆盖，确保所有功能正常工作。

## 测试安装

首先安装测试依赖：

```bash
npm install
```

## 运行测试

### 基本测试运行
```bash
npm test
```

### 观察模式（开发时推荐）
```bash
npm run test:watch
```

### 生成覆盖率报告
```bash
npm run test:coverage
```

## 测试覆盖范围

### 1. 成功场景测试
- ✅ 成功提交bug反馈
- ✅ 成功提交功能建议
- ✅ 成功提交表扬反馈
- ✅ 处理其他类型反馈
- ✅ 处理未知类型反馈（自动归类为"其他"）

### 2. 输入验证测试
- ✅ 拒绝空的反馈类型
- ✅ 拒绝空的反馈内容
- ✅ 拒绝缺少反馈类型字段
- ✅ 拒绝缺少反馈内容字段

### 3. 飞书API集成测试
- ✅ 处理获取访问令牌失败
- ✅ 处理提交记录失败
- ✅ 处理网络错误
- ✅ 处理缺少飞书配置

### 4. 用户信息提取测试
- ✅ 正确提取用户代理信息
- ✅ 处理缺少用户代理的情况
- ✅ 正确提取IP地址（x-forwarded-for）
- ✅ 正确提取IP地址（x-real-ip）
- ✅ 处理缺少IP信息的情况

### 5. 异常处理测试
- ✅ 处理无效的JSON请求体
- ✅ 处理空的请求体

## 测试文件结构

```
app/api/feedback/
├── route.ts                  # 主要API文件
└── __tests__/
    └── route.test.ts         # 测试文件
```

## Mock说明

测试使用了以下Mock：

1. **全局fetch Mock** - 模拟飞书API调用
2. **环境变量Mock** - 模拟飞书配置
3. **NextRequest Mock** - 模拟HTTP请求

## 测试类型映射验证

测试验证了以下反馈类型映射：
- `bug` → `功能异常`
- `suggestion` → `功能建议`
- `compliment` → `表扬赞美`
- `other` → `其他`
- 未知类型 → `其他`

## 故障转移机制测试

测试确认了当飞书API失败时，系统会：
1. 记录错误到控制台
2. 仍然返回成功响应给用户
3. 显示友好的错误消息

这确保了即使外部服务失败，用户体验也不会受到影响。

## 贡献指南

添加新测试时请遵循以下格式：

```typescript
test('应该[测试描述]', async () => {
  // 准备测试数据
  const requestBody = { ... }
  
  // 创建mock request
  const mockRequest = new NextRequest(...)
  
  // 执行API调用
  const response = await POST(mockRequest)
  const responseData = await response.json()
  
  // 验证结果
  expect(response.status).toBe(...)
  expect(responseData...).toBe(...)
})
``` 