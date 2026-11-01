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
      // Zod 4.6.7 ships two comments that Rollup removes because their annotation
      // position is invalid. There is no upstream fix yet; filter only those two
      // files and re-check after a Zod or Rollup upgrade.
      onwarn(warning, warn) {
        const knownZodAnnotationFiles = ['zod/v4/core/util.js', 'zod/v4/core/regexes.js']
        const id = warning.id?.replaceAll('\\', '/')
        const isKnownZodAnnotation =
          warning.code === 'INVALID_ANNOTATION' &&
          id !== undefined &&
          knownZodAnnotationFiles.some((file) => id.endsWith(file))

        if (isKnownZodAnnotation) return
        warn(warning)
      },
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query', '@tanstack/react-table'],
          'forms-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'auth-vendor': ['better-auth'],
          'icons-vendor': ['lucide-react'],
          'config-vendor': ['@casesync/config'],
          'ui-vendor': ['class-variance-authority', 'clsx', 'tailwind-merge'],
        },
      },
    },
  },
})
