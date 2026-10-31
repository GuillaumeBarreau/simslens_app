import { useEffect, useState } from 'react';

import { useAuth } from '@clerk/clerk-react';

import { adminFetch } from '../lib/api';

export interface Stats {
  totalRealms: number;
  totalCharacters: number;
  active: number;
  pending: number;
  archived: number;
  byRole: Record<string, number>;
  byClass: Record<string, number>;
  avgIlvl: number;
}

interface UseStatsResult {
  stats: Stats | null;
  loading: boolean;
  error: string | null;
}

export function useStats(): UseStatsResult {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getToken()
      .then((token) => {
        if (!token) throw new Error('No token');
        return adminFetch<Stats>('/stats', token);
      })
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [getToken]);

  return { stats, loading, error };
}
