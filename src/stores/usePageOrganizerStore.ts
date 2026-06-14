/**
 * 页面管理状态 — 页面选中、排序、旋转
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { PageInfo } from '../types/pdf'

export const usePageOrganizerStore = defineStore('pageOrganizer', () => {
  const pages = ref<PageInfo[]>([])
  const selectMode = ref(false) // 是否处于选择模式（移动端长按进入）

  const totalPages = computed(() => pages.value.length)
  const selectedPages = computed(() => pages.value.filter((p) => p.selected))
  const selectedCount = computed(() => selectedPages.value.length)
  const allSelected = computed(
    () => pages.value.length > 0 && pages.value.every((p) => p.selected)
  )
  const hasSelected = computed(() => selectedCount.value > 0)

  function initPages(
    thumbnails: { dataUrl: string; width: number; height: number }[]
  ) {
    pages.value = thumbnails.map((t, i) => ({
      originalIndex: i,
      order: i,
      selected: true, // 默认全部选中（保留）
      rotation: 0,
      thumbnail: t.dataUrl,
      width: t.width,
      height: t.height,
    }))
  }

  function togglePage(index: number) {
    if (index >= 0 && index < pages.value.length) {
      pages.value[index].selected = !pages.value[index].selected
    }
  }

  function selectAll() {
    pages.value.forEach((p) => (p.selected = true))
  }

  function deselectAll() {
    pages.value.forEach((p) => (p.selected = false))
  }

  function invertSelection() {
    pages.value.forEach((p) => (p.selected = !p.selected))
  }

  function rotatePageClockwise(index: number) {
    if (index >= 0 && index < pages.value.length) {
      pages.value[index].rotation =
        (pages.value[index].rotation + 90) % 360
    }
  }

  function rotatePageCounterClockwise(index: number) {
    if (index >= 0 && index < pages.value.length) {
      pages.value[index].rotation =
        (pages.value[index].rotation + 270) % 360
    }
  }

  /** 获取选择的页面索引（用于删除/提取） */
  function getSelectedIndices(): number[] {
    return pages.value
      .filter((p) => !p.selected)
      .map((p) => p.originalIndex)
  }

  /** 获取提取的页面索引 */
  function getExtractIndices(): number[] {
    return pages.value
      .filter((p) => p.selected)
      .map((p) => p.originalIndex)
  }

  /** 更新页面顺序（拖拽排序后调用） */
  function updateOrder(newOrder: PageInfo[]) {
    pages.value = newOrder.map((p, i) => ({ ...p, order: i }))
  }

  function reset() {
    pages.value = []
    selectMode.value = false
  }

  return {
    pages,
    selectMode,
    totalPages,
    selectedPages,
    selectedCount,
    allSelected,
    hasSelected,
    initPages,
    togglePage,
    selectAll,
    deselectAll,
    invertSelection,
    rotatePageClockwise,
    rotatePageCounterClockwise,
    getSelectedIndices,
    getExtractIndices,
    updateOrder,
    reset,
  }
})
