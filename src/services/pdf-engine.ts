/**
 * PDF 处理引擎 — 封装 pdf-lib 操作
 * 此文件在 Web Worker 中运行
 */

import { PDFDocument } from 'pdf-lib'
import type { PageOperation, BlankPageResult } from '../types/pdf'

/** 从 ArrayBuffer 加载 PDF */
export async function loadPdf(buffer: ArrayBuffer): Promise<PDFDocument> {
  return PDFDocument.load(buffer, { ignoreEncryption: true })
}

/** 获取页数 */
export function getPageCount(doc: PDFDocument): number {
  return doc.getPageCount()
}

/** 按索引删除页面 */
export async function deletePages(
  doc: PDFDocument,
  indices: number[]
): Promise<PDFDocument> {
  // 从后往前删，避免索引偏移
  const sorted = [...indices].sort((a, b) => b - a)
  for (const idx of sorted) {
    if (idx >= 0 && idx < doc.getPageCount()) {
      doc.removePage(idx)
    }
  }
  return doc
}

/** 旋转页面 */
export async function rotatePage(
  doc: PDFDocument,
  index: number,
  degrees: number
): Promise<PDFDocument> {
  if (index >= 0 && index < doc.getPageCount()) {
    const page = doc.getPage(index)
    const currentRotation = page.getRotation().angle
    page.setRotation({ angle: currentRotation + degrees } as any)
  }
  return doc
}

/** 重排页面顺序 — 创建新文档按新顺序复制页面 */
export async function reorderPages(
  doc: PDFDocument,
  newOrder: number[]
): Promise<PDFDocument> {
  const newDoc = await PDFDocument.create()
  const validIndices = newOrder.filter(
    (idx) => idx >= 0 && idx < doc.getPageCount()
  )
  if (validIndices.length > 0) {
    const pages = await newDoc.copyPages(doc, validIndices)
    for (const page of pages) {
      newDoc.addPage(page)
    }
  }
  return newDoc
}

/** 提取选中页面为新 PDF */
export async function extractPages(
  doc: PDFDocument,
  indices: number[]
): Promise<PDFDocument> {
  const newDoc = await PDFDocument.create()
  const pages = await newDoc.copyPages(doc, indices)
  for (const page of pages) {
    newDoc.addPage(page)
  }
  return newDoc
}

/** 合并多个 PDF */
export async function mergePdfs(
  buffers: ArrayBuffer[]
): Promise<PDFDocument> {
  const merged = await PDFDocument.create()

  for (const buf of buffers) {
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true })
    const pages = await merged.copyPages(doc, doc.getPageIndices())
    for (const page of pages) {
      merged.addPage(page)
    }
  }

  return merged
}

/** 按页码范围拆分 PDF */
export async function splitPdf(
  buffer: ArrayBuffer,
  ranges: [number, number][]
): Promise<Uint8Array[]> {
  const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const results: Uint8Array[] = []

  for (const [start, end] of ranges) {
    const newDoc = await PDFDocument.create()
    const indices: number[] = []
    for (let i = start; i <= end; i++) {
      if (i >= 0 && i < srcDoc.getPageCount()) {
        indices.push(i)
      }
    }
    if (indices.length > 0) {
      const pages = await newDoc.copyPages(srcDoc, indices)
      for (const page of pages) {
        newDoc.addPage(page)
      }
    }
    results.push(await newDoc.save())
  }

  return results
}

/** 将 PDF 保存为 Uint8Array */
export async function savePdf(doc: PDFDocument): Promise<Uint8Array> {
  return doc.save()
}

/** 空白页检测 — 基于图像数据 */
export function detectBlankPage(
  imageData: ImageData,
  threshold = 240,
  sampleStep = 4
): Omit<BlankPageResult, 'hasTextContent'> {
  const { data, width, height } = imageData
  let whitePixels = 0
  let totalSampled = 0

  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      const idx = (y * width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      totalSampled++
      if (r >= threshold && g >= threshold && b >= threshold) {
        whitePixels++
      }
    }
  }

  const whitePixelRatio = totalSampled > 0 ? whitePixels / totalSampled : 1

  return {
    pageIndex: -1, // caller fills
    isBlank: whitePixelRatio > 0.99,
    whitePixelRatio,
    hasTextContent: false, // caller fills
  }
}

/** 解析页码范围字符串，如 "1-5, 7, 10-15" */
export function parsePageRanges(
  input: string,
  totalPages: number
): [number, number][] {
  const ranges: [number, number][] = []
  const parts = input.split(/[,，]/)

  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-')
      const start = Math.max(1, parseInt(startStr, 10) || 1) - 1
      const end = Math.min(totalPages, parseInt(endStr, 10) || totalPages) - 1
      if (start <= end) {
        ranges.push([start, end])
      }
    } else {
      const page = parseInt(trimmed, 10)
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        ranges.push([page - 1, page - 1])
      }
    }
  }

  return ranges
}
