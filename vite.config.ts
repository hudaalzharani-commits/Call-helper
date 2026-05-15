import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// المجلد الفعلي للواجهة (يحتوي إدارة المستخدمين، uiVisibility، وربط الـ API).
// الملفات في جذر المستودع بجانب هذا المجلد نسخة قديمة/مكررة — لا تُستخدم هنا.
const appRoot = path.resolve(__dirname, 'Call-helper-main');

// https://vitejs.dev/config/
export default defineConfig({
  root: appRoot,
  plugins: [react()],
  resolve: {
    alias: {
      '@': appRoot,
    },
  },
  server: {
    port: 3000,
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
