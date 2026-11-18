import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// base './' keeps the build relocatable: any sub-path on a web host, or Tauri's bundled assets.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  clearScreen: false,
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    // svg2pdf's CommonJS entry expects a global jsPDF; use its ES build like the browser bundle does.
    alias: { 'svg2pdf.js': fileURLToPath(new URL('./node_modules/svg2pdf.js/dist/svg2pdf.es.min.js', import.meta.url)) },
  },
});
