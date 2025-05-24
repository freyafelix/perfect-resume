// 飞书多维表格API测试脚本
// 使用方法: node test-feishu.js

const testFeishuAPI = async () => {
  // 请在此处填入您的配置
  const config = {
    appId: "cli_a8bbcfceba98501c",
    appSecret: "9DlK6ErYHL4KyWSm1atviekddn43oXN8", 
    appToken: "ZX1xbviRqabJCdsHN2ocHrkrnVh", // 从URL中提取的
    tableId: "tblfHefxSbPKM7bk"  // 您的实际表格ID
  }

  try {
    console.log("🚀 开始测试飞书API配置...")

    // 1. 获取访问令牌
    console.log("1️⃣ 获取访问令牌...")
    const tokenResponse = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: config.appId,
        app_secret: config.appSecret,
      }),
    })

    const tokenData = await tokenResponse.json()
    if (tokenData.code !== 0) {
      throw new Error(`获取访问令牌失败: ${tokenData.msg}`)
    }

    console.log("✅ 访问令牌获取成功")
    const accessToken = tokenData.tenant_access_token

    // 2. 获取表格信息
    console.log("2️⃣ 获取表格信息...")
    const tablesResponse = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.appToken}/tables`,
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      }
    )

    const tablesData = await tablesResponse.json()
    if (tablesData.code === 0) {
      console.log("✅ 表格信息获取成功")
      console.log("📋 可用的表格列表:")
      tablesData.data.items.forEach((table, index) => {
        console.log(`   ${index + 1}. ${table.name} (ID: ${table.table_id})`)
      })
    } else {
      throw new Error(`获取表格信息失败: ${tablesData.msg}`)
    }

    // 3. 测试提交数据（如果提供了table_id）
    if (config.tableId !== "您的表格ID") {
      console.log("3️⃣ 测试数据提交...")
      const testRecord = {
        fields: {
          "反馈类型": "其他",
          "反馈内容": "这是一条测试数据",
          "用户标识": "测试用户IP"
          // 提交时间和反馈ID由表格自动生成
        }
      }

      const submitResponse = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/records`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(testRecord),
        }
      )

      const submitData = await submitResponse.json()
      if (submitData.code === 0) {
        console.log("✅ 测试数据提交成功！")
        console.log(`📝 记录ID: ${submitData.data.record.record_id}`)
      } else {
        console.log("❌ 测试数据提交失败:")
        console.log(`   错误: ${submitData.msg}`)
        console.log("💡 可能的原因:")
        console.log("   - 表格ID不正确")
        console.log("   - 字段名称不匹配")
        console.log("   - 权限不足")
      }
    } else {
      console.log("⚠️ 跳过数据提交测试（请先配置正确的表格ID）")
    }

    console.log("\n🎉 测试完成！如果上述步骤都成功，您的配置就没问题了。")

  } catch (error) {
    console.error("❌ 测试失败:", error.message)
    console.log("\n🔧 请检查以下配置:")
    console.log("1. App ID 和 App Secret 是否正确")
    console.log("2. 应用权限是否包含多维表格相关权限")
    console.log("3. 网络连接是否正常")
  }
}

// 运行测试
testFeishuAPI() 