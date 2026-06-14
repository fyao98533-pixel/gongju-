<script setup lang="ts">
defineOptions({ name: 'WordBlankView' })
import { ref, computed } from 'vue'
import JSZip from 'jszip'
import FileDropZone from '../components/shared/FileDropZone.vue'
import ProgressOverlay from '../components/shared/ProgressOverlay.vue'
import Toast from '../components/shared/Toast.vue'
import { formatFileSize } from '../services/file-utils'

const fileBuffer = ref<ArrayBuffer | null>(null)
const fileName = ref(''); const fileSize = ref(0); const hasFile = ref(false)

interface BlankIssue { type: string; description: string; removeIndices: number[] }
const issues = ref<BlankIssue[]>([])
const paragraphCount = ref(0)
const isProcessing = ref(false); const processMessage = ref('')
const toast = ref<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
const hasIssues = computed(() => issues.value.length > 0)

function showToast(msg: string, type: 'success' | 'error' | 'info' = 'info') { toast.value = { message: msg, type } }
function isDocx(f: File) { return f.name.toLowerCase().endsWith('.docx') || f.type.includes('wordprocessingml') }

async function handleFileSelected(file: File) {
  if (!isDocx(file)) { showToast('请上传 .docx 文件', 'error'); return }
  fileBuffer.value = await file.arrayBuffer(); fileName.value = file.name; fileSize.value = file.size; hasFile.value = true
  issues.value = []; paragraphCount.value = 0
}

async function analyzeDocument() {
  if (!fileBuffer.value) { showToast('请先打开文件', 'error'); return }
  isProcessing.value = true; issues.value = []
  try {
    const zip = await JSZip.loadAsync(fileBuffer.value)
    const xml = await zip.file('word/document.xml')?.async('string')
    if (!xml) throw new Error('无法读取文档')
    const xd = new DOMParser().parseFromString(xml, 'text/xml')
    const body = xd.getElementsByTagName('w:body')[0]
    if (!body) throw new Error('无法解析文档')
    const ps = Array.from(body.getElementsByTagName('w:p')); paragraphCount.value = ps.length
    const findings: BlankIssue[] = []

    for (let i = 0; i < ps.length; i++) {
      let isEmpty = true; let hasPageBreak = false
      for (const r of Array.from(ps[i].getElementsByTagName('w:r'))) {
        for (const t of Array.from(r.getElementsByTagName('w:t'))) { if (t.textContent?.trim()) isEmpty = false }
        for (const br of Array.from(r.getElementsByTagName('w:br'))) { if (br.getAttribute('w:type') === 'page') hasPageBreak = true }
      }
      if (hasPageBreak && isEmpty && i + 1 < ps.length) {
        let nextBreak = false
        for (const r of Array.from(ps[i + 1].getElementsByTagName('w:r'))) {
          for (const br of Array.from(r.getElementsByTagName('w:br'))) { if (br.getAttribute('w:type') === 'page') nextBreak = true }
        }
        if (nextBreak) findings.push({ type: 'consecutive-breaks', description: `第 ${i + 1} 段：连续分页符`, removeIndices: [i] })
      }
      if (isEmpty && hasPageBreak) findings.push({ type: 'empty-before-break', description: `第 ${i + 1} 段：空白+分页符`, removeIndices: [i] })
    }
    const trailing: number[] = []
    for (let i = ps.length - 1; i >= 0; i--) {
      let allEmpty = true
      for (const r of Array.from(ps[i].getElementsByTagName('w:r'))) {
        for (const t of Array.from(r.getElementsByTagName('w:t'))) { if (t.textContent?.trim()) allEmpty = false }
        if (r.getElementsByTagName('w:br').length > 0) allEmpty = false
      }
      if (allEmpty) trailing.push(i); else break
    }
    if (trailing.length > 0) findings.push({ type: 'trailing-empty', description: `末尾 ${trailing.length} 个空段`, removeIndices: trailing })

    issues.value = findings
    showToast(findings.length === 0 ? '未发现空白页问题' : `发现 ${findings.length} 处问题`, findings.length === 0 ? 'success' : 'info')
  } catch (err: any) { showToast(err.message || '分析失败', 'error') }
  finally { isProcessing.value = false }
}

