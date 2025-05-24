# 飞书多维表格反馈系统配置指南

## 📋 第一步：设置飞书多维表格字段

在您的飞书多维表格中创建以下字段：

| 字段名称 | 字段类型 | 是否必填 | 默认值 | 说明 |
|---------|---------|---------|-------|------|
| **反馈ID** | 自动编号 | ✅ | - | 自动生成，用于追踪 |
| **提交时间** | 日期时间 | ✅ | - | 反馈提交的时间 |
| **反馈类型** | 单选 | ✅ | - | 选项：功能异常/功能建议/表扬赞美/其他 |
| **反馈内容** | 多行文本 | ✅ | - | 用户详细反馈内容 |
| **用户标识** | 单行文本 | ❌ | - | IP地址或用户ID |
| **处理状态** | 单选 | ❌ | 待处理 | 选项：待处理/处理中/已完成/已关闭 |
| **负责人** | 人员 | ❌ | - | 分配给谁处理 |
| **优先级** | 单选 | ❌ | 中 | 选项：高/中/低 |
| **回复内容** | 多行文本 | ❌ | - | 处理结果或回复 |

## 🔧 第二步：创建飞书应用

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 创建企业自建应用
3. 获取 `App ID` 和 `App Secret`
4. 在应用权限中添加：
   - `bitable:app` - 多维表格应用权限
   - `bitable:app:readonly` - 多维表格读权限
   - `bitable:app:write` - 多维表格写权限

## 📝 第三步：获取表格信息

### 获取 app_token
从您的多维表格链接中提取：
```
https://x4f9v0ilrq.feishu.cn/base/ZX1xbviRqabJCdsHN2ocHrkrnVh
                                   ^^^^^^^^^^^^^^^^^^^^^^^^
                                   这个就是 app_token
```

### 获取 table_id
1. 打开多维表格
2. 点击右上角 "..." → "复制链接"
3. 或者使用飞书 API 查询：
```bash
curl -X GET \
  'https://open.feishu.cn/open-apis/bitable/v1/apps/ZX1xbviRqabJCdsHN2ocHrkrnVh/tables' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

## ⚙️ 第四步：配置环境变量

在项目根目录的 `.env.local` 文件中添加：

```env
# 华师大ECNU API密钥
ECNU_API_KEY=your_ecnu_api_key_here

# 飞书多维表格配置
FEISHU_APP_ID=your_feishu_app_id_here
FEISHU_APP_SECRET=your_feishu_app_secret_here
```

## 🔍 第五步：更新代码中的表格ID

在 `app/api/feedback/route.ts` 文件中，更新以下变量：

```typescript
const tableId = "您的实际表格ID" // 替换 tbl1234567890
```

## 🧪 测试配置

1. 重启开发服务器：
```bash
npm run dev
```

2. 在网站中提交一条测试反馈
3. 检查飞书多维表格是否收到数据

## 🚨 故障排除

### 常见错误及解决方案：

1. **权限不足错误**
   - 检查飞书应用权限配置
   - 确认 app_token 和 table_id 正确

2. **环境变量未生效**
   - 确认 `.env.local` 文件位于项目根目录
   - 重启开发服务器

3. **字段名称不匹配**
   - 确保表格字段名称与代码中完全一致（区分大小写）

4. **网络连接问题**
   - 检查防火墙设置
   - 确认能访问 `open.feishu.cn`

## 📞 技术支持

如果遇到问题，请检查：
1. 浏览器开发者工具的网络面板
2. 服务器控制台日志
3. 飞书开放平台的应用日志 