<script setup lang="ts">
defineProps<{ selectedCount: number; totalCount: number; allSelected: boolean; disabled: boolean }>()
const emit = defineEmits<{ 'select-all': []; deselect: []; invert: []; 'rotate-cw': []; 'rotate-ccw': []; export: [] }>()
</script>

<template>
  <div class="flex items-center gap-1.5 px-4 py-3 border-b border-[#e8e8e6] bg-white/60 backdrop-blur-sm overflow-x-auto">
    <button
      class="flex-shrink-0 px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all duration-200"
      :class="allSelected ? 'bg-gray-100 text-[#555] hover:bg-gray-200' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'"
      :disabled="disabled" @click="allSelected ? emit('deselect') : emit('select-all')"
    >{{ allSelected ? '取消' : '全选' }}</button>
    <button
      class="flex-shrink-0 px-3.5 py-1.5 text-xs font-medium rounded-xl bg-gray-50 text-[#666] hover:bg-gray-100 transition-all duration-200"
      :disabled="disabled" @click="emit('invert')"
    >反选</button>

    <div class="w-px h-4 bg-[#e8e8e6] flex-shrink-0 mx-1" />

    <button
      class="flex-shrink-0 px-3.5 py-1.5 text-xs font-medium rounded-xl bg-gray-50 text-[#666] hover:bg-gray-100 transition-all duration-200 disabled:opacity-30"
      :disabled="disabled || selectedCount === 0" @click="emit('rotate-ccw')"
    >↺ 左转</button>
    <button
      class="flex-shrink-0 px-3.5 py-1.5 text-xs font-medium rounded-xl bg-gray-50 text-[#666] hover:bg-gray-100 transition-all duration-200 disabled:opacity-30"
      :disabled="disabled || selectedCount === 0" @click="emit('rotate-cw')"
    >↻ 右转</button>

    <span class="flex-shrink-0 text-xs text-[#aaa] ml-2">{{ selectedCount }}/{{ totalCount }}</span>

    <div class="flex-1" />
    <button
      class="flex-shrink-0 px-5 py-2 text-sm font-semibold rounded-xl bg-indigo-500 text-white hover:bg-indigo-400 transition-all duration-200 disabled:opacity-30 active:scale-95 shadow-sm shadow-indigo-500/20"
      :disabled="disabled || selectedCount === 0" @click="emit('export')"
    >导出</button>
  </div>
</template>
