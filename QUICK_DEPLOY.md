# 🚀 快速部署指南

## 最简单的部署方式 - Vercel

### 1️⃣ 上传到GitHub
```bash
# 初始化Git仓库（如果还没有）
git init
git add .
git commit -m "Ready for deployment"

# 创建GitHub仓库并推送
# 1. 在GitHub上创建新仓库
# 2. 复制仓库地址
git remote add origin https://github.com/你的用户名/仓库名.git
git push -u origin main
```

### 2️⃣ 部署到Vercel
1. 访问 **[vercel.com](https://vercel.com)**
2. 点击 **"Sign up"** 用GitHub账号注册
3. 点击 **"New Project"**
4. 选择您刚刚上传的GitHub仓库
5. 点击 **"Deploy"** 

### 3️⃣ 等待部署完成
- 大约1-3分钟部署完成
- 您会获得一个类似 `https://your-app.vercel.app` 的访问链接

### 4️⃣ 测试部署结果
- 访问您的部署链接
- 测试简历生成功能
- 测试反馈功能

## 🎯 比赛提交内容

### ✅ 必须提交的三项内容：

1. **作品访问链接**
   - 您的Vercel部署链接 (如: `https://resume-ai-generator.vercel.app`)

2. **作品源代码**
   - 您的GitHub仓库链接 (如: `https://github.com/username/resume-ai-generator`)

3. **作品介绍PPT**
   - 项目功能介绍
   - 技术架构说明
   - 创新点和亮点

## 🔧 如果遇到问题

### 部署失败？
- 确保本地能正常运行: `npm run dev`
- 检查构建是否成功: `npm run build`

### API不工作？
- 在Vercel项目设置中添加环境变量:
  - `FEISHU_APP_ID`: 您的飞书应用ID
  - `FEISHU_APP_SECRET`: 您的飞书应用密钥

### 需要帮助？
- 查看 `DEPLOYMENT.md` 获取详细部署指南
- 检查Vercel控制台的构建日志

## 📝 PPT建议内容

### 封面页
- 项目名称: "AI简历生成器"
- 团队信息
- 比赛信息

### 项目介绍
- 解决的问题: 简历制作难题
- 目标用户: 求职者、学生

### 功能演示
- 文件解析上传
- AI简历生成
- 用户反馈系统

### 技术架构
- 前端: Next.js + React
- 后端: Next.js API Routes
- AI集成: 大语言模型API
- 部署: Vercel

### 创新点
- 多格式文件解析 (PDF, Word, 图片OCR)
- 智能简历优化建议
- 实时反馈收集
- 响应式设计

### 总结
- 解决实际问题
- 技术方案成熟
- 用户体验友好 