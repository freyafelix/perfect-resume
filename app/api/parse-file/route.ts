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

// 文件解析函数（增强版）
async function parseFile(file: File): Promise<string> {
  const fileType = file.type
  const fileName = file.name.toLowerCase()
  
  console.log(`开始解析文件: ${file.name}, 类型: ${fileType}, 大小: ${file.size}`)

  try {
    // PDF文件解析
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      console.log('检测到PDF文件，开始解析...')
      return await parsePDF(file)
    }
    
    // Word文档解析 - 支持多种MIME类型
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        fileType === 'application/msword' ||
        fileName.endsWith('.docx') || 
        fileName.endsWith('.doc')) {
      
      if (fileName.endsWith('.doc')) {
        throw new Error('不支持旧版.doc格式，请将文件转换为.docx格式后重新上传')
      }
      
      console.log('检测到Word文档，开始解析...')
      return await parseDocx(file)
    }
    
    // 图片文件OCR识别 - 明确支持的格式
    if (fileType.startsWith('image/') || 
        fileName.endsWith('.jpg') || 
        fileName.endsWith('.jpeg') || 
        fileName.endsWith('.png') ||
        fileName.endsWith('.gif') ||
        fileName.endsWith('.bmp')) {
      
      // 检查具体图片格式
      const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp']
      if (!supportedFormats.includes(fileType) && !fileName.match(/\.(jpe?g|png|gif|bmp)$/i)) {
        throw new Error('不支持的图片格式，请使用JPG、PNG、GIF或BMP格式')
      }
      
      console.log('检测到图片文件，开始OCR识别...')
      return await parseImage(file)
    }
    
    // 纯文本文件
    if (fileType.includes('text') || fileName.endsWith('.txt')) {
      console.log('检测到文本文件，开始解析...')
      return await parseText(file)
    }
    
    // 如果没有匹配的处理器，给出具体的错误信息
    throw new Error(`不支持的文件类型: ${fileType || '未知'}。支持的格式：PDF、Word文档(.docx)、图片(JPG/PNG/GIF/BMP)、文本文件(.txt)`)
    
  } catch (error) {
    console.error(`文件解析失败 [${file.name}]:`, error)
    
    // 根据错误类型提供更有针对性的建议
    if (error instanceof Error) {
      if (error.message.includes('truncated') || error.message.includes('corrupt')) {
        throw new Error(`文件可能已损坏或不完整，请检查文件完整性后重新上传`)
      } else if (error.message.includes('format') || error.message.includes('Unknown')) {
        throw new Error(`文件格式不受支持或已损坏，请确认文件格式正确`)
      } else if (error.message.includes('size') || error.message.includes('大小')) {
        throw new Error(`文件过大，请压缩后重新上传`)
      }
      throw error // 如果是已知错误，直接抛出
    }
    
    throw new Error(`解析失败: 请检查文件格式是否正确，或尝试转换为PDF格式后重新上传`)
  }
}

