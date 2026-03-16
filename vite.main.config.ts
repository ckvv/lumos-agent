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
