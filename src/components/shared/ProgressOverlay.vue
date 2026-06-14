<script setup lang="ts">
defineProps<{ visible: boolean; progress: number; message?: string }>()
</script>

<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-md">
        <div class="bg-white border border-[#e8e8e6] rounded-3xl p-8 w-72 text-center shadow-xl shadow-black/5">
          <svg class="w-12 h-12 mx-auto text-indigo-500 animate-spin mb-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3.5"/>
            <path class="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <p class="text-[#555] font-medium mb-3 text-[15px]">{{ message || '处理中...' }}</p>
          <div class="w-full bg-gray-100 rounded-full h-1.5 mb-2 overflow-hidden">
            <div class="bg-indigo-500 h-1.5 rounded-full transition-all duration-500 ease-out" :style="{ width: `${Math.max(progress, 3)}%` }" />
          </div>
          <p class="text-[#bbb] text-xs">{{ progress }}%</p>
        </div>
      </div>
    </transition>
  </Teleport>
</template>
