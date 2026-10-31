import type { BossUpgradesEntry, SimMetric, SimSpecialization } from './item_upgrade.bossUpgrades';

export interface UpgradeQuery {
  itemIds: number[];
  difficulty: string;
  realmId?: number | null;
}

/** Amélioration telle que le repository la renvoie, personnage joint. */
export interface UpgradeRow {
  id: number;
  itemID: number;
  difficulty: string;
  characterID: number | null;
  [key: string]: unknown;
}

/**
 * Amélioration mise à plat pour le client : les champs du personnage
 * remontent d'un niveau et l'appartenance à une wishlist est résolue.
 */
export interface TransformedUpgrade extends UpgradeRow {
  isWishlisted: boolean;
  wishlistSlot: string | null;
}

export interface CharacterBossUpgradesQuery {
  characterId: number;
  difficulty: string;
  extension: string;
  season: string;
  /** Spé dont on veut les sims ; par défaut la spé principale du personnage. */
  specializationId?: number | null;
}

/** Vue par boss d'un personnage, pour une spé (SIMS-211). */
export interface CharacterBossUpgradesResult {
  /** Spé retenue ; null si le personnage n'a ni spé principale ni sim reconnue. */
  specializationId: number | null;
  specialization: SimSpecialization | null;
  /** Spés qui ont des sims pour cette difficulté, la plus récente d'abord. */
  specializations: SimSpecialization[];
  /**
   * Grandeur des sims retenues (SIMS-202) : `hps` pour une sim QE Live de
   * soigneur, `dps` sinon ; null sans sim pour la spé retenue.
   */
  metric: SimMetric | null;
  bosses: BossUpgradesEntry[];
}