async function cleanAndExport() {
  if (!fileBuffer.value) return
  const all = new Set<number>(); issues.value.forEach(i => i.removeIndices.forEach(j => all.add(j)))
  isProcessing.value = true; processMessage.value = '正在清理...'
  try {
    const zip = await JSZip.loadAsync(fileBuffer.value)
    const xml = await zip.file('word/document.xml')?.async('string')
    const xd = new DOMParser().parseFromString(xml!, 'text/xml')
    const ps = Array.from(xd.getElementsByTagName('w:body')[0].getElementsByTagName('w:p'))
    Array.from(all).sort((a, b) => b - a).forEach(i => { if (i < ps.length) ps[i].parentNode?.removeChild(ps[i]) })
    zip.file('word/document.xml', new XMLSerializer().serializeToString(xd))
    const buf = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
    const base = fileName.value.replace(/\.docx$/i, '')
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${base}_去空白.docx`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    showToast('已清理并下载', 'success')
  } catch (err: any) { showToast(err.message || '清理失败', 'error') }
  finally { isProcessing.value = false }
}

function handleReset() { hasFile.value = false; fileBuffer.value = null; fileName.value = ''; issues.value = []; paragraphCount.value = 0 }
</script>

<template>
  <div class="flex flex-col h-full">
    <div v-if="!hasFile" class="flex-1 flex items-center justify-center p-6">
      <div class="w-full max-w-md space-y-4">
        <FileDropZone accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" label="Word" @file-selected="handleFileSelected" />
        <p class="text-center text-xs text-[#bbb]">支持 .docx 格式 · 本地处理，文件不上传</p>
      </div>
    </div>

    <template v-else>
      <div class="flex items-center gap-3 px-5 py-3 border-b border-[#e8e8e6] bg-white">
        <span class="text-sm opacity-50">📝</span>
        <span class="text-sm font-medium text-[#333] truncate flex-1">{{ fileName }}</span>
        <span class="text-xs text-[#aaa]">{{ formatFileSize(fileSize) }}</span>
        <button class="px-3 py-1.5 text-xs rounded-xl text-[#999] hover:text-[#333] hover:bg-gray-50 transition-all" @click="handleReset">关闭</button>
      </div>

      <div class="px-5 py-5 border-b border-[#e8e8e6] bg-white space-y-3">
        <p class="text-sm text-[#888]">Word 中的空白页由连续分页符、空白段+分页符、末尾空段导致</p>
        <button class="w-full py-3 rounded-2xl bg-indigo-500 text-white font-semibold hover:bg-indigo-400 disabled:opacity-30 transition-all active:scale-[0.98] shadow-sm shadow-indigo-500/20" :disabled="isProcessing" @click="analyzeDocument">
          {{ issues.length > 0 ? '重新分析' : '开始分析' }}
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-5">
        <div v-if="issues.length > 0" class="space-y-2.5">
          <p class="text-xs text-[#aaa] mb-2">共 {{ paragraphCount }} 段 · 发现 {{ issues.length }} 处问题</p>
          <div v-for="(issue, i) in issues" :key="i"
            class="px-4 py-3.5 rounded-2xl border transition-all bg-white"
            :class="issue.type === 'trailing-empty' ? 'border-amber-200' : 'border-red-200'">
            <div class="flex items-start gap-3">
              <span class="text-base mt-0.5">{{ issue.type === 'trailing-empty' ? '📭' : '⬜' }}</span>
              <div>
                <p class="text-sm text-[#444]">{{ issue.description }}</p>
                <p class="text-xs text-[#aaa] mt-1">
                  {{ issue.type === 'consecutive-breaks' ? '删除多余分页符' : issue.type === 'empty-before-break' ? '删除空白段及分页符' : '删除末尾多余空段' }}
                  · {{ issue.removeIndices.length }} 处
                </p>
              </div>
            </div>
          </div>
        </div>
        <div v-else-if="paragraphCount > 0" class="text-center py-20">
          <span class="text-5xl block mb-4">✅</span>
          <p class="text-[#888]">未发现空白页问题</p>
          <p class="text-xs text-[#bbb] mt-2">共 {{ paragraphCount }} 段</p>
        </div>
        <div v-else class="text-center py-20">
          <span class="text-5xl block mb-4 opacity-20">🔍</span>
          <p class="text-[#ccc]">点击"开始分析"扫描</p>
        </div>
      </div>

      <div v-if="hasIssues" class="p-5 border-t border-[#e8e8e6] bg-white">
        <button class="w-full py-3.5 rounded-2xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 disabled:opacity-30 transition-all active:scale-[0.98] text-[15px] shadow-sm shadow-emerald-500/20" :disabled="isProcessing" @click="cleanAndExport">
          一键清理并导出
        </button>
      </div>
    </template>

    <ProgressOverlay :visible="isProcessing" :progress="0" :message="processMessage" />
    <Toast v-if="toast" :message="toast.message" :type="toast.type" @close="toast = null" />
  </div>
</template>
