import { useState, useEffect } from 'react';
import type { LeagueData, LeagueId, SeasonYear } from '../types';

interface UseLeagueDataResult {
  data: LeagueData | null;
  loading: boolean;
  error: string | null;
}

const cache: Record<string, LeagueData> = {};

export function useLeagueData(leagueId: LeagueId, seasonYear: SeasonYear): UseLeagueDataResult {
  const cacheKey = `${leagueId}-${seasonYear}`;
  const [data, setData] = useState<LeagueData | null>(cache[cacheKey] ?? null);
  const [loading, setLoading] = useState<boolean>(!cache[cacheKey]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cache[cacheKey]) {
      setData(cache[cacheKey]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    fetch(`${import.meta.env.BASE_URL}data/${leagueId}-${seasonYear}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`No data available for ${leagueId} ${seasonYear}`);
        return res.json() as Promise<LeagueData>;
      })
      .then((json) => {
        cache[cacheKey] = json;
        setData(json);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      });
  }, [cacheKey, leagueId, seasonYear]);

  return { data, loading, error };
}
