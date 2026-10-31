/**
 * Lecture d'un objet auprès de l'API Blizzard.
 *
 * Le jeton utilisé est celui de l'application, obtenu par ensureToken :
 * la fiche d'un objet ne dépend pas du compte qui la demande.
 */

import axios from 'axios';

import { ensureToken } from '../../integrations/blizzard/blizzardToken';
import config from '../../shared/config';
import type { BlizzardItemData } from './item.types';

/**
 * Hôte régional de l'API. La Chine passe par une passerelle distincte.
 */
export function getBlizzardHost(region = 'eu'): string {
  return region === 'cn' ? 'gateway.battlenet.com.cn' : `${region}.api.blizzard.com`;
}

export async function fetchItemFromBlizzard(
  itemId: number,
  region = 'eu',
): Promise<BlizzardItemData> {
  const host = getBlizzardHost(region);

  try {
    const { token } = await ensureToken(config.bnet.id, config.bnet.secret, region);

    const headers = { Authorization: `Bearer ${token}` };
    const params = { namespace: `static-${region}`, locale: 'en_GB' };

    const [item, media] = await Promise.all([
      axios.get(`https://${host}/data/wow/item/${itemId}`, { headers, params }),
      axios.get(`https://${host}/data/wow/media/item/${itemId}`, { headers, params }),
    ]);

    return { ...item.data, media: media.data };
  } catch (error) {
    const err = error as { response?: { data?: unknown }; message?: string };
    console.error(
      `[Blizzard API] ❌ Error fetching item ${itemId}:`,
      err?.response?.data || err.message,
    );
    throw error;
  }
}
