import { useState, useEffect } from 'react';
import type { LeagueData, LeagueId } from '../types';

interface UseLeagueDataResult {
  data: LeagueData | null;
  loading: boolean;
  error: string | null;
}

const cache: Record<string, LeagueData> = {};

export function useLeagueData(leagueId: LeagueId): UseLeagueDataResult {
  const [data, setData] = useState<LeagueData | null>(cache[leagueId] ?? null);
  const [loading, setLoading] = useState<boolean>(!cache[leagueId]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cache[leagueId]) {
      setData(cache[leagueId]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`${import.meta.env.BASE_URL}data/${leagueId}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load data for ${leagueId}`);
        return res.json() as Promise<LeagueData>;
      })
      .then((json) => {
        cache[leagueId] = json;
        setData(json);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      });
  }, [leagueId]);

  return { data, loading, error };
}
