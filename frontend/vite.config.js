import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\/api\/bibliotheques/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-bibliotheques',
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
              networkTimeoutSeconds: 3,
            },
          },
          {
            urlPattern: /\/api\/villes/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-villes',
              expiration: { maxEntries: 50, maxAgeSeconds: 604800 },
            },
          },
          {
            urlPattern: /\/api\/stats/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-stats',
              expiration: { maxEntries: 5, maxAgeSeconds: 86400 },
              networkTimeoutSeconds: 3,
            },
          },
          {
            urlPattern: /\/api\/avis\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-avis',
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
              networkTimeoutSeconds: 3,
            },
          },
          {
            urlPattern: /\/uploads\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'uploads-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 2592000 },
            },
          },
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 2592000 },
            },
          },
        ],
      },
      manifest: {
        name: 'Bibliofinder — Cartographie des bibliothèques du Tchad',
        short_name: 'Bibliofinder',
        description: 'Cartographie des bibliothèques du Tchad',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1a6b3c',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})
