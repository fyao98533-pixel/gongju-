<script setup lang="ts">
defineOptions({ name: 'BlankDetectView' })
import { ref, computed } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import FileDropZone from '../components/shared/FileDropZone.vue'
import PdfThumbnail from '../components/viewer/PdfThumbnail.vue'
import ProgressOverlay from '../components/shared/ProgressOverlay.vue'
import Toast from '../components/shared/Toast.vue'
import { downloadPdf, generateOutputName, formatFileSize } from '../services/file-utils'
import { detectBlankPage } from '../services/pdf-engine'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

const fileBuffer = ref<ArrayBuffer | null>(null)
const fileName = ref(''); const fileSize = ref(0); const hasFile = ref(false)
const pages = ref<{ pageIndex: number; dataUrl: string; isBlank: boolean; whitePixelRatio: number }[]>([])
const isProcessing = ref(false); const processProgress = ref(0); const processMessage = ref('')
const threshold = ref(95); const phase = ref<'upload' | 'result'>('upload')
const toast = ref<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
const blankCount = computed(() => pages.value.filter(p => p.isBlank).length)

function showToast(msg: string, type: 'success' | 'error' | 'info' = 'info') { toast.value = { message: msg, type } }

async function handleFileSelected(file: File) {
  fileBuffer.value = await file.arrayBuffer(); fileName.value = file.name; fileSize.value = file.size; hasFile.value = true
  pages.value = []; phase.value = 'upload'
}

async function startDetection() {
  if (!fileBuffer.value) { showToast('请先打开 PDF', 'error'); return }
  isProcessing.value = true; processProgress.value = 0; pages.value = []
  try {
    const pdf = await pdfjsLib.getDocument({ data: fileBuffer.value.slice(0) }).promise
    const total = pdf.numPages; const thresh = (threshold.value / 100) * 255
    for (let i = 1; i <= total; i++) {
      const page = await pdf.getPage(i); const viewport = page.getViewport({ scale: 0.3 })
      const canvas = document.createElement('canvas'); canvas.width = Math.floor(viewport.width); canvas.height = Math.floor(viewport.height)
      const ctx = canvas.getContext('2d')!; await page.render({ canvasContext: ctx, viewport }).promise
      const dataUrl = canvas.toDataURL('image/webp', 0.5)
      const pv = page.getViewport({ scale: 0.2 }); const pc = document.createElement('canvas')
      pc.width = Math.floor(pv.width); pc.height = Math.floor(pv.height)
      const pctx = pc.getContext('2d')!; await page.render({ canvasContext: pctx, viewport: pv }).promise
      const imageData = pctx.getImageData(0, 0, pc.width, pc.height)
      const px = detectBlankPage(imageData, thresh, 2)
      let hasText = false
      try { hasText = (await page.getTextContent()).items.some((it: any) => it.str?.trim().length > 0) } catch { hasText = false }
      pages.value.push({ pageIndex: i - 1, dataUrl, isBlank: px.isBlank && !hasText, whitePixelRatio: px.whitePixelRatio })
      processProgress.value = Math.round((i / total) * 100); processMessage.value = `检测中 ${i}/${total}`
    }
    phase.value = 'result'
    const n = pages.value.filter(p => p.isBlank).length
    showToast(n === 0 ? '未发现空白页' : `发现 ${n} 个空白页`, n === 0 ? 'info' : 'success')
  } catch (err: any) { showToast(err.message || '检测失败', 'error') }
  finally { isProcessing.value = false }
}

function toggleBlank(i: number) { pages.value[i].isBlank = !pages.value[i].isBlank }

async function removeBlankPages() {
  if (!fileBuffer.value) return
  const indices = pages.value.filter(p => p.isBlank).map(p => p.pageIndex).sort((a, b) => b - a)
  if (indices.length === 0) { showToast('没有标记为空白', 'info'); return }
  isProcessing.value = true; processMessage.value = '正在删除...'
  const w = new Worker(new URL('../workers/processor.worker.ts', import.meta.url), { type: 'module' })
  w.postMessage({ type: 'processPages', arrayBuffer: fileBuffer.value, operations: [{ type: 'delete', indices }] })
  w.onmessage = (e) => {
    if (e.data.type === 'processed') { isProcessing.value = false; downloadPdf(e.data.data, generateOutputName(fileName.value, '去空白')); showToast(`已删除 ${indices.length} 页`, 'success'); w.terminate() }
    else if (e.data.type === 'error') { isProcessing.value = false; showToast(e.data.message, 'error'); w.terminate() }
  }
}

