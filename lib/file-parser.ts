// 客户端文件解析工具函数

// 验证文件类型和大小（增强版）
export function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 50 * 1024 * 1024 // 50MB
  const fileName = file.name.toLowerCase()
  
  // 更详细的文件类型检查
  const allowedTypes = {
    pdf: ["application/pdf"],
    word: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword"
    ],
    image: [
      "image/jpeg", 
      "image/jpg", 
      "image/png", 
      "image/gif", 
      "image/bmp"
    ],
    text: ["text/plain"]
  }
  
  // 检查文件大小
  if (file.size > maxSize) {
    return { valid: false, error: "文件大小超过50MB限制，请压缩后重新上传" }
  }
  
  // 检查文件是否为空
  if (file.size === 0) {
    return { valid: false, error: "文件为空，请选择有效的文件" }
  }

  // PDF文件检查
  if (fileName.endsWith('.pdf')) {
    if (!allowedTypes.pdf.includes(file.type) && file.type !== '') {
      return { valid: false, error: "PDF文件格式异常，请确认文件完整性" }
    }
    return { valid: true }
  }
  
  // Word文档检查
  if (fileName.endsWith('.docx')) {
    if (!allowedTypes.word.includes(file.type) && file.type !== '') {
      return { valid: false, error: "Word文档格式异常，请确认为有效的.docx文件" }
    }
    return { valid: true }
  }
  
  if (fileName.endsWith('.doc')) {
    return { valid: false, error: "不支持旧版.doc格式，请将文件转换为.docx格式后重新上传" }
  }
  
  // 图片文件检查
  if (fileName.match(/\.(jpe?g|png|gif|bmp)$/i)) {
    if (!allowedTypes.image.includes(file.type) && !file.type.startsWith('image/')) {
      return { valid: false, error: "图片格式异常，请确认为有效的图片文件" }
    }
    
    // 图片大小特殊限制（OCR处理大图片较慢）
    if (file.size > 10 * 1024 * 1024) {
      return { valid: false, error: "图片文件过大，请使用小于10MB的图片以获得更好的OCR效果" }
    }
    
    return { valid: true }
  }
  
  // 文本文件检查
  if (fileName.endsWith('.txt')) {
    if (!allowedTypes.text.includes(file.type) && !file.type.includes('text')) {
      return { valid: false, error: "文本文件格式异常" }
    }
    return { valid: true }
  }
  
  // 不支持的文件类型
  const supportedExtensions = ['.pdf', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.txt']
  return { 
    valid: false, 
    error: `不支持的文件格式。支持的格式：${supportedExtensions.join(', ')}` 
  }
}

// 获取文件解析进度（用于UI显示）
export function getParsingProgress(fileType: string): string {
  if (fileType === 'application/pdf') {
    return '正在解析PDF文件...'
  } else if (fileType.includes('word') || fileType.includes('document')) {
    return '正在解析Word文档...'
  } else if (fileType.startsWith('image/')) {
    return '正在进行OCR图片识别...'
  } else {
    return '正在解析文件...'
  }
}

// 通过API解析文件
export async function parseResumeFile(file: File): Promise<string> {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/parse-file', {
      method: 'POST',
      body: formData,
    })

    const result = await response.json()

    if (result.success) {
      return result.data.content
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    console.error('文件解析错误:', error)
    throw new Error(`文件解析失败: ${error instanceof Error ? error.message : '网络错误'}`)
  }
} 