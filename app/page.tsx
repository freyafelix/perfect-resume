"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { getParsingProgress, validateFile, parseResumeFile } from "../lib/file-parser"

interface AnalysisResult {
  matchScore: number
  matchLevel: string
  coreSkillsMatch: string
  summary: string
  optimizedResume: string
}

interface JobInsight {
  type: string
  content: string
}

// 解析优化后简历的差异标记
const parseOptimizedResume = (content: string) => {
  if (!content) return ""
  
  return content
    .replace(/\[ADD\](.*?)\[\/ADD\]/g, '<span class="resume-added">$1</span>')
    .replace(/\[DEL\](.*?)\[\/DEL\]/g, '<span class="resume-deleted">$1</span>')
    .replace(/\[OPT\](.*?)\[\/OPT\]/g, '<span class="resume-optimized">$1</span>')
    .replace(/^## (.*$)/gm, '<h2 style="color: var(--main-color); font-weight: bold; margin: 16px 0 8px 0; border-bottom: 2px solid #e0e0e0; padding-bottom: 4px;">$1</h2>')
    .replace(/^### (.*$)/gm, '<h3 style="color: var(--main-color); font-weight: bold; margin: 12px 0 6px 0;">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--main-color); font-weight: bold;">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // 优化：使用更紧凑的div布局，减少行间距
    .replace(/^[•-]\s*(.*$)/gm, '<div style="margin: 1px 0; padding-left: 16px; line-height: 1.4;">• $1</div>')
    // 处理普通行，去掉多余换行
    .replace(/\n\n+/g, '\n')
    .replace(/\n/g, '<br style="line-height: 1.2;">')
}

// 解析优化后简历的差异标记（保持颜色，用于对比视图）
const parseOptimizedResumeForComparison = (content: string) => {
  if (!content) return ""
  
  return content
    .replace(/\[ADD\](.*?)\[\/ADD\]/g, '<span style="background-color: #e8f5e8; color: #2e7d32; padding: 2px 4px; border-radius: 3px;">$1</span>')
    .replace(/\[DEL\](.*?)\[\/DEL\]/g, '<span style="background-color: #ffebee; color: #c62828; text-decoration: line-through; padding: 2px 4px; border-radius: 3px;">$1</span>')
    .replace(/\[OPT\](.*?)\[\/OPT\]/g, '<span style="background-color: #fff3e0; color: #ef6c00; padding: 2px 4px; border-radius: 3px;">$1</span>')
    .replace(/^## (.*$)/gm, '<h2 style="color: #1976d2; font-weight: bold; margin: 12px 0 6px 0; border-bottom: 2px solid #e0e0e0; padding-bottom: 4px;">$1</h2>')
    .replace(/^### (.*$)/gm, '<h3 style="color: #1976d2; font-weight: bold; margin: 8px 0 4px 0;">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1976d2; font-weight: bold;">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^[•-]\s*(.*$)/gm, '<div style="margin: 1px 0; padding-left: 16px; line-height: 1.4;">• $1</div>')
    .replace(/\n\n+/g, '\n')
    .replace(/\n/g, '<br style="line-height: 1.2;">')
}

// 简化的原简历格式化（仅用于下载功能）
const formatOriginalResume = (content: string) => {
  if (!content) return "未上传简历文件或文件解析失败"
  
  // 移除OCR标记和文件信息
  let cleaned = content
    .replace(/^=== .*简历内容 ===\s*/gm, '')
    .replace(/^=== .*识别内容 ===\s*/gm, '')
    .replace(/^文件名:.*$/gm, '')
    .replace(/^=== .*内容 ===\s*/gm, '')
    .replace(/^\s*文件名:\s*.*\.(pdf|docx?|txt|jpe?g|png)\s*$/gmi, '')
    .trim()
  
  return cleaned
}



// 将格式化后的原简历转换为HTML结构（与优化简历保持一致）
const formatOriginalResumeToHTML = (content: string) => {
  const formatted = formatOriginalResume(content)
  if (!formatted) return ""
  
  return formatted
    // 转换标题
    .replace(/^## (.*$)/gm, '<h2 style="color: #1976d2; font-weight: bold; margin: 12px 0 6px 0; border-bottom: 2px solid #e0e0e0; padding-bottom: 4px;">$1</h2>')
    .replace(/^### (.*$)/gm, '<h3 style="color: #1976d2; font-weight: bold; margin: 8px 0 4px 0;">$1</h3>')
    // 转换加粗文本
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1976d2; font-weight: bold;">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // 转换列表项
    .replace(/^[•-]\s*(.*$)/gm, '<div style="margin: 1px 0; padding-left: 16px; line-height: 1.4;">• $1</div>')
    // 处理换行
    .replace(/\n\n+/g, '\n')
    .replace(/\n/g, '<br style="line-height: 1.2;">')
}

export default function ResumeGenerator() {
  // 状态管理
  const [file, setFile] = useState<File | null>(null)
  const [originalContent, setOriginalContent] = useState<string>("")
  const [parsedContent, setParsedContent] = useState<string>("") // 用于AI分析的解析内容
  const [optimizedResume, setOptimizedResume] = useState<string>("")
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showComparison, setShowComparison] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [jobDescription, setJobDescription] = useState<string>("")
  const [insights, setInsights] = useState<string>("")
  const [isAnalyzingJob, setIsAnalyzingJob] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [jobInsights, setJobInsights] = useState<Record<string, JobInsight>>({})
  const [activeTab, setActiveTab] = useState("explanation")
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false)
  const [isParsingFile, setIsParsingFile] = useState(false)
  const [parsingProgress, setParsingProgress] = useState("")
  const [showFeedback, setShowFeedback] = useState(false)
  // 新增流式分析相关状态
  const [analysisProgress, setAnalysisProgress] = useState({ step: 0, total: 4, message: "" })
  const [partialResult, setPartialResult] = useState<Partial<AnalysisResult> | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  // 反馈表单相关状态
  const [feedbackType, setFeedbackType] = useState("")
  const [feedbackContent, setFeedbackContent] = useState("")
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  // 新增：对比功能相关状态
  const [copySuccess, setCopySuccess] = useState(false)
  
  // 新增：用于管理请求取消的 AbortController
  const [currentAnalysisController, setCurrentAnalysisController] = useState<AbortController | null>(null)

  // 一键复制功能
  const handleCopyResume = async () => {
    if (!analysisResult?.optimizedResume) return
    
    try {
      // 移除HTML标记，获取纯文本
      const plainText = analysisResult.optimizedResume
        .replace(/\[ADD\](.*?)\[\/ADD\]/g, '$1')
        .replace(/\[DEL\](.*?)\[\/DEL\]/g, '')
        .replace(/\[OPT\](.*?)\[\/OPT\]/g, '$1')
        .replace(/^## (.*$)/gm, '$1')
        .replace(/^### (.*$)/gm, '$1')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/^[•-]\s*(.*$)/gm, '• $1')
        .replace(/<br>/g, '\n')
        .replace(/<[^>]*>/g, '') // 移除所有HTML标签
        .trim()
      
      await navigator.clipboard.writeText(plainText)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('复制失败:', error)
      alert('复制失败，请手动选择文本复制')
    }
  }

  // 获取原简历的纯文本内容
  const getOriginalResumeText = () => {
    if (originalContent) {
      // 对于图片OCR结果，进行基本清理
      if (file?.type.startsWith('image/')) {
        return originalContent
          .replace(/^=== .*识别内容 ===\s*/gm, '')
          .replace(/^文件名:.*$/gm, '')
          .trim()
      }
      
      // 对于其他文件类型，直接返回原始内容
      return originalContent
    }
    return "未上传简历文件或文件解析失败"
  }

  // 将原简历内容转换为HTML显示格式（简化版）
  const formatOriginalResumeToHTML = (content: string) => {
    if (!content) return "<p>未上传简历文件或文件解析失败</p>"
    
    // 对于图片OCR结果，进行基本清理
    let cleanContent = content
    if (file?.type.startsWith('image/')) {
      cleanContent = content
        .replace(/^=== .*识别内容 ===\s*/gm, '')
        .replace(/^文件名:.*$/gm, '')
        .trim()
    }
    
    // 简单的文本到HTML转换，保持原始格式
    return cleanContent
      .split('\n')
      .map(line => {
        const trimmedLine = line.trim()
        if (!trimmedLine) return '<br/>'
        
        // 简单的格式化：加粗可能的标题
        if (trimmedLine.match(/^(个人信息|工作经历|项目经历|教育背景|专业技能|自我评价|求职意向)/) ||
            trimmedLine.match(/^\d{4}.*[-~至到].*\d{4}/) ||
            trimmedLine.match(/^[\u4e00-\u9fa5]{2,4}$/)) {
          return `<p style="font-weight: bold; margin: 8px 0 4px 0;">${trimmedLine}</p>`
        }
        
        return `<p style="margin: 2px 0;">${trimmedLine}</p>`
      })
      .join('')
  }

  // 获取优化后简历的HTML内容（保持颜色标注）
  const getOptimizedResumeHTML = () => {
    if (!analysisResult?.optimizedResume) return ""
    
    return parseOptimizedResumeForComparison(analysisResult.optimizedResume)
  }

  // 获取优化后简历的纯文本内容
  const getOptimizedResumeText = () => {
    if (!analysisResult?.optimizedResume) return ""
    
    return analysisResult.optimizedResume
      .replace(/\[ADD\](.*?)\[\/ADD\]/g, '$1')
      .replace(/\[DEL\](.*?)\[\/DEL\]/g, '')
      .replace(/\[OPT\](.*?)\[\/OPT\]/g, '$1')
      .replace(/^## (.*$)/gm, '$1')
      .replace(/^### (.*$)/gm, '$1')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/^[•-]\s*(.*$)/gm, '• $1')
      .replace(/<br>/g, '\n')
      .replace(/<[^>]*>/g, '')
      .trim()
  }

  // 取消当前分析的函数
  const cancelCurrentAnalysis = () => {
    if (currentAnalysisController) {
      currentAnalysisController.abort()
      setCurrentAnalysisController(null)
      setIsAnalyzing(false)
      setIsOptimizing(false)
      setAnalysisProgress({ step: 0, total: 4, message: "" })
      setPartialResult(null)
    }
  }

  // 删除简历文件的函数
  const handleDeleteResume = () => {
    if (isAnalyzing) {
      const shouldContinue = confirm(
        "删除简历文件将取消当前分析。是否继续？"
      )
      if (!shouldContinue) {
        return
      }
      // 取消当前分析
      cancelCurrentAnalysis()
    }

    const shouldDelete = confirm(
      `确定要删除简历文件"${file?.name}"吗？`
    )
    if (shouldDelete) {
      setFile(null)
      setOriginalContent("")
      setParsedContent("")
      // 保留分析结果，直到下次分析时再清空
      // setAnalysisResult(null)
      // setPartialResult(null)
      // 清空文件输入框
      const fileInput = document.getElementById("file-input") as HTMLInputElement
      if (fileInput) {
        fileInput.value = ""
      }
    }
  }

  // 文件上传处理
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    try {
      setIsParsingFile(true)
      
      // 检查是否已有简历文件
      if (file) {
        const shouldReplace = confirm(
          `已有简历文件"${file.name}"，是否替换为新文件"${selectedFile.name}"？`
        )
        if (!shouldReplace) {
          setIsParsingFile(false)
          event.target.value = "" // 清空文件选择
          return
        }
      }
      
      // 对于图片和文档文件，需要解析内容用于AI分析
      if (selectedFile.type.startsWith('image/') || 
          selectedFile.type.includes('pdf') || 
          selectedFile.type.includes('word') || 
          selectedFile.type.includes('document')) {
        
        const parsedText = await parseResumeFile(selectedFile)
        setParsedContent(parsedText) // 用于AI分析
        
        // 对于图片，显示解析后的内容（因为原始内容是二进制）
        if (selectedFile.type.startsWith('image/')) {
          setOriginalContent(parsedText)
        } else {
          // 对于PDF和Word，尝试获取原始文本内容用于显示
          try {
            const originalText = await selectedFile.text()
            setOriginalContent(originalText)
          } catch {
            // 如果无法获取原始文本，使用解析后的内容
            setOriginalContent(parsedText)
          }
        }
      } else {
        // 对于纯文本文件，直接读取内容
        const textContent = await selectedFile.text()
        setOriginalContent(textContent)
        setParsedContent(textContent)
      }
      
      setFile(selectedFile)
      // 保留分析结果，不在上传时清空
      
    } catch (error) {
      console.error('文件上传失败:', error)
      alert(`文件上传失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsParsingFile(false)
    }
  }

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      alert("请输入岗位描述")
      return
    }

    // 如果已有正在进行的分析，先取消
    if (currentAnalysisController) {
      cancelCurrentAnalysis()
    }

    // 创建新的 AbortController
    const controller = new AbortController()
    setCurrentAnalysisController(controller)

    setIsAnalyzing(true)
    // 清空之前的分析结果
    setPartialResult(null)
    setAnalysisResult(null)
    setOptimizedResume("")
    setShowComparison(false)
    setIsOptimizing(false)
    setAnalysisProgress({ step: 0, total: 4, message: "准备开始分析..." })

    try {
      const resumeText = parsedContent || (file ? `已上传简历文件: ${file.name}` : "")

      const response = await fetch("/api/analyze-resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeText,
          jobDescription,
          additionalExperience: insights,
        }),
        signal: controller.signal // 添加取消信号
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("无法获取响应流")
      }

      let buffer = ""

      while (true) {
        // 检查是否被取消
        if (controller.signal.aborted) {
          reader.cancel()
          throw new Error("分析已被取消")
        }

        const { done, value } = await reader.read()
        
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              switch (data.type) {
                case "progress":
                  setAnalysisProgress({
                    step: data.step,
                    total: data.total,
                    message: data.message
                  })
                  if (data.step === 4) {
                    setIsOptimizing(true)
                  }
                  break
                
                case "partial_result":
                  setPartialResult(data.data)
                  setTimeout(() => {
                    if (typeof document !== 'undefined') {
                      document.getElementById("result-section")?.scrollIntoView({ behavior: "smooth" })
                    }
                  }, 100)
                  break
                
                case "final_result":
                  setAnalysisResult(data.data)
                  setIsOptimizing(false)
                  break
                
                case "complete":
                  setAnalysisProgress({ step: 4, total: 4, message: "分析完成！" })
                  break
                
                case "error":
                  throw new Error(data.error)
              }
            } catch (parseError) {
              console.error("解析流数据错误:", parseError)
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log("分析已被用户取消")
        return // 不显示错误提示，因为是用户主动取消
      }
      console.error("分析错误:", error)
      alert("分析过程中出现错误，请稍后重试")
      setPartialResult(null)
      setAnalysisResult(null)
    } finally {
      setIsAnalyzing(false)
      setIsOptimizing(false)
      setCurrentAnalysisController(null)
    }
  }

  // 生成单个洞察模块
  const generateSingleInsight = async (insightType: string) => {
    try {
      const response = await fetch("/api/job-insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobDescription,
          insightType,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setJobInsights((prev) => ({
          ...prev,
          [insightType]: result.data,
        }))
        return true
      } else {
        console.error(`${insightType} 洞察生成失败:`, result.error)
        return false
      }
    } catch (error) {
      console.error(`${insightType} 洞察生成错误:`, error)
      return false
    }
  }

  // 生成所有洞察模块
  const handleGenerateAllInsights = async () => {
    if (!jobDescription.trim()) {
      alert("请先输入岗位描述")
      return
    }

    // 检查是否所有洞察都已生成
    const allInsightTypes = ["explanation", "simulation", "growth", "skills"]
    const missingInsights = allInsightTypes.filter(type => !jobInsights[type])
    
    if (missingInsights.length === 0) {
      // 所有洞察都已生成，直接跳转
      setTimeout(() => {
        if (typeof document !== 'undefined') {
          document.getElementById("insight-section")?.scrollIntoView({ behavior: "smooth" })
        }
      }, 100)
      return
    }

    setIsGeneratingInsight(true)
    try {
      // 并发生成所有缺失的洞察
      const promises = missingInsights.map(type => generateSingleInsight(type))
      await Promise.all(promises)
      
      // 跳转到洞察区域
      setTimeout(() => {
        if (typeof document !== 'undefined') {
          document.getElementById("insight-section")?.scrollIntoView({ behavior: "smooth" })
        }
      }, 100)
    } catch (error) {
      console.error("洞察生成错误:", error)
      alert("洞察生成过程中出现错误，请稍后重试")
    } finally {
      setIsGeneratingInsight(false)
    }
  }

  // 处理Tab点击
  const handleJobInsight = async (insightType: string) => {
    if (!jobDescription.trim()) {
      alert("请先输入岗位描述")
      return
    }

    // 如果该洞察已存在，直接切换Tab
    if (jobInsights[insightType]) {
      setActiveTab(insightType)
      return
    }

    // 如果不存在，生成该洞察
    setIsGeneratingInsight(true)
    const success = await generateSingleInsight(insightType)
    if (success) {
      setActiveTab(insightType)
    }
    setIsGeneratingInsight(false)
  }

  // 处理反馈提交
  const handleFeedbackSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!feedbackType || !feedbackContent.trim()) {
      alert("请选择反馈类型并填写反馈内容")
      return
    }

    setIsSubmittingFeedback(true)

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: feedbackType,
          content: feedbackContent,
        }),
      })

      const result = await response.json()

      if (result.success) {
        alert(result.message || "反馈提交成功！感谢您的宝贵意见。")
        setFeedbackType("")
        setFeedbackContent("")
        setShowFeedback(false)
      } else {
        alert(result.error || "提交失败，请稍后重试")
      }
    } catch (error) {
      console.error("反馈提交错误:", error)
      alert("提交失败，请检查网络连接后重试")
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  const tabs = [
    { id: "explanation", label: "通俗解释" },
    { id: "simulation", label: "一日模拟" },
    { id: "growth", label: "发展洞察" },
    { id: "skills", label: "技能地图" },
  ]

  return (
    <>
      <style jsx global>{`
        :root {
          --pixel-size: 4px;
          --main-color: #5d75e8;
          --secondary-color: #e87d5d;
          --insight-color: #e85d9e;
          --bg-color: #f0f0f0;
          --dark-bg: #c0c0c0;
          --pixel-border: #333333;
        }
        
        body {
          font-family: 'Courier New', monospace !important;
          background-color: var(--bg-color) !important;
          margin: 0 !important;
          padding: 16px !important;
          color: #333 !important;
          background-image: 
            linear-gradient(45deg, #e0e0e0 25%, transparent 25%),
            linear-gradient(-45deg, #e0e0e0 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #e0e0e0 75%),
            linear-gradient(-45deg, transparent 75%, #e0e0e0 75%) !important;
          background-size: 20px 20px !important;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px !important;
          scroll-behavior: smooth !important;
        }
        
        .pixel-container {
          max-width: 800px;
          margin: 0 auto;
          padding: var(--pixel-size);
          background-color: white;
          border: var(--pixel-size) solid var(--pixel-border);
          box-shadow: 
            var(--pixel-size) var(--pixel-size) 0 0 rgba(0,0,0,0.2),
            calc(var(--pixel-size) * 2) calc(var(--pixel-size) * 2) 0 0 rgba(0,0,0,0.1);
          image-rendering: pixelated;
          position: relative;
        }
        
        .pixel-header {
          text-align: center;
          padding: 20px;
          font-size: 24px;
          font-weight: bold;
          color: var(--main-color);
          text-shadow: 2px 2px 0 #a0a0a0;
          border-bottom: var(--pixel-size) solid var(--pixel-border);
          margin-bottom: 20px;
          background-color: #f9f9f9;
        }
        
        .pixel-header h1 {
          margin: 0;
          font-size: 32px;
        }
        
        .pixel-subtitle {
          font-size: 16px;
          color: var(--main-color);
          opacity: 0.7;
          margin-top: 8px;
          font-weight: normal;
        }
        
        .pixel-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        
        @media (min-width: 768px) {
          .pixel-grid {
            grid-template-columns: 1fr 1fr 1fr;
          }
        }
        
        .pixel-box {
          border: var(--pixel-size) solid var(--pixel-border);
          padding: 12px;
          background-color: var(--dark-bg);
          position: relative;
        }
        
        .pixel-box-title {
          font-size: 14px;
          margin-bottom: 10px;
          color: #333;
          font-weight: bold;
        }
        
        .pixel-upload-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 150px;
          background-color: white;
          border: 2px dashed #999;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .pixel-upload-box:hover {
          border-color: var(--main-color);
          background-color: #f5f7ff;
        }
        
        .pixel-character {
          font-size: 30px;
          display: inline-block;
          image-rendering: pixelated;
          margin-right: 10px;
        }
        
        .pixel-icon {
          font-size: 40px;
          margin-bottom: 10px;
        }
        
        .pixel-button-row {
          display: flex;
          gap: 12px;
          margin-top: 20px;
          flex-wrap: wrap;
        }
        
        .pixel-button {
          background-color: var(--main-color);
          color: white;
          border: var(--pixel-size) solid var(--pixel-border);
          padding: 8px 16px;
          font-family: 'Courier New', monospace;
          font-weight: bold;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.1s;
          box-shadow: 
            var(--pixel-size) var(--pixel-size) 0 0 rgba(0,0,0,0.5);
        }
        
        .pixel-button:hover {
          transform: translate(-2px, -2px);
          box-shadow: 
            calc(var(--pixel-size) + 2px) calc(var(--pixel-size) + 2px) 0 0 rgba(0,0,0,0.5);
        }
        
        .pixel-button:active {
          transform: translate(2px, 2px);
          box-shadow: none;
        }
        
        .pixel-button.secondary {
          background-color: var(--secondary-color);
        }
        
        .pixel-button.insight {
          background-color: var(--insight-color);
        }
        
        .pixel-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .pixel-textarea {
          width: 100%;
          height: 150px;
          border: var(--pixel-size) solid var(--pixel-border);
          padding: 8px;
          font-family: 'Courier New', monospace;
          resize: none;
          background-color: white;
        }
        
        .pixel-hint {
          font-size: 12px;
          color: #666;
          margin-top: 8px;
        }
        
        .pixel-result {
          margin-top: 30px;
          border: var(--pixel-size) solid var(--pixel-border);
          background-color: white;
          padding: 16px;
          scroll-margin-top: 20px;
        }
        
        .pixel-result-title {
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 16px;
          color: var(--main-color);
          text-shadow: 2px 2px 0 #e0e0e0;
          border-bottom: 2px solid #e0e0e0;
          padding-bottom: 8px;
        }
        
        .pixel-score-item {
          padding: 12px;
          margin-bottom: 8px;
          background-color: #f9f9f9;
          border: 2px solid #e0e0e0;
        }
        
        .file-counter {
          font-size: 14px;
          margin-top: 8px;
          color: #666;
        }
        
        .progress-container {
          margin-top: 20px;
          padding: 16px;
          background-color: #f8f9fa;
          border: var(--pixel-size) solid var(--pixel-border);
        }
        
        .progress-bar {
          width: 100%;
          height: 20px;
          background-color: #e0e0e0;
          border: var(--pixel-size) solid var(--pixel-border);
          margin-bottom: 10px;
          position: relative;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--main-color), var(--secondary-color));
          transition: width 0.5s ease;
          position: relative;
        }
        
        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255,255,255,0.4) 50%,
            transparent 100%
          );
          animation: shimmer 2s infinite;
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .progress-text {
          font-size: 14px;
          color: var(--main-color);
          font-weight: bold;
          display: flex;
          align-items: center;
        }
        
        /* 优化后简历差异显示样式 */
        .resume-diff-content {
          color: #333 !important;
          line-height: 1.3;
          white-space: pre-wrap;
        }
        
        .resume-diff-content h2 {
          margin: 12px 0 6px 0 !important;
          line-height: 1.3 !important;
        }
        
        .resume-diff-content h3 {
          margin: 8px 0 4px 0 !important;
          line-height: 1.3 !important;
        }
        
        .resume-diff-content div {
          margin: 0 0 2px 0 !important;
          line-height: 1.3 !important;
        }
        
        .resume-diff-content br {
          line-height: 1.1 !important;
        }
        
        .resume-diff-content p {
          margin: 3px 0 !important;
          line-height: 1.3 !important;
        }
        
        .resume-added {
          background-color: #e8f5e8;
          color: #27ae60 !important;
          padding: 2px 4px;
          border-radius: 3px;
          font-weight: bold;
          border: 1px solid #27ae60;
        }
        
        .resume-deleted {
          background-color: #ffeaea;
          color: #e74c3c !important;
          padding: 2px 4px;
          border-radius: 3px;
          text-decoration: line-through;
          border: 1px solid #e74c3c;
        }
        
        .resume-optimized {
          background-color: #fff3cd;
          color: #ff8c00 !important;
          padding: 2px 4px;
          border-radius: 3px;
          font-weight: bold;
          border: 1px solid #ff8c00;
        }
        

        
        .jd-analysis {
          margin-top: 30px;
          border: var(--pixel-size) solid var(--pixel-border);
          background-color: #dcdcdc;
          padding: 16px;
          scroll-margin-top: 20px;
        }
        
        .jd-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        
        .jd-tab {
          padding: 10px 20px;
          background-color: #f0f0f0;
          border: var(--pixel-size) solid var(--pixel-border);
          font-weight: bold;
          cursor: pointer;
          min-width: 100px;
          text-align: center;
        }
        
        .jd-tab.active {
          background-color: white;
          border-bottom-color: white;
          position: relative;
          z-index: 2;
        }
        
        .jd-content {
          background-color: white;
          border: var(--pixel-size) solid var(--pixel-border);
          padding: 16px;
          min-height: 300px;
        }
        
        .optimized-resume {
          margin-top: 30px;
          border: var(--pixel-size) solid var(--pixel-border);
          background-color: white;
          padding: 16px;
        }
        
        /* 右侧导航栏样式 */
        .side-nav {
          position: fixed;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 100;
        }
        
        .side-nav-item {
          background-color: var(--main-color);
          color: white;
          border: var(--pixel-size) solid var(--pixel-border);
          width: 50px;
          height: 50px;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 
            var(--pixel-size) var(--pixel-size) 0 0 rgba(0,0,0,0.5);
          position: relative;
        }
        
        .side-nav-item:hover {
          transform: translateX(-5px);
          box-shadow: 
            calc(var(--pixel-size) + 5px) var(--pixel-size) 0 0 rgba(0,0,0,0.5);
        }
        
        .side-nav-tooltip {
          position: absolute;
          right: 60px;
          background-color: #333;
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 14px;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s;
          white-space: nowrap;
        }
        
        .side-nav-item:hover .side-nav-tooltip {
          opacity: 1;
          visibility: visible;
        }
        
        .side-nav-item.feedback {
          background-color: var(--secondary-color);
        }
        
        /* 反馈弹窗样式 */
        .feedback-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          z-index: 1000;
          display: flex;
          justify-content: center;
          align-items: center;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s;
        }
        
        .feedback-modal-overlay.active {
          opacity: 1;
          visibility: visible;
        }
        
        .feedback-modal {
          width: 90%;
          max-width: 500px;
          background-color: white;
          border: calc(var(--pixel-size) * 2) solid var(--pixel-border);
          box-shadow: 
            calc(var(--pixel-size) * 2) calc(var(--pixel-size) * 2) 0 0 rgba(0,0,0,0.5),
            calc(var(--pixel-size) * 4) calc(var(--pixel-size) * 4) 0 0 rgba(0,0,0,0.3);
          padding: 20px;
          position: relative;
          transform: scale(0.8);
          transition: transform 0.3s;
        }
        
        .feedback-modal-overlay.active .feedback-modal {
          transform: scale(1);
        }
        
        .feedback-modal-close {
          position: absolute;
          top: 10px;
          right: 10px;
          font-size: 24px;
          cursor: pointer;
          transition: all 0.2s;
          width: 40px;
          height: 40px;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: #f0f0f0;
          border: var(--pixel-size) solid var(--pixel-border);
        }
        
        .feedback-modal-close:hover {
          background-color: #e0e0e0;
          transform: scale(1.1);
        }
        
        .feedback-modal-title {
          font-size: 24px;
          font-weight: bold;
          color: var(--secondary-color);
          text-align: center;
          margin-bottom: 20px;
          border-bottom: var(--pixel-size) solid #e0e0e0;
          padding-bottom: 10px;
        }
        
        .feedback-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .feedback-item {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        
        .feedback-label {
          font-weight: bold;
          font-size: 16px;
        }
        
        .feedback-input {
          border: var(--pixel-size) solid var(--pixel-border);
          padding: 10px;
          font-family: 'Courier New', monospace;
          font-size: 14px;
        }
        
        .feedback-textarea {
          border: var(--pixel-size) solid var(--pixel-border);
          padding: 10px;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          min-height: 150px;
          resize: vertical;
        }
        
        .feedback-submit {
          background-color: var(--secondary-color);
          color: white;
          border: var(--pixel-size) solid var(--pixel-border);
          padding: 10px;
          font-family: 'Courier New', monospace;
          font-weight: bold;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.1s;
          box-shadow: 
            var(--pixel-size) var(--pixel-size) 0 0 rgba(0,0,0,0.5);
          margin-top: 10px;
          align-self: center;
          width: 50%;
        }
        
        .feedback-submit:hover {
          transform: translate(-2px, -2px);
          box-shadow: 
            calc(var(--pixel-size) + 2px) calc(var(--pixel-size) + 2px) 0 0 rgba(0,0,0,0.5);
        }
        
        .feedback-submit:active {
          transform: translate(2px, 2px);
          box-shadow: none;
        }
        
        /* Markdown 样式 */
        .markdown-content h1,
        .markdown-content h2,
        .markdown-content h3,
        .markdown-content h4,
        .markdown-content h5,
        .markdown-content h6 {
          color: var(--main-color);
          font-weight: bold;
          margin: 16px 0 8px 0;
          border-bottom: 2px solid #e0e0e0;
          padding-bottom: 4px;
        }
        
        .markdown-content h1 { font-size: 24px; }
        .markdown-content h2 { font-size: 20px; }
        .markdown-content h3 { font-size: 18px; }
        .markdown-content h4 { font-size: 16px; }
        
        .markdown-content p {
          margin: 6px 0;
          line-height: 1.5;
        }
        
        .markdown-content ul,
        .markdown-content ol {
          margin: 6px 0;
          padding-left: 20px;
        }
        
        .markdown-content li {
          margin: 2px 0;
          line-height: 1.4;
        }
        
        .markdown-content strong {
          font-weight: bold;
          color: var(--main-color);
        }
        
        .markdown-content em {
          font-style: italic;
        }
        
        .markdown-content code {
          background-color: #f5f5f5;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
        }
        
        .markdown-content blockquote {
          border-left: 4px solid var(--main-color);
          margin: 16px 0;
          padding: 8px 16px;
          background-color: #f9f9f9;
          font-style: italic;
        }

        /* 响应式调整 */
        @media (max-width: 900px) {
          .side-nav {
            right: 10px;
          }
          
          .side-nav-item {
            width: 40px;
            height: 40px;
            font-size: 20px;
          }
        }
        
        /* 对比功能样式 */
        .comparison-container {
          display: flex;
          gap: 20px;
          margin-top: 20px;
        }
        
        .comparison-panel {
          flex: 1;
          border: 2px solid var(--pixel-border);
          background-color: white;
          padding: 16px;
          max-height: 600px;
          overflow-y: auto;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .comparison-title {
          font-weight: bold;
          font-size: 16px;
          color: var(--main-color);
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e0e0e0;
          text-align: center;
          background-color: #f8f9fa;
          margin: -16px -16px 16px -16px;
          padding: 12px 16px 8px 16px;
        }
        
        .comparison-content {
          font-size: 14px;
          line-height: 1.4;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        
        .comparison-content h2 {
          color: #1976d2 !important;
          font-weight: bold !important;
          margin: 12px 0 6px 0 !important;
          border-bottom: 2px solid #e0e0e0 !important;
          padding-bottom: 4px !important;
        }
        
        .comparison-content h3 {
          color: #1976d2 !important;
          font-weight: bold !important;
          margin: 8px 0 4px 0 !important;
        }
        
        .comparison-content strong {
          color: #1976d2 !important;
          font-weight: bold !important;
        }
        
        .comparison-content div {
          margin: 0 0 2px 0 !important;
          line-height: 1.3 !important;
        }
        
        .comparison-content br {
          line-height: 1.1 !important;
        }
        
        /* 复制按钮样式 */
        .copy-button {
          background-color: var(--secondary-color);
          color: white;
          border: var(--pixel-size) solid var(--pixel-border);
          padding: 8px 16px;
          font-family: 'Courier New', monospace;
          font-weight: bold;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.1s;
          box-shadow: var(--pixel-size) var(--pixel-size) 0 0 rgba(0,0,0,0.5);
          margin-left: 10px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        
        .copy-button:hover {
          transform: translate(-2px, -2px);
          box-shadow: calc(var(--pixel-size) + 2px) calc(var(--pixel-size) + 2px) 0 0 rgba(0,0,0,0.5);
        }
        
        .copy-button:active {
          transform: translate(2px, 2px);
          box-shadow: none;
        }
        
        .copy-button.success {
          background-color: #4caf50;
          border-color: #4caf50;
        }
        
        .compare-button {
          background-color: #ff9800;
          color: white;
          border: var(--pixel-size) solid var(--pixel-border);
          padding: 8px 16px;
          font-family: 'Courier New', monospace;
          font-weight: bold;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.1s;
          box-shadow: var(--pixel-size) var(--pixel-size) 0 0 rgba(0,0,0,0.5);
          margin-left: 10px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        
        .compare-button:hover {
          transform: translate(-2px, -2px);
          box-shadow: calc(var(--pixel-size) + 2px) calc(var(--pixel-size) + 2px) 0 0 rgba(0,0,0,0.5);
        }
        
        .compare-button:active {
          transform: translate(2px, 2px);
          box-shadow: none;
        }
        
        @media (max-width: 600px) {
          .side-nav {
            bottom: 20px;
            top: auto;
            transform: none;
            flex-direction: row;
            width: auto;
            height: 50px;
            left: 50%;
            transform: translateX(-50%);
            gap: 10px;
          }
          
          .side-nav-item {
            width: 45px;
            height: 45px;
            font-size: 18px;
          }
          
          .side-nav-tooltip {
            bottom: 55px;
            right: auto;
            left: 50%;
            transform: translateX(-50%);
          }
          
          /* 对比功能响应式 */
          .comparison-container {
            flex-direction: column;
            gap: 15px;
          }
          
          .comparison-panel {
            max-height: 400px;
          }
          
          .copy-button, .compare-button {
            font-size: 12px;
            padding: 6px 12px;
            margin-left: 5px;
          }
          
          .pixel-result-title {
            flex-wrap: wrap;
            gap: 10px;
          }
        }

        /* 文件上传状态样式 */
        .file-upload-success {
          margin-top: 8px;
          padding: 12px;
          background-color: #e8f5e8;
          border: 2px solid #4caf50;
          border-radius: 6px;
          font-size: 12px;
        }
        
        .file-upload-processing {
          margin-top: 8px;
          padding: 8px;
          background-color: #fff3cd;
          border: 2px solid #ffc107;
          border-radius: 6px;
          font-size: 12px;
          display: flex;
          align-items: center;
        }
        
        .structured-preview-btn {
          background-color: #2196f3;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 6px 12px;
          font-size: 12px;
          cursor: pointer;
          margin-right: 8px;
          transition: all 0.2s;
        }
        
        .structured-preview-btn:hover {
          background-color: #1976d2;
          transform: translateY(-1px);
        }
        
        /* 对比模式提示框样式 */
        .comparison-info {
          margin-bottom: 16px;
          padding: 12px;
          background-color: #e3f2fd;
          border: 2px solid #2196f3;
          border-radius: 6px;
          font-size: 14px;
        }
        
        .comparison-info-title {
          font-weight: bold;
          margin-bottom: 8px;
          color: #1976d2;
        }
      `}</style>

      {/* 右侧导航栏 */}
      <div className="side-nav">
        <div
          className="side-nav-item"
          onClick={() => {
            if (typeof document !== 'undefined') {
              document.getElementById("result-section")?.scrollIntoView({ behavior: "smooth" })
            }
          }}
        >
          📊<span className="side-nav-tooltip">转写结果</span>
        </div>
        <div
          className="side-nav-item"
          onClick={() => {
            if (typeof document !== 'undefined') {
              document.getElementById("optimized-resume-section")?.scrollIntoView({ behavior: "smooth" })
            }
          }}
        >
          📝<span className="side-nav-tooltip">优化后简历</span>
        </div>
        <div
          className="side-nav-item"
          onClick={() => {
            if (typeof document !== 'undefined') {
              document.getElementById("insight-section")?.scrollIntoView({ behavior: "smooth" })
            }
          }}
        >
          🔍<span className="side-nav-tooltip">岗位洞察</span>
        </div>
        <div className="side-nav-item feedback" onClick={() => setShowFeedback(true)}>
          💬<span className="side-nav-tooltip">反馈意见</span>
        </div>
      </div>

      {/* 反馈弹窗 */}
      <div className={`feedback-modal-overlay ${showFeedback ? "active" : ""}`}>
        <div className="feedback-modal">
          <div className="feedback-modal-close" onClick={() => setShowFeedback(false)}>
            ✕
          </div>
          <div className="feedback-modal-title">
            <span className="pixel-character">💬</span> 反馈意见
          </div>
          <form className="feedback-form" onSubmit={handleFeedbackSubmit}>
            <div className="feedback-item">
              <label className="feedback-label">反馈类型</label>
              <select 
                className="feedback-input" 
                value={feedbackType}
                onChange={(e) => setFeedbackType(e.target.value)}
                required
              >
                <option value="">请选择反馈类型</option>
                <option value="bug">功能异常</option>
                <option value="suggestion">功能建议</option>
                <option value="compliment">表扬赞美</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div className="feedback-item">
              <label className="feedback-label">反馈内容</label>
              <textarea 
                className="feedback-textarea" 
                placeholder="请详细描述您的反馈内容..."
                value={feedbackContent}
                onChange={(e) => setFeedbackContent(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="feedback-submit"
              disabled={isSubmittingFeedback}
            >
              {isSubmittingFeedback ? (
                <>
                  <Loader2 size={16} className="inline animate-spin" style={{ marginRight: "8px" }} />
                  提交中...
                </>
              ) : (
                "提交反馈"
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="pixel-container">
        <div className="pixel-header">
          <h1>完美简历</h1>
          <div className="pixel-subtitle">基于岗位描述一键转写简历</div>
          <div className="pixel-character">📝</div>
        </div>

        <div className="pixel-grid">
          <div className="pixel-box">
            <div className="pixel-box-title">请上传简历（仅支持1份）</div>
            <div className="pixel-upload-box" onClick={() => {
              if (typeof document !== 'undefined') {
                document.getElementById("file-input")?.click()
              }
            }}>
              <div className="pixel-icon">📄</div>
              <div>点击或拖拽文件上传</div>
              <input
                id="file-input"
                type="file"
                accept=".pdf,.docx,.jpg,.jpeg,.png,.gif,.bmp,.txt"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
            </div>
            <div className="pixel-hint">支持的文件类型：PDF、Word文档(.docx)、图片(JPG/PNG/GIF/BMP)、文本文件</div>
            <div className="pixel-hint">文件大小：PDF/Word最大50MB，图片最大10MB</div>
            <div className="file-counter">文件数量：{file ? 1 : 0}/1</div>
            {isParsingFile && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "8px",
                  backgroundColor: "#fff3cd",
                  border: "2px solid #ffc107",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Loader2 size={16} className="animate-spin" style={{ marginRight: "8px" }} />
                {parsingProgress}
              </div>
            )}
            {file && !isParsingFile && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "8px",
                  backgroundColor: "#e8f5e8",
                  border: "2px solid #4caf50",
                  fontSize: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    已选择：{file.name}
                    {originalContent && <div style={{ marginTop: "4px", color: "#666" }}>✅ 文件内容已解析</div>}

                  </div>
                  <button
                    onClick={handleDeleteResume}
                    style={{
                      background: "#ff4757",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      padding: "4px 8px",
                      fontSize: "12px",
                      cursor: "pointer",
                      marginLeft: "8px"
                    }}
                    title="删除简历文件"
                  >
                    🗑️ 删除
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="pixel-box">
            <div className="pixel-box-title">
              请输入岗位描述 (JD) <span style={{ color: "red" }}>*</span>
            </div>
            <textarea
              className="pixel-textarea"
              placeholder="请输入内容"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>

          <div className="pixel-box">
            <div className="pixel-box-title">更多相关经历补充（如有）</div>
            <textarea
              className="pixel-textarea"
              placeholder="请输入内容"
              value={insights}
              onChange={(e) => setInsights(e.target.value)}
            />
          </div>
        </div>

        <div className="pixel-button-row">
          <button className="pixel-button" onClick={handleAnalyze} disabled={isAnalyzing}>
            <span className="pixel-character">🚀</span>
            {isAnalyzing ? (
              <>
                <Loader2 size={16} className="inline animate-spin" style={{ marginLeft: "8px" }} />
                分析中...
              </>
            ) : (
              "一键转写"
            )}
          </button>
          {isAnalyzing && (
            <button 
              className="pixel-button cancel" 
              onClick={cancelCurrentAnalysis}
              style={{
                backgroundColor: "#ff4757",
                borderColor: "#ff4757"
              }}
            >
              <span className="pixel-character">⏹️</span>
              取消分析
            </button>
          )}
          <button className="pixel-button secondary" onClick={() => setShowFeedback(true)}>
            <span className="pixel-character">💬</span> 反馈意见
          </button>
          <button
            className="pixel-button insight"
            onClick={handleGenerateAllInsights}
            disabled={isGeneratingInsight}
          >
            <span className="pixel-character">🔍</span>
            {isGeneratingInsight ? (
              <>
                <Loader2 size={16} className="inline animate-spin" style={{ marginLeft: "8px" }} />
                生成中...
              </>
            ) : (
              "岗位洞察"
            )}
          </button>
        </div>

        {/* 进度指示器 */}
        {isAnalyzing && (
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(analysisProgress.step / analysisProgress.total) * 100}%` }}
              />
            </div>
            <div className="progress-text">
              <span className="pixel-character">⚡</span>
              步骤 {analysisProgress.step}/{analysisProgress.total}: {analysisProgress.message}
            </div>
          </div>
        )}

        <div className="pixel-result" id="result-section">
          <div className="pixel-result-title">转写结果</div>

          <div className="pixel-score-item">
            <div>总匹配分数：{(analysisResult || partialResult)?.matchScore || ""}{(analysisResult || partialResult)?.matchScore ? "/100" : ""}</div>
          </div>

          <div className="pixel-score-item">
            <div>匹配等级：{(analysisResult || partialResult)?.matchLevel || ""}</div>
          </div>

          {/* 详细分数显示 */}
          {((analysisResult as any) || (partialResult as any))?.detailedScore && (
            <div className="pixel-score-item">
              <div style={{ fontWeight: "bold", marginBottom: "8px" }}>详细分数分解：</div>
              <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
                • 核心业务能力：{((analysisResult as any) || (partialResult as any)).detailedScore.core_capabilities || 0}/50分<br/>
                • 替代经验价值：{((analysisResult as any) || (partialResult as any)).detailedScore.alternative_experiences || 0}/30分<br/>
                • 其他匹配要素：{((analysisResult as any) || (partialResult as any)).detailedScore.other_factors || 0}/20分
              </div>
            </div>
          )}

          <div className="pixel-score-item">
            <div>核心能力匹配情况：</div>
            {(analysisResult || partialResult)?.coreSkillsMatch ? (
              <div style={{ marginTop: "8px" }} className="markdown-content">
                <ReactMarkdown>{(analysisResult || partialResult)!.coreSkillsMatch}</ReactMarkdown>
              </div>
            ) : (
              <div style={{ marginTop: "8px", color: "#666", fontStyle: "italic" }}>
                {isAnalyzing && analysisProgress.step < 3 ? "正在分析中..." : "暂无数据"}
              </div>
            )}
          </div>

          <div className="pixel-score-item">
            <div>总结：</div>
            {(analysisResult || partialResult)?.summary ? (
              <div style={{ marginTop: "8px" }} className="markdown-content">
                <ReactMarkdown>{(analysisResult || partialResult)!.summary}</ReactMarkdown>
              </div>
            ) : (
              <div style={{ marginTop: "8px", color: "#666", fontStyle: "italic" }}>
                {isAnalyzing && analysisProgress.step < 3 ? "正在分析中..." : "暂无数据"}
              </div>
            )}
          </div>
        </div>

        {/* 优化后简历部分 */}
        <div className="optimized-resume" id="optimized-resume-section">
          <div className="pixel-result-title">
            优化后简历
            {isOptimizing && (
              <span style={{ marginLeft: "10px", fontSize: "14px", color: "#666" }}>
                <Loader2 size={16} className="inline animate-spin" style={{ marginRight: "5px" }} />
                正在生成中...
              </span>
            )}
            {/* 功能按钮 */}
            {analysisResult?.optimizedResume && (
              <div style={{ display: "inline-flex", alignItems: "center" }}>
                <button
                  className={`copy-button ${copySuccess ? 'success' : ''}`}
                  onClick={handleCopyResume}
                  title="复制优化后的简历内容"
                >
                  {copySuccess ? (
                    <>
                      <span>✅</span>
                      已复制
                    </>
                  ) : (
                    <>
                      <span>📋</span>
                      一键复制
                    </>
                  )}
                </button>
                <button
                  className="compare-button"
                  onClick={() => setShowComparison(!showComparison)}
                  title="对比原简历和优化后简历"
                >
                  <span>🔍</span>
                  {showComparison ? '收起对比' : '对比查看'}
                </button>
              </div>
            )}
          </div>

          <div className="pixel-score-item">
            {/* 颜色说明图例 */}
            {analysisResult?.optimizedResume && !showComparison && (
              <div style={{ 
                marginBottom: "16px", 
                padding: "12px", 
                backgroundColor: "#f8f9fa", 
                border: "2px solid #e0e0e0",
                fontSize: "14px"
              }}>
                <div style={{ fontWeight: "bold", marginBottom: "8px" }}>变更说明：</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
                  <span><span className="resume-added">新增内容</span> 绿色显示</span>
                  <span><span className="resume-deleted">删除内容</span> 红色划线</span>
                  <span><span className="resume-optimized">优化内容</span> 橙色显示</span>
                </div>
              </div>
            )}
            

            
            {/* 对比视图 */}
            {showComparison && analysisResult?.optimizedResume ? (
              <div className="comparison-container">
                <div className="comparison-panel">
                  <div className="comparison-title">📄 原简历（已结构化）</div>
                  <div 
                    className="comparison-content"
                    dangerouslySetInnerHTML={{ 
                      __html: formatOriginalResumeToHTML(originalContent) 
                    }}
                  />
                </div>
                <div className="comparison-panel">
                  <div className="comparison-title">✨ 优化后简历</div>
                  <div 
                    className="comparison-content"
                    dangerouslySetInnerHTML={{ 
                      __html: getOptimizedResumeHTML() 
                    }}
                  />
                </div>
              </div>
            ) : (
              /* 单一视图 */
              <div
                style={{
                  minHeight: "200px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#888",
                }}
              >
                {analysisResult?.optimizedResume ? (
                  <div 
                    style={{ width: "100%", textAlign: "left" }} 
                    className="resume-diff-content"
                    dangerouslySetInnerHTML={{ 
                      __html: parseOptimizedResume(analysisResult.optimizedResume) 
                    }}
                  />
                ) : isOptimizing ? (
                  <div style={{ textAlign: "center" }}>
                    <Loader2 size={32} className="animate-spin" style={{ marginBottom: "10px" }} />
                    <div>正在根据匹配分析结果生成优化后的简历...</div>
                    <div style={{ fontSize: "14px", color: "#666", marginTop: "5px" }}>
                      这可能需要1-2分钟，请耐心等待
                    </div>
                  </div>
                ) : (
                  '点击"一键转写"按钮生成优化后的简历内容'
                )}
              </div>
            )}
          </div>
        </div>

        {/* JD解析部分 */}
        <div className="jd-analysis" id="insight-section">
          <div className="jd-tabs">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`jd-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => {
                  setActiveTab(tab.id)
                  if (!jobInsights[tab.id]) {
                    handleJobInsight(tab.id)
                  }
                }}
              >
                {tab.label}
              </div>
            ))}
          </div>

          <div className="jd-content">
            <div style={{ padding: "20px", color: "#666", minHeight: "280px" }}>
              {jobInsights[activeTab] ? (
                <div style={{ color: "#333" }} className="markdown-content">
                  <ReactMarkdown>{jobInsights[activeTab].content}</ReactMarkdown>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "240px" }}>
                  {isGeneratingInsight ? (
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <Loader2 size={24} className="animate-spin" style={{ marginRight: "12px" }} />
                      正在生成洞察内容...
                    </div>
                  ) : (
                    `此处将显示${tabs.find((t) => t.id === activeTab)?.label}内容`
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
