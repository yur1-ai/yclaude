import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../dist/web',
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    // In dev mode, proxy /api calls to the Hono server (started via `npm run dev`)
    proxy: {
      '/api': 'http://127.0.0.1:3000',
    },
  },
});
