import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

// Keep the preload bundle name stable for BrowserWindow.preload.
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        assetFileNames: '[name].[ext]',
        chunkFileNames: '[name].js',
        entryFileNames: 'preload.js',
        format: 'cjs',
        inlineDynamicImports: true,
      },
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
