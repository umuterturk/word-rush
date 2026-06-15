import type { Translations } from './translations';

const BASE = import.meta.env.BASE_URL;
const SCOPE = BASE.endsWith('/') ? BASE : `${BASE}/`;

let manifestBlobUrl: string | null = null;

function setMetaContent(name: string, content: string) {
  let element = document.querySelector(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('name', name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function updateManifest(t: Translations) {
  const manifest = {
    name: t.pwaName,
    short_name: t.pwaName,
    description: t.pwaDescription,
    theme_color: '#0b0b18',
    background_color: '#0b0b18',
    display: 'standalone',
    orientation: 'portrait',
    scope: SCOPE,
    start_url: SCOPE,
    icons: [
      {
        src: `${SCOPE}pwa-192x192.png`,
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: `${SCOPE}pwa-512x512.png`,
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: `${SCOPE}pwa-512x512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };

  if (manifestBlobUrl) {
    URL.revokeObjectURL(manifestBlobUrl);
  }

  manifestBlobUrl = URL.createObjectURL(
    new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }),
  );

  let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'manifest';
    document.head.appendChild(link);
  }
  link.href = manifestBlobUrl;
}

export function syncPwaMetadata(t: Translations, lang: 'en' | 'tr') {
  document.title = t.pwaName;
  document.documentElement.lang = lang;
  setMetaContent('description', t.pwaDescription);
  setMetaContent('apple-mobile-web-app-title', t.pwaName);
  updateManifest(t);
}
