import type { Translations } from './translations';
import { buildPwaManifest, pwaManifestIcons, pwaScopePath } from '../app/pwaManifest';

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
  const scope = pwaScopePath(import.meta.env.BASE_URL);
  const manifest = {
    ...buildPwaManifest(t, scope),
    icons: pwaManifestIcons(scope),
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
