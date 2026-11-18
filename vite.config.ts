import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist/client', emptyOutDir: true },
  server: {
    host: true,
    port: 5173,
    // In dev the Worker (wrangler dev) runs on 8787; Vite proxies the WebSocket + API to it.
    proxy: {
      '/parties': { target: 'http://localhost:8787', ws: true },
      '/api': { target: 'http://localhost:8787' },
    },
  },
  test: { include: ['test/**/*.test.ts'] },
} as any);
