/**
 * 文件状态管理 — 当前打开的 PDF 文件
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { FileInfo } from '../types/pdf'
import { formatFileSize } from '../services/file-utils'

export const useFileStore = defineStore('file', () => {
  const currentFile = ref<FileInfo | null>(null)
  const arrayBuffer = ref<ArrayBuffer | null>(null)
  const mergeFiles = ref<FileInfo[]>([])

  const hasFile = computed(() => currentFile.value !== null)
  const fileName = computed(() => currentFile.value?.name || '')
  const formattedSize = computed(() =>
    currentFile.value ? formatFileSize(currentFile.value.size) : ''
  )

  async function openFile(file: File): Promise<ArrayBuffer> {
    const buffer = await file.arrayBuffer()
    arrayBuffer.value = buffer

    currentFile.value = {
      name: file.name,
      size: file.size,
      pageCount: 0, // 渲染后更新
      arrayBuffer: buffer,
    }

    return buffer
  }

  function updatePageCount(count: number) {
    if (currentFile.value) {
      currentFile.value.pageCount = count
    }
  }

  function addMergeFile(file: File, buffer: ArrayBuffer, pageCount: number) {
    mergeFiles.value.push({
      name: file.name,
      size: file.size,
      pageCount,
      arrayBuffer: buffer,
    })
  }

  function removeMergeFile(index: number) {
    mergeFiles.value.splice(index, 1)
  }

  function reset() {
    currentFile.value = null
    arrayBuffer.value = null
    mergeFiles.value = []
  }

  return {
    currentFile,
    arrayBuffer,
    mergeFiles,
    hasFile,
    fileName,
    formattedSize,
    openFile,
    updatePageCount,
    addMergeFile,
    removeMergeFile,
    reset,
  }
})
