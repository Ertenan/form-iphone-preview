import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const isPreview = mode === 'iphone-preview' || mode === 'github-preview';
  const base = mode === 'github-preview' ? '/form-iphone-preview/' : '/';
  return {
  base,
  define: { __IPHONE_PREVIEW__: JSON.stringify(isPreview) },
  plugins: [react(), VitePWA({
    registerType: 'prompt', injectRegister: false,
    includeAssets: ['icon.svg', 'apple-touch-icon.png'],
    manifest: {
      name: isPreview ? 'Form — iPhone Test Preview' : 'Form — Workout Journal', short_name: isPreview ? 'Form Test' : 'Form', description: 'Your training, one good set at a time.',
      id: base, theme_color: '#163c35', background_color: '#f7f8f4', display: 'standalone', start_url: base, scope: base,
      icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: 'icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }],
    },
    workbox: { globPatterns: ['**/*.{js,css,html,png,svg,woff2}'], navigateFallback: `${base}index.html`, cleanupOutdatedCaches: true },
  })],
  };
});
