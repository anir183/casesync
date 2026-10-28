import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '#': path.resolve(__dirname, './src'),
      '@casesync/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
      '@casesync/utils': path.resolve(__dirname, '../../packages/utils/src/index.ts'),
      '@casesync/config': path.resolve(__dirname, '../../packages/config/src/index.ts'),
    },
  },
  server: {
    port: 5173,
  },
})
