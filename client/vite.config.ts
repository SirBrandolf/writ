import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    allowedHosts: true,
    proxy: {
      '/notes': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})