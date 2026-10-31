/**
 * Gain figé à l'import (SIMS-229) — calcul pur, testé sans base.
 *
 * `upgrades` ne garde que le dernier sim par (personnage, difficulté, spé) :
 * le gain d'un objet attribué est donc lu au moment où le loot arrive, et
 * recopié sur la ligne `imported_loots`. Un sim ultérieur ne le change plus.
 *
 * Mêmes règles que l'écran d'équité (attendance.lootEquity) : même objet (ou
 * pièce que le jeton donne à la classe), même difficulté que le drop, spé
 * principale du personnage, sim antérieur ou égal au drop — ou, si la date du
 * drop est illisible, sim courant.
 */

import type { EquitySim, EquityTokenReward, GainMetric } from '../attendance/attendance.lootEquity';
import {
  difficultyFromInstance,
  gainMetricOf,
  isAttributiveResponse,
  parseLootDate,
  percentGain,
  pickSimAtDrop,
} from '../attendance/attendance.lootEquity';

export interface FreezeCharacter {
  id: number;
  class: string;
  specializationId: number | null;
  specName: string | null;
}

export interface FreezeLoot {
  characterID: number | null;
  itemID: number;
  date: string;
  time: string;
  response: string | null;
  instance: string | null;
  /** Difficulté envoyée par le compagnon, à défaut de la lire dans l'instance. */
  difficulty?: string | null;
}

export interface FrozenGain {
  upgradePercent: number;
  upgradeSimAt: Date;
  upgradeSpecializationId: number | null;
  /** Grandeur du sim retenu (SIMS-202). */
  upgradeMetric: GainMetric;
}

export interface FreezeContext {
  characters: Map<number, FreezeCharacter>;
  sims: EquitySim[];
  tokenRewards: EquityTokenReward[];
}

/** Précision conservée : celle de la colonne (`DECIMAL(10,4)`). */
function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/**
 * Le loot doit-il recevoir un gain figé ? Seulement s'il est rattaché à un
 * personnage du royaume et donne l'objet au joueur : un désenchantement ou
 * une mise en banque n'a pas de gain à retenir.
 */
export function isFreezable(loot: FreezeLoot): loot is FreezeLoot & { characterID: number } {
  return loot.characterID != null && loot.itemID > 0 && isAttributiveResponse(loot.response);
}

/**
 * @returns le gain à figer, ou `null` quand aucun sim ne convient — l'import
 * n'en est pas bloqué, la ligne reste sans gain figé.
 */
export function freezeGain(loot: FreezeLoot, context: FreezeContext): FrozenGain | null {
  if (!isFreezable(loot)) return null;

  const character = context.characters.get(loot.characterID);
  if (!character) return null;

  const covered = new Set([
    loot.itemID,
    ...context.tokenRewards
      .filter((r) => r.tokenItemId === loot.itemID && r.class === character.class)
      .map((r) => r.rewardItemId),
  ]);

  const sim = pickSimAtDrop(
    context.sims.filter((s) => s.characterId === character.id && covered.has(s.itemId)),
    parseLootDate(loot.date, loot.time),
    difficultyFromInstance(loot.instance) ?? difficultyFromInstance(loot.difficulty ?? null),
    character.specName,
    character.specializationId,
  );
  const percent = sim ? percentGain(sim.dps, sim.baseDps) : null;
  if (!sim || percent === null) return null;

  return {
    upgradePercent: round4(percent),
    upgradeSimAt: sim.timeStamp,
    upgradeSpecializationId: sim.specializationId ?? character.specializationId,
    upgradeMetric: gainMetricOf(sim),
  };
}
