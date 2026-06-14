/**
 * PDF 处理 Composable — 通过 Worker 执行 PDF 修改
 */

import { ref, type Ref } from 'vue'
import type { PageOperation } from '../types/pdf'
import { downloadPdf, generateOutputName } from '../services/file-utils'

export function usePdfProcess() {
  const isProcessing: Ref<boolean> = ref(false)
  const progress: Ref<number> = ref(0)
  const progressMessage: Ref<string> = ref('')
  const error: Ref<string | null> = ref(null)

  let worker: Worker | null = null

  function getWorker(): Worker {
    if (!worker) {
      worker = new Worker(
        new URL('../workers/processor.worker.ts', import.meta.url),
        { type: 'module' }
      )
    }
    return worker
  }

  async function processPdf(
    arrayBuffer: ArrayBuffer,
    operations: PageOperation[],
    originalName: string
  ): Promise<Uint8Array> {
    isProcessing.value = true
    progress.value = 0
    error.value = null

    const w = getWorker()

    return new Promise((resolve, reject) => {
      w.onmessage = (event: MessageEvent) => {
        const data = event.data

        if (data.type === 'progress') {
          progress.value = Math.round((data.current / data.total) * 100)
          progressMessage.value = data.message
        } else if (data.type === 'processed') {
          isProcessing.value = false
          progress.value = 100
          downloadPdf(data.data, generateOutputName(originalName))
          resolve(data.data)
        } else if (data.type === 'error') {
          isProcessing.value = false
          error.value = data.message
          reject(new Error(data.message))
        }
      }

      w.onerror = (err) => {
        isProcessing.value = false
        error.value = err.message
        reject(new Error(`Worker 错误: ${err.message}`))
      }

      w.postMessage({
        type: 'processPages',
        arrayBuffer,
        operations,
      })
    })
  }

  /**
   * 导出 PDF（只做删除和排序，不做其他操作）
   */
  async function exportPdf(
    arrayBuffer: ArrayBuffer,
    pages: { originalIndex: number; selected: boolean }[],
    originalName: string
  ): Promise<Uint8Array> {
    const unselectedIndices = pages
      .filter((p) => !p.selected)
      .map((p) => p.originalIndex)
      .sort((a, b) => b - a) // 从大到小，删除时不偏移

    if (unselectedIndices.length === 0) {
      throw new Error('至少需要保留一页')
    }

    return processPdf(
      arrayBuffer,
      [{ type: 'delete', indices: unselectedIndices }],
      originalName
    )
  }

  function terminateWorker() {
    if (worker) {
      worker.terminate()
      worker = null
    }
  }

  return {
    isProcessing,
    progress,
    progressMessage,
    error,
    processPdf,
    exportPdf,
    terminateWorker,
  }
}
