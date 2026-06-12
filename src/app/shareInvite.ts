export function getInviteUrl(code: string): string {
  const base = window.location.origin + import.meta.env.BASE_URL;
  return `${base}?join=${code}`;
}

export type ShareInviteResult = 'shared' | 'copied' | 'none';

export async function shareInviteLink(
  code: string,
  shareTitle: string,
  shareText: string,
): Promise<ShareInviteResult> {
  const url = getInviteUrl(code);

  if (navigator.share) {
    try {
      await navigator.share({ title: shareTitle, text: shareText, url });
      return 'shared';
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return 'none';
    }

    try {
      await navigator.share({ url });
      return 'shared';
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return 'none';
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'none';
  }
}
