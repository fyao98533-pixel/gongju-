<script setup lang="ts">
defineOptions({ name: 'ConvertView' })
import { ref, onMounted } from 'vue'
import FileDropZone from '../components/shared/FileDropZone.vue'
import ProgressOverlay from '../components/shared/ProgressOverlay.vue'
import Toast from '../components/shared/Toast.vue'
import { formatFileSize } from '../services/file-utils'

// ----- 转换服务状态 -----
const serverAvailable = ref<boolean | null>(null) // null=检测中
const serverVersion = ref('')
const serverUrl = 'http://localhost:3001'

// ----- 当前选中的模式和文件 -----
type ConvertMode = 'pdf-to-docx' | 'docx-to-pdf' | 'doc-to-pdf'
const mode = ref<ConvertMode>('pdf-to-docx')
const file = ref<File | null>(null)
const isProcessing = ref(false)
const processMessage = ref('')
const toast = ref<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

const modes: { key: ConvertMode; label: string; accept: string; desc: string }[] = [
  { key: 'pdf-to-docx', label: 'PDF → Word', accept: '.pdf', desc: '上传 PDF，转为 .docx' },
  { key: 'docx-to-pdf', label: 'Word → PDF', accept: '.docx', desc: '上传 .docx，转为 PDF' },
  { key: 'doc-to-pdf', label: 'Word(.doc) → PDF', accept: '.doc', desc: '上传 .doc，转为 PDF' },
]

function showToast(msg: string, type: 'success' | 'error' | 'info' = 'info') {
  toast.value = { message: msg, type }
}

// ----- 检测 LibreOffice 服务 -----
async function checkServer() {
  serverAvailable.value = null
  try {
    const res = await fetch(`${serverUrl}/health`, { signal: AbortSignal.timeout(3000) })
    const data = await res.json()
    serverAvailable.value = data.available
    if (data.available) serverVersion.value = data.version
  } catch {
    serverAvailable.value = false
  }
}

onMounted(checkServer)

// ----- 文件处理 -----
function handleFileSelected(f: File) {
  const current = modes.find(m => m.key === mode.value)
  const ext = '.' + f.name.split('.').pop()?.toLowerCase()
  const expected = current?.accept
  if (expected && !expected.split(',').some((e: string) => ext === e.trim())) {
    showToast(`请上传 ${expected} 格式的文件`, 'error')
    return
  }
  file.value = f
}

// ----- 执行转换 -----
async function handleConvert() {
  if (!file.value) { showToast('请先选择文件', 'error'); return }
  if (!serverAvailable.value) { showToast('LibreOffice 服务未启动', 'error'); return }

  isProcessing.value = true
  processMessage.value = '正在转换（大文件可能需要几十秒）...'

  try {
    const formData = new FormData()
    formData.append('file', file.value)
    formData.append('mode', mode.value)

    const res = await fetch(`${serverUrl}/convert`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(180000),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: '转换失败' }))
      throw new Error(err.error || `服务器错误: ${res.status}`)
    }

    const blob = await res.blob()
    const disposition = res.headers.get('Content-Disposition')
    let filename = file.value.name.replace(/\.[^.]+$/, '')
    const targetExt = mode.value.split('-').pop()
    filename += '.' + targetExt

    if (disposition) {
      const match = disposition.match(/filename="?([^"]+)"?/)
      if (match) filename = decodeURIComponent(match[1])
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)

    showToast('转换完成，文件已下载！', 'success')
  } catch (err: any) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      showToast('转换超时，文件可能较大，请重试', 'error')
    } else {
      showToast(err.message || '转换失败', 'error')
    }
  } finally {
    isProcessing.value = false
  }
}

