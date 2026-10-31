import path from 'node:path'
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
    // Never drift to 5174: CORS_ORIGIN and Better Auth trusted origins are validated
    // against this exact dev origin.
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query', '@tanstack/react-table'],
          'forms-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
      },
    },
  },
})
