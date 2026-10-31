/**
 * Spé retenue par personnage pour les vues multi-personnages de l'optimiseur
 * de loot : `POST /1/upgrade/batch` et `POST /1/upgrade/wishlist-batch`
 * (SIMS-234).
 *
 * Même règle que la vue par boss d'un personnage (SIMS-211,
 * `item_upgrade.bossUpgrades.ts`) : la spé retenue est la spé principale du
 * personnage, sinon la plus récemment simulée. Une sim appartient à une spé
 * par `upgrades.specializationId`, ou par son libellé si la ligne n'est pas
 * rattachée. Les sims des autres spés ne s'y mélangent jamais.
 *
 * Logique pure, sans accès à la base : le service rassemble les données.
 */

import {
  describeSpecialization,
  latestUpgradeByItem,
  listSimulatedSpecializations,
  pickSpecializationId,
  type SimCharacterClass,
  type SimSpecialization,
  simSpecializationIdOf,
  type SimUpgrade,
} from './item_upgrade.bossUpgrades';

/** Personnage d'un lot, avec sa classe et ses spés (null si la classe est inconnue). */
export interface BatchCharacter {
  id: number;
  specializationId: number | null;
  characterClass: SimCharacterClass | null;
}

/** Une spé simulée d'un personnage : libellé, rattachement et date de la dernière sim. */
export interface BatchSimSummary {
  characterID: number;
  spec: string | null;
  specializationId: number | null;
  timeStamp: Date | string | null;
}

export interface RetainedSpecialization {
  characterClass: SimCharacterClass | null;
  specializationId: number | null;
  specialization: SimSpecialization | null;
}

/**
 * Spé retenue de chaque personnage : sa spé principale, sinon la plus
 * récemment simulée parmi `sims` (toutes les sims du personnage à la
 * difficulté demandée, pas seulement celles des objets du lot, pour que la
 * vue standard et la vue wishlist retiennent la même spé).
 */
export function resolveRetainedSpecializations({
  characters,
  sims,
}: {
  characters: BatchCharacter[];
  sims: BatchSimSummary[];
}): Map<number, RetainedSpecialization> {
  const simsByCharacter = new Map<number, BatchSimSummary[]>();
  for (const s of sims) {
    const list = simsByCharacter.get(s.characterID) ?? [];
    list.push(s);
    simsByCharacter.set(s.characterID, list);
  }

  const retained = new Map<number, RetainedSpecialization>();
  for (const character of characters) {
    const simulated = listSimulatedSpecializations(
      (simsByCharacter.get(character.id) ?? []).map(toSimUpgrade),
      character.characterClass,
    );
    const specializationId = pickSpecializationId({
      mainSpecializationId: character.specializationId,
      simulated,
    });
    retained.set(character.id, {
      characterClass: character.characterClass,
      specializationId,
      specialization:
        specializationId != null
          ? describeSpecialization(specializationId, character.characterClass)
          : null,
    });
  }
  return retained;
}

function toSimUpgrade(s: BatchSimSummary): SimUpgrade {
  return {
    itemID: 0,
    dps: null,
    baseDps: null,
    spec: s.spec,
    specializationId: s.specializationId,
    timeStamp: s.timeStamp,
  };
}

type BatchUpgradeRow = Pick<SimUpgrade, 'spec' | 'specializationId'> & { characterID: number };

/**
 * Garde les sims de la spé retenue de leur personnage. Une sim d'un
 * personnage absent de `retained` est écartée : sa spé est inconnue.
 */
export function keepRetainedSpecUpgrades<T extends BatchUpgradeRow>(
  upgrades: T[],
  retained: Map<number, RetainedSpecialization>,
): T[] {
  return upgrades.filter((u) => {
    const r = retained.get(u.characterID);
    if (!r) return false;
    return simSpecializationIdOf(u, r.characterClass) === r.specializationId;
  });
}

/**
 * Sim la plus récente de chaque (personnage, objet) dans la spé retenue du
 * personnage. Clé : `${characterID}-${itemID}`.
 */
export function latestRetainedUpgradeByCharacterItem<
  T extends SimUpgrade & { characterID: number },
>(upgrades: T[], retained: Map<number, RetainedSpecialization>): Map<string, T> {
  const byCharacter = new Map<number, T[]>();
  for (const u of upgrades) {
    const list = byCharacter.get(u.characterID) ?? [];
    list.push(u);
    byCharacter.set(u.characterID, list);
  }

  const result = new Map<string, T>();
  for (const [characterId, list] of byCharacter) {
    const r = retained.get(characterId);
    if (!r) continue;
    for (const [itemId, u] of latestUpgradeByItem(list, r.specializationId, r.characterClass)) {
      result.set(`${characterId}-${itemId}`, u);
    }
  }
  return result;
}

export interface BatchWishlistEntry {
  characterId: number;
  specializationId: number;
  itemId: number | null;
  updatedAt?: Date | string | null;
}

/**
 * Repli de la vue wishlist : un personnage sans spé retenue (ni spé
 * principale, ni sim reconnue) prend la spé de son vœu modifié le plus
 * récemment. Renvoie une nouvelle table ; les autres personnages sont inchangés.
 */
export function withWishlistFallback(
  retained: Map<number, RetainedSpecialization>,
  entries: BatchWishlistEntry[],
): Map<number, RetainedSpecialization> {
  const fallbackSpec = new Map<number, { specializationId: number; time: number }>();
  for (const w of entries) {
    if (retained.get(w.characterId)?.specializationId != null) continue;
    const time = w.updatedAt ? new Date(w.updatedAt).getTime() : 0;
    const prev = fallbackSpec.get(w.characterId);
    if (
      !prev ||
      time > prev.time ||
      (time === prev.time && w.specializationId < prev.specializationId)
    ) {
      fallbackSpec.set(w.characterId, { specializationId: w.specializationId, time });
    }
  }

  const result = new Map(retained);
  for (const [characterId, { specializationId }] of fallbackSpec) {
    const characterClass = retained.get(characterId)?.characterClass ?? null;
    result.set(characterId, {
      characterClass,
      specializationId,
      specialization: describeSpecialization(specializationId, characterClass),
    });
  }
  return result;
}

/**
 * Vœux de la spé retenue de chaque personnage, un seul par (personnage, spé,
 * objet). Les vœux doivent déjà être filtrés (priorité « je n'en veux pas »
 * exclue) ; appliquer `withWishlistFallback` avant pour les personnages sans
 * spé retenue.
 */
export function keepRetainedSpecWishes<T extends BatchWishlistEntry>(
  entries: T[],
  retained: Map<number, RetainedSpecialization>,
): T[] {
  const seen = new Set<string>();
  const kept: T[] = [];
  for (const w of entries) {
    const specId = retained.get(w.characterId)?.specializationId;
    if (specId == null || w.specializationId !== specId) continue;
    const key = `${w.characterId}-${w.specializationId}-${w.itemId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(w);
  }
  return kept;
}
