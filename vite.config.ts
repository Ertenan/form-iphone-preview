import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  define: { __IPHONE_PREVIEW__: JSON.stringify(mode === 'iphone-preview') },
  plugins: [react(), VitePWA({
    registerType: 'prompt', injectRegister: false,
    includeAssets: ['icon.svg', 'apple-touch-icon.png'],
    manifest: {
      name: mode === 'iphone-preview' ? 'Form — iPhone Test Preview' : 'Form — Workout Journal', short_name: mode === 'iphone-preview' ? 'Form Test' : 'Form', description: 'Your training, one good set at a time.',
      theme_color: '#163c35', background_color: '#f7f8f4', display: 'standalone', start_url: '/', scope: '/',
      icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }],
    },
    workbox: { globPatterns: ['**/*.{js,css,html,png,svg,woff2}'], navigateFallback: '/index.html', cleanupOutdatedCaches: true },
  })],
}));
