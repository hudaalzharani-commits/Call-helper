import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const appDir = path.dirname(fileURLToPath(import.meta.url))

/** Always serve THIS folder — not the nested duplicate Call-helper-main/ subfolder. */
export default defineConfig({
  root: appDir,
  plugins: [react()],
  resolve: {
    alias: {
      '@': appDir,
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