// PDF文件解析（增强版 - 改进结构化处理）
async function parsePDF(file: File): Promise<string> {
  try {
    // 动态导入pdf-parse
    const pdf = (await import('pdf-parse')).default
    
    const arrayBuffer = await file.arrayBuffer()
    const data = await pdf(Buffer.from(arrayBuffer))
    
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('PDF文件中没有找到可提取的文本内容，可能是图片格式的PDF')
    }
    
    // 智能清理和结构化PDF文本，过滤乱码
    const cleanedText = smartCleanPDFText(data.text)
    
    // 如果清理后的文本太短或包含太多乱码，抛出错误
    if (cleanedText.length < 50 || isGarbageText(cleanedText)) {
      throw new Error('PDF文件包含过多乱码或无法识别的内容，建议使用其他格式或重新生成PDF')
    }
    
    return cleanedText
  } catch (error) {
    throw new Error(`PDF解析失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

// 检测是否为乱码文本
function isGarbageText(text: string): boolean {
  // 计算可读字符的比例
  const totalChars = text.length
  const readableChars = text.match(/[\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf\uf900-\ufaff\u3300-\u33ff\ufe30-\ufe4f\ua-zA-Z0-9\s\.\,\!\?\:\;\(\)\[\]\{\}\-\+\=\@\#\$\%\^\&\*\/\\\|\_\~\`\'\"]/g)
  const readableRatio = readableChars ? readableChars.length / totalChars : 0
  
  // 如果可读字符比例低于60%，认为是乱码
  return readableRatio < 0.6
}

// 智能清理PDF文本，改进个人信息提取和乱码过滤
function smartCleanPDFText(rawText: string): string {
  let cleaned = rawText
  
  // 首先过滤掉明显的PDF元数据和二进制内容
  cleaned = cleaned
    .replace(/%PDF-[\d\.]+/g, '') // 移除PDF版本信息
    .replace(/%%EOF/g, '') // 移除PDF结束标记
    .replace(/\/[A-Z][a-zA-Z]*\s+/g, ' ') // 移除PDF命令
    .replace(/<<[^>]*>>/g, ' ') // 移除PDF对象
    .replace(/stream[\s\S]*?endstream/g, ' ') // 移除stream内容
    .replace(/obj[\s\S]*?endobj/g, ' ') // 移除obj内容
    .replace(/xref[\s\S]*?trailer/g, ' ') // 移除xref表
    .replace(/startxref[\s\S]*$/g, '') // 移除startxref
    
  // 移除不可打印字符和控制字符
  cleaned = cleaned
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ') // 移除控制字符
    .replace(/[^\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf\uf900-\ufaff\u3300-\u33ff\ufe30-\ufe4f\ua-zA-Z0-9\s\.\,\!\?\:\;\(\)\[\]\{\}\-\+\=\@\#\$\%\^\&\*\/\\\|\_\~\`\'\"\n]/g, ' ') // 只保留中文、英文、数字和常用标点
    
  // 统一换行符和空格
  cleaned = cleaned
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  
  // 修复常见的PDF解析问题
  cleaned = cleaned
    // 修复被分割的常见词汇
    .replace(/工\s*作\s*经\s*历/g, '工作经历')
    .replace(/项\s*目\s*经\s*历/g, '项目经历')
    .replace(/教\s*育\s*背\s*景/g, '教育背景')
    .replace(/专\s*业\s*技\s*能/g, '专业技能')
    .replace(/自\s*我\s*评\s*价/g, '自我评价')
    .replace(/个\s*人\s*信\s*息/g, '个人信息')
    .replace(/联\s*系\s*方\s*式/g, '联系方式')
    .replace(/求\s*职\s*意\s*向/g, '求职意向')
    
    // 修复手机号码格式（常见的11位手机号）
    .replace(/(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)/g, '$1$2$3$4$5$6$7$8$9$10$11')
    .replace(/(\d{3})\s+(\d{4})\s+(\d{4})/g, '$1$2$3')
    
    // 修复邮箱格式
    .replace(/(\w+)\s*@\s*(\w+)\s*\.\s*(\w+)/g, '$1@$2.$3')
    .replace(/(\w+)\s*@\s*(\w+)\s*\.\s*(\w+)\s*\.\s*(\w+)/g, '$1@$2.$3.$4')
    
    // 修复时间格式
    .replace(/(\d{4})\s*[\.\-/年]\s*(\d{1,2})\s*[\.\-/月]?\s*[-~至到]\s*(\d{4})\s*[\.\-/年]\s*(\d{1,2})\s*[\.\-/月]?/g, '$1.$2-$3.$4')
    .replace(/(\d{4})\s*[\.\-/年]\s*(\d{1,2})\s*[\.\-/月]?\s*[-~至到]\s*(至今|现在)/g, '$1.$2-至今')
    
    // 修复常见的OCR错误字符
    .replace(/０/g, '0').replace(/１/g, '1').replace(/２/g, '2').replace(/３/g, '3').replace(/４/g, '4')
    .replace(/５/g, '5').replace(/６/g, '6').replace(/７/g, '7').replace(/８/g, '8').replace(/９/g, '9')
    .replace(/：/g, ':').replace(/；/g, ';').replace(/，/g, ',').replace(/。/g, '.')
    .replace(/（/g, '(').replace(/）/g, ')').replace(/【/g, '[').replace(/】/g, ']')
    
    // 清理多余的空行和空格
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s+/gm, '')
    .replace(/\s+$/gm, '')
    .trim()
  
  return cleaned
}

// 解析图片文件 (OCR)
async function parseImage(file: File): Promise<string> {
  try {
    console.log('检测到图片文件，开始OCR识别...')
    
    // 验证文件格式和大小
    const validFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp']
    if (!validFormats.includes(file.type)) {
      throw new Error(`不支持的图片格式: ${file.type}。支持的格式: JPG, PNG, GIF, BMP`)
    }
    
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      throw new Error(`图片文件过大: ${(file.size / 1024 / 1024).toFixed(1)}MB。最大支持: 10MB`)
    }
    
    // 将文件转换为Buffer（服务端环境）
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // 使用tesseract.js进行OCR识别
    const { createWorker } = require('tesseract.js')
    const worker = await createWorker('chi_sim+eng', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR进度: ${Math.round(m.progress * 100)}%`)
        }
      }
    })
    
    try {
      // 直接使用Buffer进行OCR识别
      const { data: { text } } = await worker.recognize(buffer, {
        tessedit_pageseg_mode: '1', // 自动页面分割
        tessedit_ocr_engine_mode: '2', // 使用LSTM OCR引擎
      })
      
      await worker.terminate()
      
      if (!text || text.trim().length === 0) {
        throw new Error('OCR识别结果为空，可能是图片质量不佳或内容无法识别')
      }
      
      console.log(`OCR识别完成，提取文本长度: ${text.length}`)
      return `=== 图片OCR识别内容 ===\n文件名: ${file.name}\n\n${text.trim()}`
      
    } catch (ocrError) {
      await worker.terminate()
      throw ocrError
    }
    
  } catch (error) {
    console.error('OCR处理错误:', error)
    throw new Error(`图片OCR识别失败: ${error instanceof Error ? error.message : '图片格式不支持或文件损坏'}`)
  }
}

