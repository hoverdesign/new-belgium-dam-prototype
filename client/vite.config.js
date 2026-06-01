import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/assets': 'http://localhost:3000',
      '/auth': 'http://localhost:3000',
      '/admin/upload': 'http://localhost:3000',
      '/admin/upload-asset': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
      '/images': 'http://localhost:3000'
    }
  }
})
