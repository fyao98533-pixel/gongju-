/**
 * 文件工具函数
 */

/** 将 File 转为 ArrayBuffer */
export async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error(`读取文件失败: ${file.name}`))
    reader.readAsArrayBuffer(file)
  })
}

/** 将 ArrayBuffer 转为 Blob */
export function arrayBufferToBlob(
  buffer: ArrayBuffer | Uint8Array,
  type = 'application/pdf'
): Blob {
  return new Blob([buffer], { type })
}

/** 触发浏览器下载 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** 下载 Uint8Array 为 PDF */
export function downloadPdf(data: Uint8Array, filename: string): void {
  const blob = arrayBufferToBlob(data)
  downloadBlob(blob, filename)
}

/** 格式化文件大小 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

/** 生成输出文件名 */
export function generateOutputName(
  originalName: string,
  suffix = '已处理'
): string {
  const dotIndex = originalName.lastIndexOf('.')
  if (dotIndex === -1) return `${originalName}_${suffix}.pdf`
  const base = originalName.substring(0, dotIndex)
  const ext = originalName.substring(dotIndex)
  return `${base}_${suffix}${ext}`
}

/** 判断是否为 PDF 文件 */
export function isPdfFile(file: File): boolean {
  return (
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf')
  )
}
