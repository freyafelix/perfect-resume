import { type NextRequest, NextResponse } from "next/server"

interface FeedbackData {
  type: string
  content: string
  userAgent?: string
  timestamp: string
}

export async function POST(request: NextRequest) {
  try {
    const { type, content } = await request.json()

    if (!type || !content) {
      return NextResponse.json({ error: "反馈类型和内容不能为空" }, { status: 400 })
    }

    // 获取用户信息
    const userAgent = request.headers.get("user-agent") || "未知"
    const userIP = request.headers.get("x-forwarded-for") || 
                   request.headers.get("x-real-ip") || 
                   "未知IP"
    
    const feedbackData: FeedbackData = {
      type,
      content,
      userAgent,
      timestamp: new Date().toISOString()
    }

    // 提交到飞书多维表格
    const feishuResult = await submitToFeishu(feedbackData, userIP)

    if (feishuResult.success) {
      return NextResponse.json({ 
        success: true, 
        message: "反馈提交成功，感谢您的宝贵意见！",
        recordId: feishuResult.recordId
      })
    } else {
      // 如果飞书提交失败，至少记录到控制台
      console.error("飞书提交失败，但反馈已记录:", feedbackData)
      return NextResponse.json({ 
        success: true, 
        message: "反馈已收到，我们会认真处理！" 
      })
    }

  } catch (error) {
    console.error("反馈处理错误:", error)
    return NextResponse.json(
      { error: "提交失败，请稍后重试" },
      { status: 500 }
    )
  }
}

// 提交数据到飞书多维表格
async function submitToFeishu(feedbackData: FeedbackData, userIP: string) {
  try {
    // 飞书应用配置（需要在环境变量中设置）
    const appId = process.env.FEISHU_APP_ID
    const appSecret = process.env.FEISHU_APP_SECRET
    const appToken = "ZX1xbviRqabJCdsHN2ocHrkrnVh" // 从您的链接中提取
    const tableId = "tblfHefxSbPKM7bk" // 您的实际表格ID

    if (!appId || !appSecret) {
      console.warn("飞书配置未设置，跳过飞书提交")
      return { success: false, error: "配置未设置" }
    }

    // 1. 获取访问令牌
    const tokenResponse = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: appId,
        app_secret: appSecret,
      }),
    })

    const tokenData = await tokenResponse.json()
    if (tokenData.code !== 0) {
      throw new Error(`获取访问令牌失败: ${tokenData.msg}`)
    }

    const accessToken = tokenData.tenant_access_token

    // 2. 映射反馈类型
    const typeMapping: { [key: string]: string } = {
      "bug": "功能异常",
      "suggestion": "功能建议", 
      "compliment": "表扬赞美",
      "other": "其他"
    }

    // 3. 准备记录数据（包含用户标识字段）
    const recordData = {
      fields: {
        "反馈类型": typeMapping[feedbackData.type] || "其他",
        "反馈内容": feedbackData.content,
        "用户标识": userIP
        // 提交时间：由表格自动填写，不需要手动设置
        // 反馈ID：自动编号，不需要手动设置
      }
    }

    // 4. 提交到多维表格
    const submitResponse = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(recordData),
      }
    )

    const submitData = await submitResponse.json()
    
    if (submitData.code === 0) {
      return { 
        success: true, 
        recordId: submitData.data?.record?.record_id 
      }
    } else {
      throw new Error(`提交记录失败: ${submitData.msg}`)
    }

  } catch (error) {
    console.error("飞书提交错误:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "未知错误" 
    }
  }
} 