import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Bibliothèques du Tchad',
        short_name: 'Biblios Tchad',
        description: 'Cartographie des bibliothèques du Tchad',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1f2933',
        icons: [],
      },
    }),
  ],
})
