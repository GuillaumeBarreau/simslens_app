/**
 * Lecture des identifiants portés par la chaîne SimC d'un objet.
 *
 * Un objet encodé ressemble à :
 *   head=,id=212068,enchant_id=7935,gem_id=213743/213458
 */

import { RANK1_GEMS, RANK2_GEMS } from './enchantments.constants';

export type GemVerdictReason = 'missing' | 'invalid' | 'valid';

export interface GemVerdict {
  isValid: boolean;
  reason: GemVerdictReason;
  /** Rang le plus faible parmi les gemmes serties, null si le verdict est négatif. */
  rank: number | null;
}

export function parseEnchantIdFromEncoded(encodedItem?: string | null): number | null {
  if (!encodedItem) return null;

  const match = encodedItem.match(/enchant_id=(\d+)/);

  return match ? parseInt(match[1], 10) : null;
}

/**
 * Plusieurs gemmes sont séparées par des barres obliques.
 */
export function parseGemIdsFromEncoded(encodedItem?: string | null): number[] {
  if (!encodedItem) return [];

  const match = encodedItem.match(/gem_id=([\d/]+)/);
  if (!match) return [];

  return match[1]
    .split('/')
    .map((id) => parseInt(id, 10))
    .filter(Boolean);
}

/**
 * Verdict d'un emplacement : le rang retenu est celui de la plus faible des
 * gemmes serties, et une seule gemme inconnue invalide l'ensemble.
 */
export function worstGemRank(gemIds: number[]): GemVerdict {
  if (gemIds.length === 0) return { isValid: false, reason: 'missing', rank: null };

  let hasInvalid = false;
  let worstRank = 2;

  for (const id of gemIds) {
    if (RANK2_GEMS.has(id)) continue;

    if (RANK1_GEMS.has(id)) {
      worstRank = 1;
    } else {
      hasInvalid = true;
    }
  }

  if (hasInvalid) return { isValid: false, reason: 'invalid', rank: null };

  return { isValid: true, reason: 'valid', rank: worstRank };
}
