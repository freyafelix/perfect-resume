import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { resumeText, jobDescription, additionalExperience } = await request.json()

    if (!jobDescription) {
      return NextResponse.json({ error: "岗位描述不能为空" }, { status: 400 })
    }

    const apiKey = process.env.ECNU_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API密钥未配置" }, { status: 500 })
    }

    // 节点1：简历原始信息提取
    const node1Result = await extractResumeInfo(resumeText, additionalExperience, apiKey)
    
    // 节点2：JD分析
    const node2Result = await analyzeJobDescription(jobDescription, apiKey)
    
    // 节点3：匹配分析
    const node3Result = await performMatchingAnalysis(node1Result, node2Result, jobDescription, apiKey)
    
    // 节点4：简历优化
    const node4Result = await generateOptimizedResume(
      node1Result, 
      node2Result, 
      node3Result, 
      jobDescription, 
      apiKey
    )

    return NextResponse.json({
      success: true,
      data: {
        matchScore: node3Result.matchScore,
        matchLevel: node3Result.matchLevel,
        coreSkillsMatch: node3Result.coreSkillsMatch,
        summary: node3Result.summary,
        optimizedResume: node4Result,
        // 可选：返回中间结果用于调试
        rawResumeExtraction: node1Result,
        jobAnalysis: node2Result
      }
    })
  } catch (error) {
    console.error("简历分析错误:", error)
    return NextResponse.json(
      {
        error: "分析过程中出现错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 },
    )
  }
}

