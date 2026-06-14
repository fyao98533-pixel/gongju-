<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  dataUrl: string
  pageNumber: number
  selected: boolean
  rotation: number
  selectMode: boolean
  blankMarked?: boolean
  /** 显式绑定 data-thumb 到 DOM，用于框选命中检测 */
  thumbIndex?: number
}>()

const emit = defineEmits<{ click: []; 'long-press': [] }>()

const rotationStyle = computed(() =>
  props.rotation === 0 ? {} : { transform: `rotate(${props.rotation}deg)` }
)

let longPressTimer: ReturnType<typeof setTimeout> | null = null
function onTouchStart() { longPressTimer = setTimeout(() => emit('long-press'), 400) }
function onTouchEnd() { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null } }
</script>

<template>
  <div
    :data-thumb="thumbIndex"
    class="relative group cursor-pointer select-none rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
    :class="{
      'ring-2 ring-indigo-500 ring-offset-2 ring-offset-white': selected && !blankMarked,
      'ring-2 ring-red-400/70 ring-offset-2 ring-offset-white': blankMarked,
    }"
    @click="emit('click')"
    @touchstart.passive="onTouchStart"
    @touchend="onTouchEnd"
    @touchmove="onTouchEnd"
  >
    <div v-if="selected && !blankMarked" class="absolute inset-0 bg-indigo-500/10 z-10 pointer-events-none rounded-xl" />
    <div v-if="blankMarked" class="absolute inset-0 bg-red-500/8 z-10 pointer-events-none rounded-xl" />

    <div
      class="absolute top-2.5 left-2.5 z-20 transition-all duration-200"
      :class="selected || selectMode ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100'"
    >
      <div class="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors"
        :class="selected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 bg-white/80 backdrop-blur-sm'">
        <svg v-if="selected" xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </div>

    <div v-if="blankMarked" class="absolute top-2.5 right-2.5 z-20 px-2 py-0.5 rounded-lg bg-red-500/90 text-white text-[11px] font-semibold">空白</div>

    <div class="bg-white rounded-lg overflow-hidden shadow-md shadow-black/5" :style="rotationStyle">
      <img :src="dataUrl" :alt="`第 ${pageNumber} 页`" class="w-full h-auto block" loading="lazy" />
    </div>

    <div
      class="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 px-2.5 py-0.5 rounded-full text-white text-[11px] font-medium backdrop-blur-md"
      :class="blankMarked ? 'bg-red-500/80' : 'bg-black/40'"
    >
      {{ pageNumber }}
    </div>
  </div>
</template>
