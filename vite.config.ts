import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // /auth/login itself must stay on Vite (the React login screen + HMR);
      // only the real backend auth endpoints are proxied.
      '/api': 'http://localhost:8000',
      '/mcp': 'http://localhost:8000',
    },
  },
})