// 解析Word文档
async function parseDocx(file: File): Promise<string> {
  try {
    console.log('检测到Word文档，开始解析...')
    
    // 验证文件格式
    const validMimeTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ]
    
    if (!validMimeTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.docx')) {
      throw new Error(`不支持的Word文档格式: ${file.type}。仅支持 .docx 格式`)
    }
    
    // 检查文件大小
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      throw new Error(`Word文档过大: ${(file.size / 1024 / 1024).toFixed(1)}MB。最大支持: 50MB`)
    }
    
    // 将文件转换为ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    
    // 验证文件完整性
    if (arrayBuffer.byteLength === 0) {
      throw new Error('Word文档为空或损坏')
    }
    
    const mammoth = require('mammoth')
    
    try {
      // 尝试提取带格式的HTML（用于结构识别）
      const htmlResult = await mammoth.convertToHtml({ buffer: arrayBuffer })
      
      // 提取纯文本内容
      const rawResult = await mammoth.extractRawText({ buffer: arrayBuffer })
      
      let content = ''
      
      // 优先使用HTML结果（保留更多结构信息）
      if (htmlResult.value && htmlResult.value.trim().length > 0) {
        // 将HTML转换为更易读的文本格式
        content = htmlResult.value
          .replace(/<h[1-6][^>]*>/gi, '\n## ')
          .replace(/<\/h[1-6]>/gi, '\n')
          .replace(/<p[^>]*>/gi, '\n')
          .replace(/<\/p>/gi, '')
          .replace(/<strong[^>]*>/gi, '**')
          .replace(/<\/strong>/gi, '**')
          .replace(/<em[^>]*>/gi, '*')
          .replace(/<\/em>/gi, '*')
          .replace(/<li[^>]*>/gi, '• ')
          .replace(/<\/li>/gi, '')
          .replace(/<[^>]+>/g, '') // 移除其他HTML标签
          .replace(/\n{3,}/g, '\n\n') // 清理多余空行
          .trim()
      }
      
      // 如果HTML结果为空或太短，使用纯文本结果
      if (!content || content.length < 50) {
        content = rawResult.value || ''
      }
      
      // 检查解析结果
      if (!content || content.trim().length === 0) {
        throw new Error('Word文档内容为空或无法解析')
      }
      
      // 处理警告信息
      const warnings = [...(htmlResult.messages || []), ...(rawResult.messages || [])]
      if (warnings.length > 0) {
        console.log('Word解析警告:', warnings.map(w => w.message).join('; '))
      }
      
      console.log(`Word文档解析完成，提取文本长度: ${content.length}`)
      return `=== Word文档内容 ===\n文件名: ${file.name}\n\n${content}`
      
    } catch (mammothError) {
      console.error('Mammoth解析错误:', mammothError)
      throw new Error('Word文档解析失败，可能是文档格式不支持或文件损坏')
    }
    
  } catch (error) {
    console.error('Word文档处理错误:', error)
    throw new Error(`Word文档解析失败: ${error instanceof Error ? error.message : '未知错误'}`)
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