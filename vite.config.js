import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    // Pair CSS with each lazy-loaded page chunk instead of one giant file
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Vite 8 (Rolldown) requires manualChunks as a function.
        // Separate vendor libraries into long-term-cacheable chunks.
        // When only app code changes, browsers re-download only the
        // small app chunk — not the larger vendor libraries.
        manualChunks(id) {
          if (id.includes('node_modules/react-router-dom') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react/')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/firebase/') ||
              id.includes('node_modules/@firebase/')) {
            return 'vendor-firebase'
          }
        },
      },
    },
  },
})

