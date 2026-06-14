import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
          dest: '.',
        },
      ],
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '文件处理器',
        short_name: '文件处理',
        description: '免费、离线的文件处理器 — PDF 页面管理、去空白、合并拆分，Word 去空白',
        theme_color: '#6366f1',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'any',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
    }),
  ],
  worker: {
    format: 'es',
  },
})
