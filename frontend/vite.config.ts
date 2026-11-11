import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import templateCompilerOptions from '@tresjs/core/template-compiler-options'
import path from 'path'

export default defineConfig({
  plugins: [
    vue({
      ...templateCompilerOptions,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['three'],
  },
})
