import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../web-dist',
    emptyOutDir: true,
  },
  server: {
    // In dev mode, proxy /api calls to the Hono server (started via `npm run dev`)
    proxy: {
      '/api': 'http://127.0.0.1:3000',
    },
  },
});
