import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { buildPwaManifest, pwaManifestIcons, pwaManifestScreenshots } from './src/app/pwaManifest'

const scope = '/word-rush/'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        ...buildPwaManifest(
          {
            pwaName: 'Word Rush',
            pwaDescription: 'Tap falling letters to spell Turkish words against the clock.',
          },
          scope,
        ),
        screenshots: pwaManifestScreenshots(scope),
        icons: pwaManifestIcons(scope),
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  base: '/word-rush/',
})
