import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'organizer',
      component: () => import('../views/PageOrganizerView.vue'),
      meta: { title: '页面管理', icon: '📄' },
    },
    {
      path: '/blank',
      name: 'blank',
      component: () => import('../views/BlankDetectView.vue'),
      meta: { title: 'PDF 去空白', icon: '🔍' },
    },
    {
      path: '/word',
      name: 'word',
      component: () => import('../views/WordBlankView.vue'),
      meta: { title: 'Word 去空白', icon: '📝' },
    },
  ],
})

export default router
