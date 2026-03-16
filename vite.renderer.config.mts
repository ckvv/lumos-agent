import { fileURLToPath, URL } from 'node:url'
import ui from '@nuxt/ui/vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { VueRouterAutoImports } from 'vue-router/unplugin'
import VueRouter from 'vue-router/vite'

export default defineConfig({
  plugins: [
    vue(),
    VueRouter({
      routesFolder: 'src/renderer/pages',
      importMode: 'sync',
    }),
    tailwindcss(),
    ui({
      autoImport: {
        imports: [VueRouterAutoImports, 'vue'],
      },
      components: {
        dirs: [
          'src/renderer/components',
          'src/renderer/layouts',
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '#main': fileURLToPath(new URL('./src/main', import.meta.url)),
      '#preload': fileURLToPath(new URL('./src/preload', import.meta.url)),
      '#renderer': fileURLToPath(new URL('./src/renderer', import.meta.url)),
      '#shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
    },
  },
})
