<script setup lang="ts">
import PdfThumbnail from './PdfThumbnail.vue'
import type { PageInfo } from '../../types/pdf'

defineProps<{
  pages: PageInfo[]
  selectMode: boolean
}>()

const emit = defineEmits<{
  'toggle-page': [index: number]
  'long-press': [index: number]
}>()
</script>

<template>
  <div
    class="grid gap-3 p-4"
    :class="{
      'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6':
        true,
    }"
  >
    <PdfThumbnail
      v-for="(page, index) in pages"
      :key="page.originalIndex"
      :data-url="page.thumbnail"
      :page-number="page.originalIndex + 1"
      :selected="page.selected"
      :rotation="page.rotation"
      :select-mode="selectMode"
      @click="emit('toggle-page', index)"
      @long-press="emit('long-press', index)"
    />
  </div>

  <!-- 空状态 -->
  <div
    v-if="pages.length === 0"
    class="flex flex-col items-center justify-center py-20 text-slate-500"
  >
    <span class="text-6xl mb-4">📭</span>
    <p class="text-lg font-medium">暂无页面</p>
    <p class="text-sm mt-1">请先上传 PDF 文件</p>
  </div>
</template>
