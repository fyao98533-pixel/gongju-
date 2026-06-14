<script setup lang="ts">
defineOptions({ name: 'PageOrganizerView' })
import { ref } from 'vue'
import { usePageOrganizerStore } from '../stores/usePageOrganizerStore'
import { usePdfRender } from '../composables/usePdfRender'
import { usePdfProcess } from '../composables/usePdfProcess'
import FileDropZone from '../components/shared/FileDropZone.vue'
import PdfThumbnail from '../components/viewer/PdfThumbnail.vue'
import PageToolbar from '../components/organizer/PageToolbar.vue'
import ProgressOverlay from '../components/shared/ProgressOverlay.vue'
import Toast from '../components/shared/Toast.vue'
import { formatFileSize } from '../services/file-utils'

const fileBuffer = ref<ArrayBuffer | null>(null)
const fileName = ref(''); const fileSize = ref(0); const hasFile = ref(false)

const pageStore = usePageOrganizerStore()
const { isRendering, progress: renderProgress, renderPdf } = usePdfRender()
const { isProcessing, progress: processProgress, progressMessage, exportPdf } = usePdfProcess()
const toast = ref<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

// ---- 框选 ----
const gridEl = ref<HTMLElement | null>(null)
const selecting = ref(false)
const selRect = ref({ left: 0, top: 0, width: 0, height: 0 })
const selStart = ref({ x: 0, y: 0 })

function showToast(msg: string, type: 'success' | 'error' | 'info' = 'info') { toast.value = { message: msg, type } }

async function handleFileSelected(file: File) {
  try {
    fileBuffer.value = await file.arrayBuffer(); fileName.value = file.name; fileSize.value = file.size; hasFile.value = true
    const thumbs = await renderPdf(file); pageStore.initPages(thumbs)
    showToast(`已加载 ${thumbs.length} 页`, 'success')
  } catch (err: any) { showToast(err.message || '加载失败', 'error'); handleReset() }
}

// ---- 框选实现 ----
function getGridOffset() {
  const r = gridEl.value!.getBoundingClientRect()
  return { left: r.left, top: r.top, scrollLeft: gridEl.value!.scrollLeft, scrollTop: gridEl.value!.scrollTop }
}

function onGridMouseDown(e: MouseEvent) {
  // 点在缩略图上 → 不启动框选
  if ((e.target as HTMLElement).closest('[data-thumb]')) return
  if (e.button !== 0) return // 只响应左键
  selecting.value = true
  const off = getGridOffset()
  selStart.value = { x: e.clientX - off.left + off.scrollLeft, y: e.clientY - off.top + off.scrollTop }
  selRect.value = { left: 0, top: 0, width: 0, height: 0 }
  e.preventDefault()
}

function onGridMouseMove(e: MouseEvent) {
  if (!selecting.value) return
  const off = getGridOffset()
  const x = e.clientX - off.left + off.scrollLeft; const y = e.clientY - off.top + off.scrollTop
  selRect.value = { left: Math.min(selStart.value.x, x), top: Math.min(selStart.value.y, y), width: Math.abs(x - selStart.value.x), height: Math.abs(y - selStart.value.y) }
}

function onGridMouseUp() {
  if (!selecting.value) return; selecting.value = false
  const r = selRect.value
  if (r.width < 8 && r.height < 8) { selRect.value = { left: 0, top: 0, width: 0, height: 0 }; return }

  const off = getGridOffset()
  const thumbs = gridEl.value!.querySelectorAll('[data-thumb]')

  thumbs.forEach(el => {
    const t = el.getBoundingClientRect()
    const tx = t.left - off.left + off.scrollLeft; const ty = t.top - off.top + off.scrollTop
    if (!(tx + t.width < r.left || tx > r.left + r.width || ty + t.height < r.top || ty > r.top + r.height)) {
      const idx = parseInt((el as HTMLElement).getAttribute('data-thumb') || '', 10)
      if (!isNaN(idx)) pageStore.pages[idx].selected = true
    }
  })
  selRect.value = { left: 0, top: 0, width: 0, height: 0 }
}

