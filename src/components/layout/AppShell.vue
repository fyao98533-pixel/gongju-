<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import TopBar from './TopBar.vue'
import BottomNav from './BottomNav.vue'

const route = useRoute()
const isMobile = ref(window.innerWidth < 768)
window.addEventListener('resize', () => { isMobile.value = window.innerWidth < 768 })

const pageTitle = computed(() => (route.meta?.title as string) || '文件处理器')

const navItems = [
  { to: '/', label: '页面管理', icon: '📄' },
  { to: '/blank', label: 'PDF 去空白', icon: '🔍' },
  { to: '/word', label: 'Word 去空白', icon: '📝' },
]
</script>

<template>
  <div class="flex flex-col h-full bg-[#f5f5f4]">
    <TopBar :title="pageTitle" :is-mobile="isMobile" />

    <div class="flex flex-1 overflow-hidden">
      <aside
        v-if="!isMobile"
        class="w-52 flex-shrink-0 border-r border-[#e8e8e6] bg-white flex flex-col py-6"
      >
        <nav class="flex flex-col gap-0.5 px-3">
          <router-link
            v-for="item in navItems" :key="item.to" :to="item.to"
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200"
            :class="route.path === item.to
              ? 'bg-indigo-50 text-indigo-600'
              : 'text-[#888] hover:text-[#333] hover:bg-gray-50'"
          >
            <span class="text-lg">{{ item.icon }}</span>
            {{ item.label }}
          </router-link>
        </nav>
        <div class="mt-auto px-5">
          <p class="text-xs text-[#bbb] text-center leading-relaxed">
            所有处理在本地完成<br />文件不会上传到服务器
          </p>
        </div>
      </aside>

      <main class="flex-1 overflow-y-auto bg-[#fafaf9]">
        <router-view v-slot="{ Component }">
          <keep-alive :max="10">
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </main>
    </div>

    <BottomNav v-if="isMobile" :items="navItems" />
  </div>
</template>
