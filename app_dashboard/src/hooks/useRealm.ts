import { useEffect, useState } from 'react';

import { Realm } from '../types';

const cache: Record<number, Realm> = {};

export function useRealm(realmId: number | undefined): Realm | null {
  const [realm, setRealm] = useState<Realm | null>(
    realmId != null ? (cache[realmId] ?? null) : null,
  );

  useEffect(() => {
    if (realmId == null) return;
    if (cache[realmId]) {
      setRealm(cache[realmId]);
      return;
    }
    fetch(`/1/realms/${realmId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        cache[realmId] = data;
        setRealm(data);
      })
      .catch(() => null);
  }, [realmId]);

  return realm;
}
