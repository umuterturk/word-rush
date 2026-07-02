/** Shared PWA manifest fields — keep vite.config and syncPwaMetadata in sync. */

export const PWA_SITE_ORIGIN = 'https://umuterturk.github.io';

export function pwaScopePath(baseUrl = '/'): string {
  const base = baseUrl;
  return base.endsWith('/') ? base : `${base}/`;
}

export interface PwaManifestText {
  pwaName: string;
  pwaDescription: string;
}

export function buildPwaManifest(
  { pwaName, pwaDescription }: PwaManifestText,
  scope = pwaScopePath(),
) {
  return {
    id: scope,
    name: pwaName,
    short_name: pwaName,
    description: pwaDescription,
    lang: 'en',
    dir: 'ltr' as const,
    categories: ['games', 'word', 'entertainment'],
    theme_color: '#0b0b18',
    background_color: '#0b0b18',
    display: 'standalone' as const,
    display_override: ['standalone', 'minimal-ui'] as ('standalone' | 'minimal-ui')[],
    orientation: 'portrait' as const,
    scope,
    start_url: scope,
    launch_handler: {
      client_mode: 'navigate-existing' as const,
    },
    prefer_related_applications: false,
  };
}

export function pwaManifestIcons(scope: string) {
  return [
    {
      src: `${scope}pwa-192x192.png`,
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: `${scope}pwa-512x512.png`,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: `${scope}pwa-512x512.png`,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ];
}

export function pwaManifestScreenshots(scope: string) {
  return [
    {
      src: `${scope}screenshots/home.png`,
      sizes: '945x2048',
      type: 'image/png',
      form_factor: 'narrow' as const,
      label: 'Daily records, your best score, and the leaderboard',
    },
    {
      src: `${scope}screenshots/solo.png`,
      sizes: '945x2048',
      type: 'image/png',
      form_factor: 'narrow' as const,
      label: 'Tap falling letters to spell words against the clock',
    },
    {
      src: `${scope}screenshots/versus.png`,
      sizes: '945x2048',
      type: 'image/png',
      form_factor: 'narrow' as const,
      label: 'Race a friend head-to-head in real time',
    },
  ];
}
