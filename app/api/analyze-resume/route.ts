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

    // 创建流式响应
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 发送开始信号
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: "progress",
            step: 1,
            total: 4,
            message: "开始分析简历信息..."
          })}\n\n`))

          // 节点1：简历原始信息提取
          const node1Result = await extractResumeInfo(resumeText, additionalExperience, apiKey)
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: "progress",
            step: 2,
            total: 4,
            message: "正在分析岗位要求..."
          })}\n\n`))

          // 节点2：JD分析
          const node2Result = await analyzeJobDescription(jobDescription, apiKey)
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: "progress",
            step: 3,
            total: 4,
            message: "正在进行匹配分析..."
          })}\n\n`))

          // 节点3：匹配分析
          const node3Result = await performMatchingAnalysis(node1Result, node2Result, jobDescription, apiKey)
          
          // 发送匹配分析结果
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: "partial_result",
            data: {
              matchScore: node3Result.matchScore,
              matchLevel: node3Result.matchLevel,
              coreSkillsMatch: node3Result.coreSkillsMatch,
              summary: node3Result.summary,
              detailedScore: node3Result.detailedScore
            }
          })}\n\n`))

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: "progress",
            step: 4,
            total: 4,
            message: "正在生成优化后的简历..."
          })}\n\n`))

          // 节点4：简历优化
          const node4Result = await generateOptimizedResume(
            node1Result, 
            node2Result, 
            node3Result, 
            jobDescription, 
            apiKey
          )

          // 发送最终结果
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: "final_result",
            data: {
              matchScore: node3Result.matchScore,
              matchLevel: node3Result.matchLevel,
              coreSkillsMatch: node3Result.coreSkillsMatch,
              summary: node3Result.summary,
              optimizedResume: node4Result,
              detailedScore: node3Result.detailedScore,
              rawResumeExtraction: node1Result,
              jobAnalysis: node2Result
            }
          })}\n\n`))

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: "complete"
          })}\n\n`))

          controller.close()
        } catch (error) {
          console.error("流式分析错误:", error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: "error",
            error: "分析过程中出现错误",
            details: error instanceof Error ? error.message : "未知错误"
          })}\n\n`))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
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
  const extractionPrompt = `提取简历信息，按结构分类：
1.个人信息：姓名、联系方式、教育背景、期望岗位
2.工作经历：时间、公司、职位、主要成果（保留数字）
3.技能：编程语言、工具、证书、语言能力
4.其他：奖项、项目、自评

简历内容：${resumeText || "未提供"}
${additionalExperience ? `补充：${additionalExperience}` : ""}`

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
  const analysisPrompt = `你的目标是为后续匹配简历做好结构化分析，尤其要识别最重要的1-3项核心能力。

输出内容如下：
1.岗位概况：行业/职级/定位
2.关键要求（优先针对此岗位行业识别1-3项核心能力）：
  - 核心能力（权重%）+ 理由
  - 其他基本要求：学历、经验、语言等
3.加分项：次要技能
4.工作信息：工作地点、时间制度、是否远程等
5.可替代经验：JD中未明示但合理的经验替代路径

请重点关注核心能力。`

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
  const matchingPrompt = `匹配分析：
岗位：${jobDescription}
简历：${resumeExtraction}

评估维度：
1.核心能力匹配(50%权重)：从JD中识别并选择最重要的1-3个核心技能/能力进行逐项打分0-100%
2.替代经验价值(30%权重)：相似经验评估
3.其他要素匹配(20%权重)：学历/地点等

重要提醒：
- abilities数组严格限制为1-3个最核心的能力（与JD分析保持一致）
- 优先选择JD中权重最高、最关键的技能
- 不要列出次要或辅助技能
- 只分析真正的核心竞争力，不是补充能力

匹配度建议规则：
- 如果匹配度 ≥ 80%，输出状态为"高度匹配"，改进建议为"无需修改，已充分匹配"
- 如果匹配度在 60-79%，输出状态为"中度匹配"，必须提供具体的改进建议
- 如果匹配度 < 60%，输出状态为"低匹配"，必须指出缺失内容和具体建议

输出JSON格式：
{
  "totalScore": 数字,
  "abilities": [
    {
      "ability":"第1个核心能力",
      "match":百分比数字,
      "status":"高度匹配/中度匹配/低匹配",
      "alternative":"替代经验描述（如有）",
      "improvement":"具体改进建议（根据匹配度规则生成）"
    },
    {
      "ability":"第2个核心能力",
      "match":百分比数字,
      "status":"高度匹配/中度匹配/低匹配",
      "alternative":"替代经验描述（如有）",
      "improvement":"具体改进建议（根据匹配度规则生成）"
    }
  ],
  "detailedScore": {
    "core_capabilities": 核心能力得分(0-50),
    "alternative_experiences": 替代经验得分(0-30), 
    "other_factors": 其他要素得分(0-20)
  },
  "summary": "总结建议"
}`

  // 根据分数计算等级的函数
  const calculateLevel = (totalScore: number, detailedScore: any) => {
    const coreCapabilities = detailedScore?.core_capabilities || 0
    const alternativeExperiences = detailedScore?.alternative_experiences || 0
    const otherFactors = detailedScore?.other_factors || 0
    
    // 直接使用AI返回的各维度分数计算总分
    // 核心能力匹配(50%权重)：0-50分
    // 替代经验价值(30%权重)：0-30分  
    // 其他要素匹配(20%权重)：0-20分
    const calculatedTotalScore = coreCapabilities + alternativeExperiences + otherFactors
    
    // 根据总分判断等级
    if (calculatedTotalScore >= 90) {
      return "A级 (90-100分) 高度匹配"
    } else if (calculatedTotalScore >= 80) {
      return "B+级 (80-89分) 较好匹配"
    } else if (calculatedTotalScore >= 70) {
      return "B级 (70-79分) 基本匹配"
    } else {
      return "C级 (<70分) 匹配度低"
    }
  }

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
      
      // 使用计算函数确定等级
      const calculatedLevel = calculateLevel(
        parsedResult.totalScore || 0, 
        parsedResult.detailedScore
      )
      
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
        matchScore: parsedResult.totalScore || 0,
        matchLevel: calculatedLevel,
        coreSkillsMatch: formatAbilityAnalysis(parsedResult.abilities || []),
        summary: parsedResult.summary || "分析完成，请查看详细内容",
        optimizedResume: parsedResult.abilities?.map((item: any) => item.improvement).join('\n') || "正在生成优化建议...",
        // 保留新格式的详细信息
        detailedScore: parsedResult.detailedScore || {
          core_capabilities: 0,
          alternative_experiences: 0, 
          other_factors: 0
        },
        abilityAnalysis: parsedResult.abilities
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
    level: matchingResult.matchLevel || "未评级"
  }

  const optimizationPrompt = `基于匹配分析优化简历，严格基于原简历内容进行优化：
原简历：${resumeExtraction}
匹配结果：${summary}
目标岗位：${jobDescription}

优化原则：
1.仅基于原简历已有信息进行优化，绝不编造或添加虚假内容
2.重新组织和表述现有经历，突出与目标岗位的匹配度
3.量化已有成果数据，调整表述贴合JD用词
4.优化简历结构和排版，提升可读性
5.简历结构：
   - 个人信息（基于原简历信息）
   - 求职意向（基于原简历或推断）
   - 工作经历（重新表述现有经历，突出相关性）
   - 项目经历（基于原简历项目，选择最相关的）
   - 技能优势（基于原简历技能，重新组织）

内容要求：
- 严格基于原简历内容，不添加任何虚假信息
- 重新表述和组织现有信息，使其更符合目标岗位要求
- 每段经历用简洁要点描述，突出关键成果
- 如果原简历缺少某些信息，标注"待补充"而不是编造

输出格式使用以下标记：
- [OPT]优化内容[/OPT] - 标记优化修改的内容
- [REORG]重新组织[/REORG] - 标记重新组织的内容
- 不变内容直接输出
- 避免使用[ADD]标记，因为不应添加原简历没有的内容

示例：
## 工作经历
• [OPT]产品经理 | XX公司 | 2022.01-至今[/OPT]
• [REORG]负责电商平台产品规划与用户体验优化，通过数据分析和用户调研驱动产品迭代[/REORG]

直接输出优化后的完整简历正文，使用上述标记格式。`

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
