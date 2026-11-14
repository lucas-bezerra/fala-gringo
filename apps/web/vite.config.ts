import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { PREVIEW_HEADERS, securityHeaders } from './security-headers';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss(), securityHeaders()],
  build: {
    // Não embutir assets como data: URIs — a CSP (font-src 'self') os bloquearia.
    assetsInlineLimit: 0,
    rollupOptions: {
      // catalogo.html: catálogo interno dos componentes base (T4.1)
      input: { main: path.resolve(root, 'index.html'), catalogo: path.resolve(root, 'catalogo.html') },
    },
  },
  preview: {
    headers: PREVIEW_HEADERS,
  },
  resolve: {
    alias: {
      '@': path.resolve(root, 'src'),
    },
  },
});