// 节点1：简历原始信息提取
async function extractResumeInfo(resumeText: string, additionalExperience: string, apiKey: string) {
  const extractionPrompt = `你现在的任务是：对以下简历内容（${resumeText || "未提供简历"}）进行原始信息提取，不做任何加工、美化或总结，仅按照原文内容进行完整呈现，并按以下结构分类整理。请逐项提取、逐句读取，确保无遗漏。

${additionalExperience ? `补充经历：\n${additionalExperience}` : ""}

⸻

结构要求如下：

1. 个人信息

请列出 CV 中出现的所有个人基本信息，包括但不限于：
•	姓名（如出现）
•	性别（如出现）
•	出生年月或年龄（如出现）
•	手机号码
•	邮箱
•	教育背景（院校名称、学历、专业、起止时间）
•	所在城市或期望工作地（如有）
•	意向岗位

如未出现某类信息，请写"未提及"。

⸻

2. 所有经历（含实习 / 项目 / 兼职 / 学术等）

请对 CV 中的每一段经历逐一进行结构化提取，包括：
• 类别：工作经历（包含实习）/校园经历/项目等
•	时间：具体起止时间（如出现）
•	所在单位/项目：如"腾讯"或"校园调研项目"等
•	角色：岗位或职责名称（如"产品实习生"）
•	负责内容和对应结果：CV 中原始描述的职责内容以及该内容对应的结果、影响或具体数据（逐条列出）

每段经历请独立编号，确保信息不混淆。如信息模糊或未完整写出，请标注"信息不完整"。

⸻

3. 技能清单

请提取 CV 中明确提到的所有技能，包括但不限于：
•	编程语言 / 工具
•	软件使用能力
•	分析 / 设计 / 产品 / 沟通 等软硬技能
•	语言能力
•	证书类信息（如四六级、TOEFL、PMP 等）
• 课程经历 / 专业课程等

所有技能请按 CV 中原文逐条列出，保留原始描述。

⸻

4. 其他信息

请提取 CV 中未被以上三类覆盖的所有其他信息，包括不限于：
•	奖项 / 荣誉
•	兴趣爱好
•	自我评价
•	个人项目链接（如 GitHub、作品集网址等）

⸻

提取要求：
•	按原文提取信息，仅在组织结构上进行分类，不改变原始表述
•	保留每一个细节和数字（如转化率、用户数、提效比例等）
•	如有明显重复内容（有不同的来源），请整合为一份
•	如信息模糊或不完整，请直接标注"信息不完整"
•	如 CV 中出现中英混排内容，请保留原文原格式

⸻

请严格按照上述结构完整提取简历信息，逐条、逐句分析，避免跳过任何有价值内容。`

  const response = await fetch("https://chat.ecnu.edu.cn/open/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content: "你是一个专业的简历信息提取专家，擅长按照原文逐项提取简历内容，不做任何加工或美化。",
        },
        {
          role: "user",
          content: extractionPrompt,
        },
      ],
      model: "ecnu-plus",
      temperature: 0.3,
      stream: false,
    }),
  })

  if (!response.ok) {
    throw new Error(`节点1 API请求失败: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || "简历信息提取失败"
}

// 节点2：JD分析
async function analyzeJobDescription(jobDescription: string, apiKey: string) {
  const analysisPrompt = `您现在是一位资深人才评估专家。请分析以下职位JD（${jobDescription}），并输出以下六维度内容：

1. 业务与岗位概况：所属行业/岗位职级/角色在团队中的定位及价值
2. 基本大盘：梳理职位的基础要求，包括学历背景、工作经验年限、语言能力、通用软件技能、综合能力等通用要求。
3. 核心业务能力（必须）：分析JD中的关键专业技能，根据重要性评估各项能力的相对权重(以百分比表示)。列出3-5项核心能力，确保权重总和为100%。
4. 次能力（加分项）：识别JD中提到但未作为必要条件的技能，以及行业内相关的加分能力。这些技能会使候选人在同等条件下脱颖而出。
5. 工作信息：总结工作地点(Base)、期望入职时间、工作制度（全职/兼职/远程）、工作时长等相关信息。
6. 替代性经验分析：
分析JD中核心能力并列出。针对核心技能要求给出可替代经验，例如：
    - 如果核心要求是"海外AI客服产品设计"，可接受的替代经验包括：
        - 任何海外/国际化产品经验（强调海外国际化，即使不是客服领域）
        - 国内AI产品设计经验（强调AI产品理解能力）
        - 国内客服产品设计经验（强调专门的客服领域理解）
        - 一般产品设计经验
        请按照替代经验的相关性强弱排序，并说明各种组合如何弥补核心经验的不足。

请根据JD内容，对每个维度进行详细分析，给出最终的分析结果，需要详尽，不遗漏。`

  const response = await fetch("https://chat.ecnu.edu.cn/open/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content: "你是一个专业的岗位分析专家，擅长分析岗位描述中的各项要求。",
        },
        {
          role: "user",
          content: analysisPrompt,
        },
      ],
      model: "ecnu-plus",
      temperature: 0.3,
      stream: false,
    }),
  })

  if (!response.ok) {
    throw new Error(`节点2 API请求失败: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || "JD分析失败"
}

// 节点3：匹配分析
async function performMatchingAnalysis(resumeExtraction: string, jobAnalysis: string, jobDescription: string, apiKey: string) {
  const matchingPrompt = `### 角色

## 你是一位资深人才匹配专家。请基于岗位JD与候选人简历（CV），从核心业务能力、替代经验、其他因素三个维度综合评估匹配程度，并输出结构化且精简的匹配分析结果。

### ✅ 输入内容：

- JD（岗位描述）：${jobDescription}
- 简历内容（CV）：${resumeExtraction}

---

### ✅ 分析维度与权重：

1. **核心业务能力匹配度**（50%）
    - 识别 JD 中列出的所有"必须核心能力"，分别逐项评分（0–100%）。
    - 评分标准：
        - 80–100%：简历明确展现该能力，含关键词 + 量化成果
        - 60–79%：有相关经验，但缺乏深度或量化
        - 40–59%：有一定相似经验，但需较大转化
        - <40%：缺乏明显相关经验
    - **计算方法**：按各能力权重 × 匹配度 加权求和。
2. **替代经验价值评估**（30%）
    - 若简历未直接覆盖核心能力，则按替代性经验拆解评分。
    - 替代经验组合示例（示意分值）：
        - **高度替代**（70%–80%匹配价值）：替代比 × 核心能力权重 × 0.8
        - **中度替代**（60%–70%匹配价值）：替代比 × 核心能力权重 × 0.7
        - **低度替代**（50%–59%匹配价值）：替代比 × 核心能力权重 × 0.6
    - 参考 JD 第六部分"替代性经验分析"模块。
3. **其他匹配要素**（20%）
    - 考虑JD中提到的 业务与岗位概况、次能力、工作信息和基本大盘匹配度，如：学历、语言、基础技能、工作地点、入职时间、特殊工具或技术的熟练度的匹配度等。
    - 仅评估 JD 中明确提及的要素；未提及的，根据职级按行业通用标准（如 985/211/海外名校加分）。

---

### ✅ 匹配评分标准：

A级（90-100分）：高度匹配
核心业务能力匹配度≥85%，或核心能力+替代经验综合匹配度≥90%
且其他匹配要素得分≥16分(满分20分的80%)

B+级（80-89分）：较好匹配，有优化空间
核心业务能力匹配度70-84%，或核心能力+替代经验综合匹配度80-89%
且其他匹配要素得分≥14分(满分20分的70%)

B级（70-79分）：基本匹配，需调整
核心业务能力匹配度50-69%，或核心能力+替代经验综合匹配度70-79%
且其他匹配要素得分≥10分(满分20分的50%)

C级（<70分）：匹配度低
核心业务能力匹配度<50%且替代经验价值不足
或其他匹配要素得分<10分(关键基础条件不满足)

---

### ✅ 输出格式

请以简洁的JSON格式输出分析结果：
{
"score": {
"total": 83,
"core_capabilities": 40,
"alternative_experiences": 25,
"other_factors": 18,
"level_tag": "B+ 匹配级别"
},
"ability_analysis": [
{
"ability": "能力1",
"match": 40,
"status": "弱匹配",
"alternative": "替代经验组合1可部分弥补",
"improvement": "优化建议"
},
{
"ability": "能力2",
"match": 30,
"status": "严重缺失",
"alternative": "无有效替代经验",
"improvement": "当前简历未覆盖JD要求的客服沟通/私信系统方向核心能力，建议补充类似项目或换岗。"
},
{
"ability": "能力3",
"match": 85,
"status": "强匹配",
"alternative": "无需替代",
"improvement": "进一步突出量化成果，提升表达精准度。"
}
],
"summary": "整体匹配度良好，候选人在产品规划和数据分析方面表现出色，但在跨部门项目管理经验方面存在一定短板，建议在简历中进一步强化项目推进的具体成果。"
}`

  const response = await fetch("https://chat.ecnu.edu.cn/open/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content: "你是一个专业的简历匹配分析专家，擅长分析简历与岗位的匹配度并提供优化建议。",
        },
        {
          role: "user",
          content: matchingPrompt,
        },
      ],
      model: "ecnu-plus",
      temperature: 0.7,
      stream: false,
    }),
  })

  if (!response.ok) {
    throw new Error(`节点3 API请求失败: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  if (!content) {
    throw new Error("节点3 API返回内容为空")
  }

  // 尝试解析JSON响应
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsedResult = JSON.parse(jsonMatch[0])
      // 转换新格式到旧格式，保持向后兼容
      const formatAbilityAnalysis = (abilities: any[]) => {
        if (!abilities || abilities.length === 0) return "暂无能力分析数据"
        
        return abilities.map((item, index) => {
          return `## 能力 ${index + 1}：${item.ability || '未指定'}

**匹配度：** ${item.match || 0}%
**状态：** ${item.status || '未知'}
**替代经验：** ${item.alternative || '无'}
**改进建议：** ${item.improvement || '无具体建议'}

---`
        }).join('\n\n')
      }

      return {
        matchScore: parsedResult.score?.total || 0,
        matchLevel: parsedResult.score?.level_tag || "需要分析",
        coreSkillsMatch: formatAbilityAnalysis(parsedResult.ability_analysis || []),
        summary: parsedResult.summary || "分析完成，请查看详细内容",
        optimizedResume: parsedResult.ability_analysis?.map((item: any) => item.improvement).join('\n') || "正在生成优化建议...",
        // 保留新格式的详细信息
        detailedScore: parsedResult.score,
        abilityAnalysis: parsedResult.ability_analysis
      }
    } else {
      // 如果没有找到JSON，创建默认结构
      return {
        matchScore: 0,
        matchLevel: "需要分析",
        coreSkillsMatch: content,
        summary: "分析完成，请查看详细内容",
        optimizedResume: "正在生成优化建议...",
      }
    }
  } catch (parseError) {
    // JSON解析失败时的备用方案
    return {
      matchScore: 0,
      matchLevel: "分析完成",
      coreSkillsMatch: content,
      summary: "已完成分析，请查看详细内容",
      optimizedResume: content,
    }
  }
}

// 节点4：简历优化
async function generateOptimizedResume(
  resumeExtraction: string, 
  jobAnalysis: string, 
  matchingResult: any, 
  jobDescription: string, 
  apiKey: string
) {
  // 提取匹配分析结果中的关键数据
  const summary = matchingResult.summary || "无匹配分析摘要"
  const abilityAnalysis = matchingResult.coreSkillsMatch || "无能力分析"
  const score = matchingResult.detailedScore || {
    total: matchingResult.matchScore || 0,
    core_capabilities: 0,
    alternative_experiences: 0,
    other_factors: 0,
    level_tag: matchingResult.matchLevel || "未评级"
  }

  const optimizationPrompt = `### 角色

你是一位资深简历优化专家。你将根据以下输入信息，为候选人生成一份适配目标岗位 JD 的优化简历版本

### 参考内容：

\`\`\`
1.	原始简历（CV）：${resumeExtraction}
2.	岗位要求 JD（提炼后）：${jobAnalysis}
3.	匹配分析摘要：${summary}
4.	核心能力匹配分析：${abilityAnalysis}
5.	匹配评分等级：
•	总分：${score.total} 分
•	核心能力得分：${score.core_capabilities} 分
•	替代经验得分：${score.alternative_experiences} 分
•	其他因素得分：${score.other_factors} 分
•	等级标签：${score.level_tag}

\`\`\`

⸻

⚠️ 严格约束：
•	**绝对禁止添加简历中未出现过的项目经历、证书或成果。**
•	**不得将"建议补充项"直接虚构为已有内容。
•	单项技能（如Azure）可在已有技能体系下适度提炼强化，但禁止凭空新增技能或无依据堆叠技能。
•	所有改写必须基于原始内容及匹配分析中明确指出的真实字段，不得虚构、夸大、捏造经历。**
•	**不得随意提升岗位级别或误导性描述**，例如将普通产品实习改写为AI产品实习。

⸻

🧩 匹配评分行为控制说明：

根据匹配分析评分 ${score.total}，遵循对应的改写策略：
•	90-100 分（A）：简历已高度匹配JD，**仅语言优化**，确保简洁明了、突出成果，禁止结构大改。
•	80-89 分（B+）：简历有较大优化空间，**重点强化与JD核心业务场景强相关的内容，进行大幅度语言优化，适度重排模块内顺序，突出关键经历。**
•	70-79 分（B）：简历与JD有一定匹配度，**重点挖掘高相关经历并强化表达，进行大幅度语言优化。**
•	<70 分（C）：简历与JD匹配度较低，**仅进行语言润色**，不做结构重组。

⸻

🎯 改写目标：

产出一份完整、符合STAR法则、内容重组与表达强化后的**优化版简历正文**，要求如下：

1. **内容重组
•	调整模块内的展示顺序**，将与JD最相关的经历/技能排在前面（**允许模块内部微调，但不做无依据的大幅时间调整**）。
•	优先强化与岗位JD强关联的实习与项目经历，弱化无关经历。
2. **经历挖掘与表达强化
•	遵循STAR法则**：描述需包含Situation（背景）、Task（任务）、Action（行动）、Result（成果）。
•	**量化成果**：采用"动词+对象+指标"结构，如"优化XX流程，提升XX效率，缩短XX时间"。
若原简历无具体数据，可以"XX%"、"XX倍"等占位，留待候选人后续补充。
•	**行业术语适度包装**：对照JD关键词，替换通俗表达为行业术语，但**禁止堆砌黑话。**
•	**禁止夸大**：所有改写必须基于原始简历内容，真实可信。
3. **结构规范**

严格按以下顺序组织简历：
1.	教育背景
2.	实习经历
3.	项目经历
4.	技能证书
5.	荣誉奖项

⸻

✅ 输出格式：
•	仅输出优化后的完整简历正文内容。
•	禁止输出任何说明、注释、JSON或其他格式信息。`

  const response = await fetch("https://chat.ecnu.edu.cn/open/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content: "你是一个专业的简历优化专家，擅长根据岗位要求和匹配分析结果优化简历内容。",
        },
        {
          role: "user",
          content: optimizationPrompt,
        },
      ],
      model: "ecnu-plus",
      temperature: 0.5,
      stream: false,
    }),
  })

  if (!response.ok) {
    throw new Error(`节点4 API请求失败: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || "简历优化失败"
}
