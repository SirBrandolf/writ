import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const notesApiProxy = {
  '/notes': {
    target: 'http://localhost:5000',
    changeOrigin: true,
  },
} as const;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    allowedHosts: true,
    proxy: { ...notesApiProxy },
  },
  // `server.proxy` does not apply to `vite preview`; mirror here for production-style local/EC2 runs.
  preview: {
    port: 5175,
    allowedHosts: true,
    proxy: { ...notesApiProxy },
  },
})