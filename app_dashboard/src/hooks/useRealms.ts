import { useAuth } from '@clerk/clerk-react';
import { useCallback, useEffect, useState } from 'react';

import { adminFetch } from '../lib/api';
import type { Realm, Subscription } from '../types';

export interface RealmWithCount extends Realm {
  _count: { characters: number };
  subscriptions: Subscription[];
}

interface UseRealmsResult {
  realms: RealmWithCount[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useRealms(): UseRealmsResult {
  const { getToken } = useAuth();
  const [realms, setRealms] = useState<RealmWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRealms = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error('No token');
    const data = await adminFetch<RealmWithCount[]>('/realms', token);
    setRealms(data);
    setLoading(false);
  }, [getToken]);

  useEffect(() => {
    fetchRealms().catch((err: Error) => {
      setError(err.message);
      setLoading(false);
    });
  }, [fetchRealms]);

  return { realms, loading, error, refetch: fetchRealms };
}
