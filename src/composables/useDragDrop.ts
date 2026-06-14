/**
 * 文件拖拽上传 Composable
 */

import { ref, type Ref } from 'vue'
import { isPdfFile } from '../services/file-utils'

export function useDragDrop() {
  const isDragging: Ref<boolean> = ref(false)
  const error: Ref<string | null> = ref(null)

  let dragCounter = 0

  function onDragEnter(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragCounter++
    isDragging.value = true
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragCounter--
    if (dragCounter <= 0) {
      dragCounter = 0
      isDragging.value = false
    }
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  function onDrop(
    e: DragEvent
  ): { files: File[] } | null {
    e.preventDefault()
    e.stopPropagation()
    isDragging.value = false
    dragCounter = 0
    error.value = null

    const files = Array.from(e.dataTransfer?.files || [])
    if (files.length === 0) return null

    const pdfFiles = files.filter(isPdfFile)
    if (pdfFiles.length === 0) {
      error.value = '请上传 PDF 文件'
      return null
    }

    return { files: pdfFiles }
  }

  function validateFiles(
    files: FileList | File[]
  ): { valid: File[]; error: string | null } {
    const list = Array.from(files)
    const pdfFiles = list.filter(isPdfFile)

    if (pdfFiles.length === 0) {
      return { valid: [], error: '请选择 PDF 文件' }
    }

    return { valid: pdfFiles, error: null }
  }

  return {
    isDragging,
    error,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop,
    validateFiles,
  }
}
