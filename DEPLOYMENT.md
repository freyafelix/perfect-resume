# 🚀 部署指南

## Vercel部署 (推荐)

### 步骤1: 准备代码仓库
```bash
# 如果还没有Git仓库，先初始化
git init
git add .
git commit -m "Initial commit"

# 推送到GitHub
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

### 步骤2: Vercel部署
1. 访问 [vercel.com](https://vercel.com)
2. 使用GitHub账号登录
3. 点击 "New Project"
4. 选择您的GitHub仓库
5. 配置环境变量（如果需要）
6. 点击 "Deploy"

### 环境变量设置
在Vercel控制台的Settings > Environment Variables中添加：
```
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret
```

---

## Netlify部署 (替代方案)

### 步骤1: 构建配置
创建 `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[build.environment]
  NPM_FLAGS = "--prefix=/opt/buildhome/repo"
```

### 步骤2: 部署
1. 访问 [netlify.com](https://netlify.com)
2. 连接GitHub仓库
3. 设置构建命令: `npm run build`
4. 设置发布目录: `.next`
5. 部署

---

## Railway部署 (支持数据库)

### 优势
- 支持PostgreSQL数据库
- 简单的环境变量管理
- 自动CI/CD

### 部署步骤
1. 访问 [railway.app](https://railway.app)
2. 连接GitHub仓库
3. 选择Next.js模板
4. 设置环境变量
5. 部署

---

## 部署前检查清单

### ✅ 代码准备
- [ ] 所有功能测试通过
- [ ] 环境变量配置正确
- [ ] 依赖项版本兼容
- [ ] 构建无错误

### ✅ 测试验证
```bash
# 本地构建测试
npm run build
npm start

# 运行测试
npm test
```

### ✅ 生产环境配置
确保以下文件存在并配置正确：
- `package.json` - 包含正确的scripts
- `next.config.mjs` - Next.js配置
- `.gitignore` - 忽略不必要的文件

---

## 常见问题解决

### Q: API路由在部署后不工作？
A: 确保部署平台支持服务端渲染。Vercel自动支持，其他平台可能需要额外配置。

### Q: 环境变量如何设置？
A: 在部署平台的环境变量设置中添加，不要在代码中硬编码敏感信息。

### Q: 构建失败怎么办？
A: 检查依赖版本兼容性，确保本地可以成功构建。

### Q: 部署后页面空白？
A: 检查浏览器控制台错误，通常是资源加载问题或API调用失败。

---

## 比赛提交清单

### 📋 必须提交的内容
1. **作品访问链接** ✅ 
   - 部署后的网站URL
   - 确保可以正常访问和使用

2. **作品源代码** ✅
   - GitHub仓库链接
   - 包含完整源代码和文档

3. **作品介绍PPT** ✅
   - 项目功能介绍
   - 技术架构说明
   - 创新点展示

### 🎯 建议补充内容
- 在线演示视频
- 用户使用手册
- 技术文档链接 