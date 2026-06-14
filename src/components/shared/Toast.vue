<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ message: string; type?: 'success' | 'error' | 'info'; duration?: number }>()
const emit = defineEmits<{ close: [] }>()
const visible = ref(true)

watch(() => props.message, () => {
  visible.value = true
  if (props.duration !== 0) { setTimeout(() => { visible.value = false; setTimeout(() => emit('close'), 200) }, props.duration || 2800) }
}, { immediate: true })
</script>

<template>
  <Teleport to="body">
    <transition name="toast">
      <div v-if="visible"
        class="fixed top-16 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-2xl shadow-xl backdrop-blur-xl text-sm font-medium max-w-xs text-center"
        :class="{
          'bg-emerald-500 text-white shadow-emerald-500/20': type === 'success',
          'bg-red-500 text-white shadow-red-500/20': type === 'error',
          'bg-white text-[#333] border border-[#e8e8e6] shadow-black/5': type === 'info' || !type,
        }"
      >{{ message }}</div>
    </transition>
  </Teleport>
</template>

<style scoped>
.toast-enter-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from { opacity: 0; transform: translate(-50%, -16px) scale(0.95); }
.toast-leave-to { opacity: 0; transform: translate(-50%, -8px) scale(0.97); }
</style>
