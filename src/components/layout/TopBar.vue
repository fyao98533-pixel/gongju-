<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

defineProps<{ title: string; isMobile: boolean }>()
const route = useRoute()
const icon = computed(() => (route.meta?.icon as string) || '📑')
</script>

<template>
  <header class="h-13 flex items-center justify-between px-5 border-b border-[#e8e8e6] bg-white/80 backdrop-blur-xl flex-shrink-0">
    <div class="flex items-center gap-2.5">
      <span class="text-lg opacity-70">{{ icon }}</span>
      <h1 class="text-[15px] font-semibold text-[#1a1a1a] tracking-tight">{{ title }}</h1>
    </div>
    <div class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