function handleReset() { hasFile.value = false; fileBuffer.value = null; fileName.value = ''; pages.value = []; phase.value = 'upload' }
</script>

<template>
  <div class="flex flex-col h-full">
    <div v-if="!hasFile" class="flex-1 flex items-center justify-center p-6">
      <div class="w-full max-w-md"><FileDropZone @file-selected="handleFileSelected" /></div>
    </div>

    <template v-else>
      <div class="flex items-center gap-3 px-5 py-3 border-b border-[#e8e8e6] bg-white">
        <span class="text-sm opacity-50">📄</span>
        <span class="text-sm font-medium text-[#333] truncate flex-1">{{ fileName }}</span>
        <span class="text-xs text-[#aaa]">{{ formatFileSize(fileSize) }}</span>
        <button class="px-3 py-1.5 text-xs rounded-xl text-[#999] hover:text-[#333] hover:bg-gray-50 transition-all" @click="handleReset">关闭</button>
      </div>

      <div v-if="phase === 'upload'" class="px-5 py-5 border-b border-[#e8e8e6] space-y-4 bg-white">
        <div class="flex items-center gap-4">
          <label class="text-sm text-[#666] flex-shrink-0">敏感度</label>
          <input v-model.number="threshold" type="range" min="80" max="99" class="flex-1 accent-indigo-500" />
          <span class="text-sm text-indigo-500 font-mono w-10 text-right">{{ threshold }}%</span>
        </div>
        <p class="text-xs text-[#aaa]">值越高越敏感，浅色页更容易被判为空白</p>
        <button class="w-full py-3 rounded-2xl bg-indigo-500 text-white font-semibold hover:bg-indigo-400 disabled:opacity-30 transition-all active:scale-[0.98] shadow-sm shadow-indigo-500/20" :disabled="isProcessing" @click="startDetection">开始检测</button>
      </div>

      <div v-if="phase === 'result'" class="flex-1 overflow-y-auto">
        <div class="px-5 py-3 border-b border-[#e8e8e6] bg-white flex items-center gap-3">
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium"
            :class="blankCount > 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'">
            <span>{{ blankCount > 0 ? '⬜' : '✅' }}</span>
            <span>{{ blankCount > 0 ? `${blankCount} 个空白页` : '未发现空白页' }}</span>
          </div>
          <span class="text-xs text-[#aaa]">共 {{ pages.length }} 页 · 点击切换标记</span>
          <button class="ml-auto px-3 py-1.5 text-xs rounded-xl bg-gray-50 text-[#888] hover:bg-gray-100 transition-all" :disabled="isProcessing" @click="phase = 'upload'">调整</button>
        </div>

        <div class="grid gap-4 p-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          <PdfThumbnail v-for="(p, idx) in pages" :key="p.pageIndex"
            :data-url="p.dataUrl" :page-number="p.pageIndex + 1"
            :selected="false" :rotation="0" :select-mode="false"
            :blank-marked="p.isBlank" :thumb-index="idx"
            @click="toggleBlank(idx)" />
        </div>
      </div>

      <div v-if="phase === 'result' && blankCount > 0" class="p-5 border-t border-[#e8e8e6] bg-white">
        <button class="w-full py-3.5 rounded-2xl bg-red-500 text-white font-semibold hover:bg-red-400 disabled:opacity-30 transition-all active:scale-[0.98] text-[15px] shadow-sm shadow-red-500/20" :disabled="isProcessing" @click="removeBlankPages">
          删除 {{ blankCount }} 个空白页并导出
        </button>
      </div>
    </template>

    <ProgressOverlay :visible="isProcessing" :progress="processProgress" :message="processMessage" />
    <Toast v-if="toast" :message="toast.message" :type="toast.type" @close="toast = null" />
  </div>
</template>
