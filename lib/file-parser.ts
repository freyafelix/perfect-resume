// 客户端文件解析工具函数

// 验证文件类型和大小
export function validateFile(file: File): { valid: boolean; error?: string } {
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