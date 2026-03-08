import type { LeagueId, SeasonYear, AppTab } from '../types';

export const VALID_LEAGUES: readonly LeagueId[] = [
  'premier-league',
  'la-liga',
  'serie-a',
  'bundesliga',
  'ligat-haal',
];

export const VALID_SEASONS: readonly SeasonYear[] = [2021, 2022, 2023, 2024, 2025];

export const VALID_TABS: readonly AppTab[] = ['phase1', 'phase2', 'scatter'];

export function getUrlParam(key: string): string | null {
  return new URLSearchParams(window.location.search).get(key);
}

export function getUrlInt(key: string): number | null {
  const v = getUrlParam(key);
  if (!v) return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

export function updateUrl(
  params: Record<string, string | number | null | undefined>,
): void {
  const sp = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) {
      sp.delete(key);
    } else {
      sp.set(key, String(value));
    }
  }
  const search = sp.toString();
  history.replaceState(null, '', search ? `?${search}` : window.location.pathname);
}
