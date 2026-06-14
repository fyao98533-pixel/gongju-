<script setup lang="ts">
import { useRoute } from 'vue-router'

defineProps<{ items: { to: string; label: string; icon: string }[] }>()
const route = useRoute()
</script>

<template>
  <nav
    class="h-[72px] flex items-center justify-around border-t border-[#e8e8e6] bg-white/80 backdrop-blur-xl flex-shrink-0"
    style="padding-bottom: env(safe-area-inset-bottom, 0px)"
  >
    <router-link
      v-for="item in items" :key="item.to" :to="item.to"
      class="flex flex-col items-center justify-center gap-1 min-w-0 px-3 py-1.5 rounded-2xl transition-all duration-200 touch-manipulation"
      :class="route.path === item.to ? 'text-indigo-600 scale-105' : 'text-[#999] active:scale-95'"
    >
      <span class="text-xl">{{ item.icon }}</span>
      <span class="text-[10px] font-medium tracking-wide">{{ item.label }}</span>
    </router-link>
  </nav>
</template>
