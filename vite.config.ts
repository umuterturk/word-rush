import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        // Stable identity for the installed app. Must not change once shipped —
        // changing it makes browsers treat it as a brand-new app on next install.
        id: '/word-rush/',
        name: 'Word Rush',
        short_name: 'Word Rush',
        description: 'Tap falling letters to spell Turkish words against the clock.',
        lang: 'en',
        dir: 'ltr',
        categories: ['games', 'word', 'entertainment'],
        theme_color: '#0b0b18',
        background_color: '#0b0b18',
        display: 'standalone',
        // Prefer standalone; fall back to slim browser chrome where standalone
        // isn't supported rather than dropping all the way to a full browser tab.
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        scope: '/word-rush/',
        start_url: '/word-rush/',
        // Reuse the already-open window when a link in scope (e.g. an invite
        // ?join= link) is opened, navigating it instead of spawning a new instance.
        launch_handler: {
          client_mode: 'navigate-existing',
        },
        // Pure PWA — never steer users toward a native app store.
        prefer_related_applications: false,
        // Shown in the richer install UI (Android Chrome) and app listings.
        screenshots: [
          {
            src: 'screenshots/home.png',
            sizes: '945x2048',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Daily records, your best score, and the leaderboard',
          },
          {
            src: 'screenshots/solo.png',
            sizes: '945x2048',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Tap falling letters to spell words against the clock',
          },
          {
            src: 'screenshots/versus.png',
            sizes: '945x2048',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Race a friend head-to-head in real time',
          },
        ],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  base: '/word-rush/',
})
