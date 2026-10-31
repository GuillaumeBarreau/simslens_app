import { useQuery } from '@tanstack/react-query';
import api from 'services/api';

import { API_VERSION } from '../../config/apiConstants';

interface Enchantment {
  id: number;
  tokenizedName: string;
  spellId: number | null;
  itemId: number | null;
}

export function useEnchantments() {
  return useQuery<{ enchantments: Enchantment[] }>({
    queryKey: ['enchantments'],
    queryFn: async () => {
      const response = await api.get(`${API_VERSION}/enchantments`);
      return response.data;
    },
    staleTime: Infinity, // Enchantments don't change often
    gcTime: Infinity,
  });
}

export function getEnchantIdFromName(
  enchantments: Enchantment[] | undefined,
  enchantName: string,
): number | null {
  if (!enchantments) return null;

  const enchant = enchantments.find((e) => e.tokenizedName === enchantName);
  return enchant?.id || null;
}
