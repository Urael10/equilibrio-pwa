import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Modos:
//   npm run build            → PWA completa (service worker + manifest) para Vercel / GitHub Pages
//   npm run build:prototipo  → un único HTML autocontenido (sin service worker) para aprobar la maqueta
export default defineConfig(({ mode }) => {
  const prototipo = mode === 'prototipo';

  return {
    // './' permite desplegar en GitHub Pages (subcarpeta) y en Vercel (raíz) sin cambiar nada.
    base: './',
    plugins: [
      svelte(),
      tailwindcss(),
      ...(prototipo
        ? [viteSingleFile()]
        : [
            VitePWA({
              registerType: 'autoUpdate',
              includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
              manifest: {
                name: 'Equilibrio · Fitness & Wellness',
                short_name: 'Equilibrio',
                description:
                  'Cuida a tu mascota y aprende nutrición, entrenamiento y hábitos jugando.',
                lang: 'es',
                theme_color: '#07090d',
                background_color: '#07090d',
                display: 'standalone',
                orientation: 'portrait',
                start_url: './',
                scope: './',
                icons: [
                  { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
                  { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
                  {
                    src: 'maskable-512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'maskable',
                  },
                ],
              },
              workbox: {
                globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
                navigateFallback: 'index.html',
              },
            }),
          ]),
    ],
    build: {
      target: 'es2022',
      ...(prototipo ? { assetsInlineLimit: 100_000_000, cssCodeSplit: false } : {}),
    },
    test: {
      include: ['tests/**/*.test.ts'],
      environment: 'node',
    },
  };
});
