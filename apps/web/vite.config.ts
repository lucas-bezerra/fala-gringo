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
