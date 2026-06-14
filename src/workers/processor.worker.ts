/**
 * PDF 处理 Web Worker
 * 仅执行 pdf-lib 操作（不需要 DOM）：
 *   - 页面删除/旋转/排序/提取
 *   - PDF 合并/拆分
 *
 * 注意：渲染相关的操作（缩略图、空白页检测）在主线程执行，
 *       因为 pdfjs 渲染需要 DOM Canvas。
 */

import {
  loadPdf,
  deletePages,
  rotatePage,
  reorderPages,
  extractPages,
  mergePdfs,
  splitPdf,
  savePdf,
} from '../services/pdf-engine'

// ============ 页面处理 ============

async function processPages(
  arrayBuffer: ArrayBuffer,
  operations: any[]
): Promise<{ type: string; data?: Uint8Array; message?: string }> {
  try {
    let doc = await loadPdf(arrayBuffer)

    for (const op of operations) {
      switch (op.type) {
        case 'delete':
          doc = await deletePages(doc, op.indices)
          break
        case 'rotate':
          doc = await rotatePage(doc, op.index, op.degrees)
          break
        case 'reorder':
          doc = await reorderPages(doc, op.newOrder)
          break
        case 'extract':
          doc = await extractPages(doc, op.indices)
          break
      }
    }

    const data = await savePdf(doc)
    return { type: 'processed', data }
  } catch (err: any) {
    return { type: 'error', message: err.message || '处理 PDF 失败' }
  }
}

// ============ 合并 ============

async function handleMerge(
  files: { arrayBuffer: ArrayBuffer; name: string }[]
): Promise<{ type: string; data?: Uint8Array; message?: string }> {
  try {
    const buffers = files.map((f) => f.arrayBuffer)
    const doc = await mergePdfs(buffers)
    const data = await savePdf(doc)
    return { type: 'merged', data }
  } catch (err: any) {
    return { type: 'error', message: err.message || '合并 PDF 失败' }
  }
}

// ============ 拆分 ============

async function handleSplit(
  arrayBuffer: ArrayBuffer,
  ranges: [number, number][]
): Promise<{ type: string; data?: Uint8Array[]; message?: string }> {
  try {
    const data = await splitPdf(arrayBuffer, ranges)
    return { type: 'split', data }
  } catch (err: any) {
    return { type: 'error', message: err.message || '拆分 PDF 失败' }
  }
}

// ============ 消息调度 ============

self.onmessage = async (
  event: MessageEvent<{ type: string; [key: string]: any }>
) => {
  const req = event.data
  let response: any

  switch (req.type) {
    case 'processPages':
      response = await processPages(req.arrayBuffer, req.operations)
      break
    case 'mergePdfs':
      response = await handleMerge(req.files)
      break
    case 'splitPdf':
      response = await handleSplit(req.arrayBuffer, req.ranges)
      break
    default:
      response = { type: 'error', message: `未知的请求类型: ${req.type}` }
  }

  self.postMessage(response)
}
