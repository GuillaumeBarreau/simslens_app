/**
 * Verdicts d'enchantement et de gemmes pour un instantané d'équipement.
 *
 * Ces deux règles existaient en double : une copie pour la vérification d'un
 * personnage, une autre pour le traitement en lot. Elles ne vivent plus
 * qu'ici, et ne touchent pas la base.
 */

import {
  ALL_GEM_SLOTS,
  ENCHANTABLE_SLOTS,
  EPIC_GEMS,
  OPTIONAL_GEM_SLOTS,
  SLOT_TO_ENCHANT_CATEGORY,
  VALID_ENCHANTMENTS,
} from './enchantments.constants';
import {
  parseEnchantIdFromEncoded,
  parseGemIdsFromEncoded,
  worstGemRank,
} from './enchantments.parsing';
import type {
  EnchantmentMap,
  EnchantResult,
  GearSnapshot,
  GemResults,
  SnapshotItem,
} from './enchantments.types';

/**
 * Les chevaliers de la mort enchantent leur arme via une rune, absente du
 * référentiel : leur arme est acceptée sans vérification.
 */
const RUNEFORGING_CLASS = 'death_knight';
const WEAPON_CATEGORY = 'weapon';

function resolveEnchantId(item: SnapshotItem): number | null {
  return item.enchantId ?? parseEnchantIdFromEncoded(item.encodedItem);
}

/** Identifiants d'enchantement portés par un instantané, sans doublon. */
export function collectEnchantIds(snapshot: GearSnapshot): number[] {
  const ids = snapshot.items
    .filter((item) => ENCHANTABLE_SLOTS.has(item.slot))
    .map(resolveEnchantId)
    .filter((id): id is number => id != null);

  return [...new Set(ids)];
}

export function buildEnchantResults(
  snapshot: GearSnapshot,
  enchantmentMap: EnchantmentMap,
): EnchantResult[] {
  const isRuneforger = snapshot.character?.class === RUNEFORGING_CLASS;

  return snapshot.items
    .filter((item) => ENCHANTABLE_SLOTS.has(item.slot))
    .map((item) => {
      const category = SLOT_TO_ENCHANT_CATEGORY[item.slot];
      const validSpellIds = VALID_ENCHANTMENTS[category] ?? [];
      const enchantId = resolveEnchantId(item);

      const base = { slot: item.slot, category };
      const blank = { spellId: null, displayName: null, craftingQuality: null };

      if (enchantId == null) {
        return { ...base, ...blank, enchantId: null, isValid: false, reason: 'missing' as const };
      }

      const enchant = enchantmentMap[enchantId];
      if (!enchant) {
        return { ...base, ...blank, enchantId, isValid: false, reason: 'unknown' as const };
      }

      const found = {
        ...base,
        enchantId: enchant.id,
        spellId: enchant.spellId,
        displayName: enchant.displayName,
        craftingQuality: enchant.craftingQuality,
      };

      // Famille sans liste de référence : on n'a rien à dire, ni oui ni non.
      if (validSpellIds.length === 0) {
        return { ...found, isValid: null, reason: 'not_configured' as const };
      }

      if (isRuneforger && category === WEAPON_CATEGORY) {
        return { ...found, isValid: true, reason: 'valid' as const };
      }

      // Un enchantement sans sort connu ne peut correspondre à aucune
      // référence : il est signalé invalide plutôt qu'accepté par défaut.
      const isValid = enchant.spellId != null && validSpellIds.includes(enchant.spellId);

      return { ...found, isValid, reason: isValid ? ('valid' as const) : ('invalid' as const) };
    });
}

export function buildGemResults(snapshot: GearSnapshot): GemResults {
  let hasEpicGem = false;

  const slots = snapshot.items
    .filter((item) => ALL_GEM_SLOTS.has(item.slot))
    .map((item) => {
      const gemIds = item.gemIds
        ? item.gemIds
            .split('/')
            .map((id) => parseInt(id, 10))
            .filter(Boolean)
        : parseGemIdsFromEncoded(item.encodedItem);

      // Un emplacement facultatif laissé vide n'est pas une faute.
      if (OPTIONAL_GEM_SLOTS.has(item.slot) && gemIds.length === 0) {
        return { slot: item.slot, gemIds: [], isValid: null, reason: 'not_required', rank: null };
      }

      if (gemIds.some((id) => EPIC_GEMS.has(id))) {
        hasEpicGem = true;
      }

      return { slot: item.slot, gemIds, ...worstGemRank(gemIds) };
    });

  return { slots, hasEpicGem };
}
