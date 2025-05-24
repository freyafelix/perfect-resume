import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: "没有上传文件" },
        { status: 400 }
      )
    }

    // 验证文件
    const validation = validateFile(file)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    // 解析文件
    const content = await parseFile(file)
    
    return NextResponse.json({
      success: true,
      data: {
        content,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      }
    })

  } catch (error) {
    console.error("文件解析错误:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: `文件解析失败: ${error instanceof Error ? error.message : '未知错误'}` 
      },
      { status: 500 }
    )
  }
}

// 文件解析函数
async function parseFile(file: File): Promise<string> {
  const fileType = file.type
  const fileName = file.name.toLowerCase()

  // PDF文件解析
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return await parsePDF(file)
  }
  
  // Word文档解析
  if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      fileName.endsWith('.docx')) {
    return await parseDocx(file)
  }
  
  if (fileType === 'application/msword' || fileName.endsWith('.doc')) {
    throw new Error('暂不支持.doc格式，请将文件转换为.docx格式后重新上传')
  }
  
  // 图片文件OCR识别
  if (fileType.startsWith('image/') || 
      fileName.endsWith('.jpg') || 
      fileName.endsWith('.jpeg') || 
      fileName.endsWith('.png')) {
    return await parseImage(file)
  }
  
  // 纯文本文件
  if (fileType.includes('text') || fileName.endsWith('.txt')) {
    return await parseText(file)
  }
  
  throw new Error(`不支持的文件类型: ${fileType}`)
}

// PDF文件解析
async function parsePDF(file: File): Promise<string> {
  try {
    // 动态导入pdf-parse
    const pdf = (await import('pdf-parse')).default
    
    const arrayBuffer = await file.arrayBuffer()
    const data = await pdf(Buffer.from(arrayBuffer))
    
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('PDF文件中没有找到可提取的文本内容，可能是图片格式的PDF')
    }
    
    return `=== PDF简历内容 ===\n文件名: ${file.name}\n\n${data.text.trim()}`
  } catch (error) {
    throw new Error(`PDF解析失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

// Word DOCX文件解析
async function parseDocx(file: File): Promise<string> {
  try {
    // 动态导入mammoth
    const mammoth = await import('mammoth')
    
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    
    if (!result.value || result.value.trim().length === 0) {
      throw new Error('Word文档中没有找到可提取的文本内容')
    }
    
    return `=== Word简历内容 ===\n文件名: ${file.name}\n\n${result.value.trim()}`
  } catch (error) {
    throw new Error(`Word文档解析失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

// 图片OCR识别
async function parseImage(file: File): Promise<string> {
  try {
    // 动态导入tesseract.js
    const { createWorker } = await import('tesseract.js')
    
    // 创建Tesseract worker
    const worker = await createWorker('chi_sim+eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          console.log(`OCR进度: ${Math.round(m.progress * 100)}%`)
        }
      }
    })
    
    // 执行OCR识别
    const { data: { text } } = await worker.recognize(file)
    await worker.terminate()
    
    if (!text || text.trim().length === 0) {
      throw new Error('图片中没有识别到文本内容，请确保图片清晰且包含文字')
    }
    
    return `=== 图片OCR识别内容 ===\n文件名: ${file.name}\n\n${text.trim()}`
  } catch (error) {
    throw new Error(`图片OCR识别失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

// 纯文本文件解析
async function parseText(file: File): Promise<string> {
  try {
    const text = await file.text()
    
    if (!text || text.trim().length === 0) {
      throw new Error('文本文件内容为空')
    }
    
    return `=== 文本简历内容 ===\n文件名: ${file.name}\n\n${text.trim()}`
  } catch (error) {
    throw new Error(`文本文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

// 验证文件类型和大小
function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 50 * 1024 * 1024 // 50MB
  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "image/jpeg",
    "image/jpg", 
    "image/png",
    "text/plain"
  ]

  if (file.size > maxSize) {
    return { valid: false, error: "文件大小超过50MB限制" }
  }

  // 检查文件类型（通过MIME类型和文件扩展名）
  const fileName = file.name.toLowerCase()
  const isValidType = allowedTypes.includes(file.type) || 
                     fileName.endsWith('.pdf') ||
                     fileName.endsWith('.docx') ||
                     fileName.endsWith('.doc') ||
                     fileName.endsWith('.jpg') ||
                     fileName.endsWith('.jpeg') ||
                     fileName.endsWith('.png') ||
                     fileName.endsWith('.txt')

  if (!isValidType) {
    return { valid: false, error: "不支持的文件类型，请上传PDF、Word文档、图片或文本文件" }
  }

  return { valid: true }
} 