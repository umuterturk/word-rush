import type { SavedGameSession } from '../domain/savedGameSession';

function currentSearch(): string {
  return window.location.search;
}

export function getJoinCodeFromUrl(search = currentSearch()): string | null {
  const code = new URLSearchParams(search).get('join')?.trim();
  return code ? code.toUpperCase() : null;
}

export function hasSoloGameParam(search = currentSearch()): boolean {
  return new URLSearchParams(search).has('solo');
}

export function hasJoinGameParam(search = currentSearch()): boolean {
  return getJoinCodeFromUrl(search) !== null;
}

export function setSoloGameParam(): void {
  const url = new URL(window.location.href);
  url.searchParams.set('solo', '');
  window.history.replaceState({}, '', `${url.pathname}${url.search}`);
}

export function clearSoloGameParam(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('solo')) return;
  url.searchParams.delete('solo');
  const next = url.searchParams.toString();
  window.history.replaceState({}, '', next ? `${url.pathname}?${next}` : url.pathname);
}

export function setJoinGameParam(code: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set('join', code.trim().toUpperCase());
  window.history.replaceState({}, '', `${url.pathname}${url.search}`);
}

export function clearJoinGameParam(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('join')) return;
  url.searchParams.delete('join');
  const next = url.searchParams.toString();
  window.history.replaceState({}, '', next ? `${url.pathname}?${next}` : url.pathname);
}

export function shouldRestoreSavedSession(
  session: SavedGameSession,
  search = currentSearch(),
): boolean {
  if (session.gameState.matchStatus !== 'playing') return false;

  if (session.gameState.matchMode === 'solo') {
    return hasSoloGameParam(search);
  }

  if (session.gameState.matchMode === 'multiplayer') {
    const joinCode = getJoinCodeFromUrl(search);
    if (!joinCode) return false;
    if (session.inviteCode && joinCode !== session.inviteCode.toUpperCase()) return false;
    return true;
  }

  return false;
}
