/**
 * Référentiels d'enchantements et de gemmes.
 *
 * Les listes vivent dans scripts/data et sont mises à jour à chaque saison ;
 * ce module se contente de les indexer.
 */

import validEnchantments from '../../scripts/data/valid_enchantments.json';
import validGems from '../../scripts/data/valid_gems.json';

interface GemData {
  /** Noms d'emplacements, ex. « finger1 ». */
  slots: string[];
  optional_slots?: string[];
  /** Identifiants d'objets gemme. */
  rank1: number[];
  rank2: number[];
  epic_rank1?: number[];
  epic_rank2?: number[];
}

const gems = validGems as GemData;

/** Emplacements où une gemme est attendue. */
export const GEM_SLOTS = new Set<string>(gems.slots);

/** Emplacements où une gemme est possible sans être exigée. */
export const OPTIONAL_GEM_SLOTS = new Set<string>(gems.optional_slots ?? []);

export const ALL_GEM_SLOTS = new Set([...GEM_SLOTS, ...OPTIONAL_GEM_SLOTS]);

export const RANK1_GEMS = new Set(gems.rank1);
export const RANK2_GEMS = new Set(gems.rank2);

/** Gemmes épiques, tous rangs confondus. */
export const EPIC_GEMS = new Set([...(gems.epic_rank1 ?? []), ...(gems.epic_rank2 ?? [])]);

/**
 * Emplacement d'équipement → famille d'enchantements applicable.
 * Les deux anneaux partagent la même famille.
 */
export const SLOT_TO_ENCHANT_CATEGORY: Record<string, string> = {
  main_hand: 'weapon',
  head: 'helm',
  chest: 'chest',
  finger1: 'ring',
  finger2: 'ring',
  feet: 'boot',
  shoulders: 'shoulder',
  legs: 'leg',
};

export const ENCHANTABLE_SLOTS = new Set(Object.keys(SLOT_TO_ENCHANT_CATEGORY));

export const VALID_ENCHANTMENTS = validEnchantments as Record<string, number[]>;
