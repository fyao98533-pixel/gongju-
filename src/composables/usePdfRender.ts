/**
 * PDF 渲染 Composable — 在主线程渲染缩略图
 * （主线程有 DOM，用 document.createElement('canvas') 避免 OffscreenCanvas 兼容问题）
 */

import { ref, type Ref } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'

// 初始化 pdfjs worker（只在主线程调一次）
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

interface ThumbnailResult {
  dataUrl: string
  width: number
  height: number
}

export function usePdfRender() {
  const thumbnails: Ref<ThumbnailResult[]> = ref([])
  const totalPages: Ref<number> = ref(0)
  const isRendering: Ref<boolean> = ref(false)
  const progress: Ref<number> = ref(0)

  /**
   * 在主线程渲染 PDF 所有页面的缩略图
   */
  async function renderPdf(file: File): Promise<ThumbnailResult[]> {
    isRendering.value = true
    progress.value = 0
    thumbnails.value = []

    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise
      const total = pdf.numPages
      const results: ThumbnailResult[] = []

      for (let i = 1; i <= total; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 0.3 })

        // 用 document.createElement — 主线程上永远可用
        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('无法创建 Canvas 上下文')

        await page.render({ canvasContext: ctx, viewport }).promise

        const dataUrl = canvas.toDataURL('image/webp', 0.5)

        results.push({
          dataUrl,
          width: viewport.width,
          height: viewport.height,
        })

        if (i % 5 === 0 || i === total) {
          progress.value = Math.round((i / total) * 100)
        }
      }

      thumbnails.value = results
      totalPages.value = results.length
      isRendering.value = false
      return results
    } catch (err: any) {
      isRendering.value = false
      throw new Error(err.message || '渲染 PDF 失败')
    }
  }

  return {
    thumbnails,
    totalPages,
    isRendering,
    progress,
    renderPdf,
  }
}
