import { useEffect, useState } from 'react';

import { Character } from '../types';

interface UseCharactersResult {
  characters: Character[];
  loading: boolean;
  error: string | null;
}

export function useCharacters(): UseCharactersResult {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/1/character')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.characters ?? []);
        setCharacters(list);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { characters, loading, error };
}
