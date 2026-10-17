/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const BACKEND = process.env.TW_BACKEND ?? 'http://localhost:8100';
// Strict CSP, only in the production build (the dev server needs inline scripts for hot reload).
// frame-ancestors cannot be set in a <meta> tag: nginx must send it as a header.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

// Admin and doctor code is built into its own folder, so the service worker can leave it out
// (members never download it). Rule is by FOLDER: src/features/admin/** and src/features/doctor/**.
// A chunk belongs to an area when its entry page is in that folder (helpers only that page uses, like
// lib/useFileBlob or api/doctor, get bundled into it), or when every one of its own modules is.
const AREA_FOLDERS = ['admin', 'doctor'] as const;

function chunkArea(chunk: { facadeModuleId: string | null; moduleIds: readonly string[] }): string | null {
  const norm = (id: string) => id.replaceAll('\\', '/');
  const own = chunk.moduleIds.map(norm).filter((id) => !id.includes('/node_modules/'));
  for (const area of AREA_FOLDERS) {
    const dir = `/src/features/${area}/`;
    if (chunk.facadeModuleId && norm(chunk.facadeModuleId).includes(dir)) return area;
    if (own.length > 0 && own.every((id) => id.includes(dir))) return area;
  }
  return null;
}

function prodCsp(): Plugin {
  return {
    name: 'treeway-prod-csp',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
        injectTo: 'head-prepend',
      },
    ],
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    prodCsp(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeManifestIcons: false,
      manifest: {
        name: 'Treeway',
        short_name: 'Treeway',
        description: 'Treeway member app',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F3F6F1',
        theme_color: '#1E5E2A',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Static files only. API responses are NEVER cached (money must always be fresh).
        globPatterns: ['**/*.{js,css,html,svg,png,webp,ico}', '**/*-latin-*-normal*.woff2'],
        globIgnores: [
          '**/*-latin-ext-*',
          // Install icons are fetched by the browser only when installing; no need to precache them.
          'icons/icon-*.png',
          'icons/maskable-*.png',
          'icons/apple-touch-icon.png',
          'icons/logo-480.webp',
          // Members must not download admin / doctor code (see AREA_FOLDERS).
          ...AREA_FOLDERS.map((area) => `assets/${area}/**`),
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Scan every screen up front, so opening a lazy route the first time does not make the dev server
  // re-optimise and reload the page (that made Playwright flaky).
  optimizeDeps: { entries: ['index.html', 'src/**/*.tsx'] },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/uploads': { target: BACKEND, changeOrigin: true },
    },
  },
  preview: {
    port: 4173,
    // As on the live server (treeway_backend/deploy/nginx/treeway.conf): the same policy as a header, plus
    // frame-ancestors (not allowed in <meta>). `npm run check:csp` opens every screen under it.
    headers: { 'Content-Security-Policy': `${CSP}; frame-ancestors 'none'` },
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/uploads': { target: BACKEND, changeOrigin: true },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        chunkFileNames: (chunk) => {
          const area = chunkArea(chunk);
          return area ? `assets/${area}/[name]-[hash].js` : 'assets/[name]-[hash].js';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
