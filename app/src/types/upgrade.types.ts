import type { SimulatedSpecialization } from 'utils/simulatedSpecialization';

export interface UpgradeEquippedItem {
  itemId: number;
  ilevel: number;
  slot: string;
  upgradeLevel?: number | null;
  upgradeMax?: number | null;
  upgradeName?: string | null;
  upgradeFullName?: string | null;
  upgradeBonusId?: number | null;
  baseItemLevel?: number | null;
  item: {
    id: number;
    name: string;
    icon: string;
  };
}

export interface UpgradeBatchRow {
  dps: number;
  baseDps: number;
  metric?: string | null;
  hasNoReport?: boolean;
  name: string;
  realm?: string;
  region?: string;
  class?: string;
  thumbnail?: string;
  spec?: string;
  specialization?: { role?: string | null } | null;
  simSpecialization?: SimulatedSpecialization | null;
  guild?: string;
  reportID?: string;
  timeStamp: Date;
  isWishlist?: boolean | number;
  wishlistSlot?: string | null;
  characterId?: number;
  equippedItems?: UpgradeEquippedItem[];
  items?: {
    id: number;
    name: string;
    icon: string;
    inventoryType?: number | null;
  };
}

export type UpgradesByItem = Record<string, UpgradeBatchRow[] | undefined>;

export interface UpgradeBatchQuery {
  itemIds: number[];
  difficulty: string;
  realmId?: number;
}
