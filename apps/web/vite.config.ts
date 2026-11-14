import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { PREVIEW_HEADERS, securityHeaders } from './security-headers';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    securityHeaders(),
    // PWA (T4.8): app instalável e offline. Registro feito no código (src/app/pwa.ts), sem script inline (CSP).
    VitePWA({
      injectRegister: false,
      registerType: 'prompt',
      manifest: {
        name: 'FalaGringo — Como pronunciar',
        short_name: 'FalaGringo',
        description: 'Como pronunciar palavras estrangeiras, na grafia do português do Brasil.',
        lang: 'pt-BR',
        start_url: '.',
        display: 'standalone',
        background_color: '#f5f6f8',
        theme_color: '#1d4ed8',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // app shell inteiro no cache na instalação; os dicionários ficam de fora (dezenas de MB)
        globPatterns: ['**/*.{js,css,html,woff2,png,webmanifest}'],
        // subconjuntos de fonte sem uso (o IPA precisa de latin, latin-ext e greek: θ, β, χ)
        globIgnores: [
          'dict/**',
          'catalogo.html',
          'assets/catalogo-*',
          'assets/*-{cyrillic,cyrillic-ext,vietnamese,greek-ext}-*.woff2',
        ],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/\/dict\//, /catalogo\.html/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // sem hash no nome: rede primeiro, cache se offline
            urlPattern: /\/dict\/manifest\.json$/,
            handler: 'NetworkFirst',
            options: { cacheName: 'fg-dict-manifest', networkTimeoutSeconds: 4 },
          },
          {
            // shards e léxico (com hash): cache primeiro. É o mesmo cache que a página "Uso offline" enche.
            urlPattern: /\/dict\/.+\.(json|txt)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'fg-dict', cacheableResponse: { statuses: [200] } },
          },
        ],
      },
    }),
  ],
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
