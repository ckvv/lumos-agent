import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

// Electron Forge expects the main-process bundle to be emitted as main.js.
export default defineConfig({
  build: {
    lib: {
      entry: 'src/main/index.ts',
      fileName: () => 'main.js',
      formats: ['cjs'],
    },
    rollupOptions: {
      // 主进程保持 CJS，但让 Node 在运行时原生处理这个仅提供 ESM 导出的依赖。
      external: ['@mariozechner/pi-coding-agent'],
    },
  },
  resolve: {
    alias: {
      '#main': fileURLToPath(new URL('./src/main', import.meta.url)),
      '#preload': fileURLToPath(new URL('./src/preload', import.meta.url)),
      '#renderer': fileURLToPath(new URL('./src/renderer', import.meta.url)),
      '#shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
    },
  },
})
