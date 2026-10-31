import type { ID, ISODate } from './common.types';

export interface Item {
  id: ID;
  name: string;
  icon: string;
  quality: number;
  itemLevel: number;
  inventoryType: number | null;
  itemClass: number | null;
  itemSubClass: number | null;
  allowableClasses: string | null;
}

export interface InstanceLoot {
  id: ID;
  instanceId: ID;
  bossId: ID;
  itemId: ID;
  assignedTo?: ID | null;
  assignedBy?: ID | null;
  assignedAt?: ISODate | null;
  createdAt: ISODate;
  item?: Item;
  boss?: {
    id: ID;
    name: string;
    icon?: string | null;
  };
  /** Character the loot was assigned to (API join) */
  assignedCharacter?: {
    id: ID;
    name: string;
    class: string;
  } | null;
}

export interface BossDrop {
  id: ID;
  bossId: ID;
  itemId: ID;
  item?: Item;
}

export interface Upgrade {
  id: ID;
  characterID: ID;
  itemID: ID;
  reportID: string;
  dps: number;
  baseDps: number;
  spec: string;
  difficulty: string;
  timeStamp: ISODate;
  talents: string;
  buildDate: string;
  item?: Item;
}

export interface LootFilters {
  bossId?: ID;
  /** Pass `null` to query unassigned loots */
  assignedTo?: ID | null;
}

export interface CreateLootPayload {
  instanceId: ID;
  bossId: ID;
  itemId: ID;
}
