<script setup lang="ts">
import { ref } from 'vue'
import { useDragDrop } from '../../composables/useDragDrop'

const props = withDefaults(defineProps<{ accept?: string; label?: string }>(), {
  accept: '.pdf,application/pdf',
  label: 'PDF',
})

const emit = defineEmits<{ 'file-selected': [file: File] }>()

const { isDragging, onDragEnter, onDragLeave, onDragOver, onDrop } = useDragDrop()
const fileInput = ref<HTMLInputElement | null>(null)
const localError = ref<string | null>(null)

function handleDrop(e: DragEvent) {
  const result = onDrop(e)
  if (result && result.files.length > 0) { localError.value = null; emit('file-selected', result.files[0]) }
}

function handleFileInput(e: Event) {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0) return
  localError.value = null; emit('file-selected', files[0]); target.value = ''
}
</script>

<template>
  <div
    class="relative w-full"
    @dragenter="onDragEnter" @dragleave="onDragLeave" @dragover="onDragOver" @drop="handleDrop"
  >
    <div
      v-if="isDragging"
      class="fixed inset-0 z-50 bg-indigo-500/8 border-2 border-dashed border-indigo-400/50 rounded-3xl flex items-center justify-center pointer-events-none backdrop-blur-sm"
    >
      <div class="text-center">
        <span class="text-6xl block mb-4 animate-bounce">📂</span>
        <p class="text-xl font-semibold text-[#1a1a1a]">松开以上传</p>
      </div>
    </div>

    <button
      class="w-full flex flex-col items-center justify-center gap-4 py-14 px-6 border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer group bg-white"
      :class="isDragging
        ? 'border-indigo-400/60 scale-[1.02] shadow-lg shadow-indigo-500/5'
        : 'border-[#e0e0de] hover:border-[#ccc] hover:shadow-md'"
      @click="fileInput?.click()"
    >
      <div class="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300 shadow-sm">
        📄
      </div>
      <div class="text-center space-y-1">
        <p class="text-[15px] font-medium text-[#555]">
          拖拽或点击上传{{ label }}文件
        </p>
        <p class="text-xs text-[#bbb]">所有处理在本地完成 · 文件不会上传</p>
      </div>
    </button>

    <p v-if="localError" class="mt-3 text-sm text-red-500 text-center">{{ localError }}</p>

    <input ref="fileInput" type="file" :accept="props.accept" class="file-input-hidden" @change="handleFileInput" />
  </div>
</template>
