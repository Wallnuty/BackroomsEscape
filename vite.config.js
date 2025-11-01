import { defineConfig } from 'vite'

export default defineConfig({
  base: '/home/sbackroomsescape/',
  build: {
    outDir: 'public_html',
    assetsDir: 'assets',
    emptyOutDir: true,
    copyPublicDir: true
  },
  server: {
    port: 5173
  },
  publicDir: 'public'
})