// ---- 页面操作 ----
function handleTogglePage(i: number) { pageStore.togglePage(i) }
function handleLongPress(i: number) { pageStore.selectMode = true; pageStore.togglePage(i) }
function handleSelectAll() { pageStore.selectAll() }
function handleDeselect() { pageStore.deselectAll() }
function handleInvert() { pageStore.invertSelection() }
function handleRotateCW() { pageStore.selectedPages.forEach(p => pageStore.rotatePageClockwise(pageStore.pages.indexOf(p))) }
function handleRotateCCW() { pageStore.selectedPages.forEach(p => pageStore.rotatePageCounterClockwise(pageStore.pages.indexOf(p))) }

async function handleExport() {
  if (!fileBuffer.value) { showToast('请先打开文件', 'error'); return }
  if (pageStore.selectedCount === 0) { showToast('至少保留一页', 'error'); return }
  try { await exportPdf(fileBuffer.value, pageStore.pages.map(p => ({ originalIndex: p.originalIndex, selected: p.selected })), fileName.value); showToast('导出成功', 'success') }
  catch (err: any) { showToast(err.message || '导出失败', 'error') }
}
function handleReset() { hasFile.value = false; fileBuffer.value = null; fileName.value = ''; fileSize.value = 0; pageStore.reset() }
</script>

<template>
  <div class="flex flex-col h-full">
    <div v-if="!hasFile" class="flex-1 flex items-center justify-center p-6">
      <div class="w-full max-w-md"><FileDropZone @file-selected="handleFileSelected" /></div>
    </div>

    <template v-else>
      <div v-if="isRendering" class="flex-1 flex flex-col items-center justify-center gap-4">
        <svg class="w-10 h-10 text-indigo-500 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"/>
          <path class="opacity-70" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
        <p class="text-[15px] text-[#888]">正在渲染缩略图...</p>
        <p class="text-xs text-[#bbb]">{{ renderProgress }}%</p>
      </div>

      <template v-else>
        <div class="flex items-center gap-3 px-5 py-3 border-b border-[#e8e8e6] bg-white">
          <span class="text-sm opacity-50">📄</span>
          <span class="text-sm font-medium text-[#333] truncate flex-1">{{ fileName }}</span>
          <span class="text-xs text-[#aaa]">{{ formatFileSize(fileSize) }}</span>
          <button class="px-3 py-1.5 text-xs rounded-xl text-[#999] hover:text-[#333] hover:bg-gray-50 transition-all" @click="handleReset">关闭</button>
        </div>

        <PageToolbar
          :selected-count="pageStore.selectedCount" :total-count="pageStore.totalPages"
          :all-selected="pageStore.allSelected" :disabled="isProcessing"
          @select-all="handleSelectAll" @deselect="handleDeselect" @invert="handleInvert"
          @rotate-cw="handleRotateCW" @rotate-ccw="handleRotateCCW" @export="handleExport"
        />

        <div ref="gridEl" class="flex-1 overflow-y-auto select-none"
          @mousedown="onGridMouseDown" @mousemove="onGridMouseMove" @mouseup="onGridMouseUp">
          <div class="grid gap-4 p-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            <PdfThumbnail
              v-for="(page, idx) in pageStore.pages" :key="page.originalIndex"
              :data-url="page.thumbnail" :page-number="page.originalIndex + 1"
              :selected="page.selected" :rotation="page.rotation"
              :select-mode="pageStore.selectMode" :thumb-index="idx"
              @click="handleTogglePage(idx)" @long-press="handleLongPress(idx)"
            />
          </div>
          <div v-if="selecting && (selRect.width > 4 || selRect.height > 4)"
            class="fixed pointer-events-none z-30 border border-indigo-400/60 bg-indigo-500/8 rounded-lg"
            :style="{ left: selRect.left + 'px', top: selRect.top + 'px', width: selRect.width + 'px', height: selRect.height + 'px' }" />
        </div>
      </template>
    </template>

    <ProgressOverlay :visible="isProcessing" :progress="processProgress" :message="progressMessage" />
    <Toast v-if="toast" :message="toast.message" :type="toast.type" @close="toast = null" />
  </div>
</template>