function handleReset() {
  file.value = null
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- 服务状态 -->
    <div
      class="px-4 py-3 border-b text-sm flex items-center gap-2"
      :class="{
        'bg-emerald-500/10 border-emerald-500/30 text-emerald-300': serverAvailable === true,
        'bg-red-500/10 border-red-500/30 text-red-300': serverAvailable === false,
        'bg-slate-800/30 border-slate-700/30 text-slate-400': serverAvailable === null,
      }"
    >
      <span class="w-2 h-2 rounded-full"
        :class="{
          'bg-emerald-400 animate-pulse': serverAvailable === true,
          'bg-red-400': serverAvailable === false,
          'bg-slate-500 animate-pulse': serverAvailable === null,
        }"
      />
      <template v-if="serverAvailable === true">
        LibreOffice 已连接
        <span class="text-xs opacity-70 ml-auto">{{ serverVersion }}</span>
      </template>
      <template v-else-if="serverAvailable === false">
        转换服务未启动 ·
        <button class="underline underline-offset-2 hover:text-white" @click="checkServer">重试</button>
      </template>
      <template v-else>正在检测转换服务...</template>
    </div>

    <!-- 未安装提示 -->
    <div v-if="serverAvailable === false" class="px-4 py-6 border-b border-slate-800">
      <div class="bg-slate-800/50 rounded-xl p-4 space-y-2 text-sm">
        <p class="text-slate-200 font-medium">📥 如何启动转换服务</p>
        <ol class="text-slate-400 space-y-1 list-decimal list-inside">
          <li>从 <a href="https://www.libreoffice.org/download/" target="_blank" class="text-primary-400 underline">libreoffice.org</a> 下载安装 LibreOffice（免费）</li>
          <li>在本项目目录运行：
            <code class="px-2 py-0.5 bg-slate-700 rounded text-primary-300 text-xs ml-1">npm run convert-server</code>
          </li>
          <li>看到 "运行在 http://localhost:3001" 后刷新本页面</li>
        </ol>
      </div>
    </div>

    <!-- 转换模式选择 -->
    <div class="flex border-b border-slate-800">
      <button
        v-for="m in modes" :key="m.key"
        class="flex-1 py-3 text-sm font-medium transition-colors relative"
        :class="mode === m.key ? 'text-primary-300' : 'text-slate-500 hover:text-slate-300'"
        @click="mode = m.key; file = null"
      >
        {{ m.label }}
        <div v-if="mode === m.key" class="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary-500 rounded-full" />
      </button>
    </div>

    <!-- 主体 -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="!file" class="flex items-center justify-center p-6 min-h-[300px]">
        <div class="w-full max-w-md">
          <p class="text-center text-slate-400 text-sm mb-4">
            {{ modes.find(m => m.key === mode)?.desc }}
          </p>
          <FileDropZone @file-selected="handleFileSelected" />
        </div>
      </div>

      <div v-else class="p-4 space-y-4">
        <div class="flex items-center gap-3 px-4 py-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <span class="text-2xl">📄</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-slate-200 truncate">{{ file.name }}</p>
            <p class="text-xs text-slate-500">{{ formatFileSize(file.size) }}</p>
          </div>
          <button class="px-3 py-1 text-xs rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700" @click="handleReset">取消</button>
        </div>

        <div class="flex items-center gap-3 text-sm text-slate-400 justify-center py-2">
          <span>{{ file.name.split('.').pop()?.toUpperCase() }}</span>
          <span>→</span>
          <span class="text-primary-400 font-medium">{{ mode.split('-').pop()?.toUpperCase() }}</span>
        </div>

        <button
          class="w-full py-3 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 disabled:opacity-40 transition-colors"
          :disabled="isProcessing || !serverAvailable"
          @click="handleConvert"
        >
          {{ isProcessing ? '转换中...' : '开始转换' }}
        </button>
      </div>
    </div>

    <ProgressOverlay :visible="isProcessing" :progress="0" :message="processMessage" />
    <Toast v-if="toast" :message="toast.message" :type="toast.type" @close="toast = null" />
  </div>
</template>
