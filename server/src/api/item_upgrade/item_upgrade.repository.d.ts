import type { BatchCharacter, BatchSimSummary } from './item_upgrade.batchSpecialization';
import type {
  BossWithLoots,
  SimCharacterClass,
  SimUpgrade,
  TokenReward,
} from './item_upgrade.bossUpgrades';
import type { CharacterBossUpgradesQuery, UpgradeRow } from './item_upgrade.types';

/** Données brutes de la vue par boss d'un personnage. */
export interface CharacterBossUpgradesData {
  character: { id: number; class: string; specializationId: number | null } | null;
  /** Classe du personnage et ses spés ; null si la classe est inconnue. */
  characterClass: SimCharacterClass | null;
  bosses: BossWithLoots[];
  /** Sims du personnage pour la difficulté et le butin, toutes spés, plus récente d'abord. */
  upgrades: SimUpgrade[];
  wishlistEntries: Array<{ itemId: number | null; priority: number | null }>;
  tokenRewards: TokenReward[];
}

/** Vœu de wishlist d'un personnage sur un objet, personnage et objet joints. */
export interface BatchWishlistRow {
  id: number;
  characterId: number;
  specializationId: number;
  slot: string;
  itemId: number | null;
  priority: number | null;
  updatedAt: Date;
  character: Record<string, unknown>;
  item: { id: number; name: string; icon: string | null; inventoryType: number | null } | null;
}

/**
 * Contrat du repository, qui reste écrit en JavaScript.
 * Voir docs/api/architecture.md pour la raison d'être de ce fichier.
 *
 * Les alias getById/create/update/delete existent mais ne sont appelés
 * nulle part : ils ne sont pas déclarés ici.
 */
declare const upgradeRepository: {
  listUpgrades(realmId?: number | null): Promise<UpgradeRow[]>;
  listUpgradesByItemAndDifficulty(
    itemId: number,
    difficulty: string,
    realmId?: number | null,
  ): Promise<UpgradeRow[]>;
  listUpgradesByCharacterNameItemAndDifficulty(
    name: string,
    itemId: number,
    difficulty: string,
    realmId?: number | null,
  ): Promise<UpgradeRow[]>;
  getCharacterBossUpgradesData(
    query: CharacterBossUpgradesQuery,
  ): Promise<CharacterBossUpgradesData>;
  /** Vœux (toutes spés, toutes priorités) portant sur ces objets, limités au royaume s'il est donné. */
  listWishlistEntriesForItems(
    itemIds: number[],
    realmId?: number | null,
  ): Promise<BatchWishlistRow[]>;
  /** Personnages (spé principale, classe) et résumé de leurs sims, pour la spé retenue (SIMS-234). */
  getSimSpecializationContext(
    characterIds: number[],
    difficulty: string,
  ): Promise<{ characters: BatchCharacter[]; sims: BatchSimSummary[] }>;
  /** Supprime les upgrades des personnages d'un royaume ; renvoie le nombre supprimé. */
  deleteUpgradesByRealm(realmId: number): Promise<number>;
};

export default upgradeRepository;
