import { normalizeClass } from 'utils';

export const LEFT_SLOTS = ['head', 'neck', 'shoulders', 'back', 'chest', 'wrists'];

export const RIGHT_SLOTS = [
  'hands',
  'waist',
  'legs',
  'feet',
  'finger1',
  'finger2',
  'trinket2',
  'trinket1',
];

export const BOTTOM_SLOTS = ['main_hand', 'off_hand', 'two_hand'];

export const EQUIPMENT_SLOTS = [...LEFT_SLOTS, ...RIGHT_SLOTS, ...BOTTOM_SLOTS].filter(
  (s) => !s.startsWith('spacer'),
);

export const SLOT_DETAILS: Record<string, { label: string; icon: string }> = {
  head: { label: 'Head', icon: 'inv_helmet_03' },
  neck: { label: 'Neck', icon: 'inv_jewelry_necklace_04' },
  shoulders: { label: 'Shoulders', icon: 'inv_shoulder_02' },
  back: { label: 'Back', icon: 'inv_misc_cape_05' },
  chest: { label: 'Chest', icon: 'inv_chest_chain_03' },
  wrists: { label: 'Wrists', icon: 'inv_bracer_06' },
  hands: { label: 'Hands', icon: 'inv_gauntlets_07' },
  waist: { label: 'Waist', icon: 'inv_belt_03' },
  legs: { label: 'Legs', icon: 'inv_pants_02' },
  feet: { label: 'Feet', icon: 'inv_boots_02' },
  finger1: { label: 'Ring 1', icon: 'inv_jewelry_ring_03' },
  finger2: { label: 'Ring 2', icon: 'inv_jewelry_ring_03' },
  trinket1: { label: 'Trinket 1', icon: 'inv_jewelry_trinket_04' },
  trinket2: { label: 'Trinket 2', icon: 'inv_jewelry_trinket_04' },
  main_hand: { label: 'Main Hand', icon: 'inv_sword_04' },
  off_hand: { label: 'Off Hand', icon: 'inv_shield_05' },
  two_hand: { label: 'Two Hand', icon: 'inv_sword_06' },
};

export const CLASS_SLOT_OVERRIDES: Record<
  string,
  Record<string, { label: string; icon: string }>
> = {
  demon_hunter: {
    off_hand: { label: 'Main Hand', icon: 'inv_sword_04' },
  },
  warrior: {
    off_hand: { label: 'Main Hand', icon: 'inv_sword_04' }, // Fury Dual Wield
  },
  rogue: {
    off_hand: { label: 'Main Hand', icon: 'inv_sword_04' },
  },
  death_knight: {
    off_hand: { label: 'Main Hand', icon: 'inv_sword_04' }, // Frost DW
  },
  monk: {
    off_hand: { label: 'Off Hand', icon: 'inv_sword_04' }, // WW DW
  },
  shaman: {
    off_hand: { label: 'Off Hand', icon: 'inv_mace_01' }, // Enh uses maces/axes
  },
};

export interface ClassWeaponConfig {
  allowedSlots: string[];
  slotQueryOverrides?: Record<string, string>;
}

export const CLASS_WEAPON_CONFIG: Record<string, ClassWeaponConfig> = {
  demon_hunter: {
    allowedSlots: ['main_hand', 'off_hand'],
    slotQueryOverrides: { off_hand: 'main_hand' },
  },
  rogue: {
    allowedSlots: ['main_hand', 'off_hand'],
    slotQueryOverrides: { off_hand: 'main_hand' },
  },
  hunter: {
    allowedSlots: ['two_hand'], // Primarily 2H (Survival/Ranged)
  },
  warrior: {
    allowedSlots: ['main_hand', 'off_hand', 'two_hand'],
    slotQueryOverrides: { off_hand: 'main_hand' }, // Fury usually wants weapons in OH
  },
  paladin: {
    allowedSlots: ['main_hand', 'off_hand', 'two_hand'],
  },
  death_knight: {
    allowedSlots: ['main_hand', 'off_hand', 'two_hand'],
    slotQueryOverrides: { off_hand: 'main_hand' }, // Frost DW
  },
  shaman: {
    allowedSlots: ['main_hand', 'off_hand', 'two_hand'],
    // Enh needs weapons, Resto/Ele need shields.
  },
  monk: {
    allowedSlots: ['main_hand', 'off_hand', 'two_hand'],
    slotQueryOverrides: { off_hand: 'main_hand' }, // WW uses weapons
  },
  priest: {
    allowedSlots: ['main_hand', 'off_hand', 'two_hand'],
  },
  mage: {
    allowedSlots: ['main_hand', 'off_hand', 'two_hand'],
  },
  warlock: {
    allowedSlots: ['main_hand', 'off_hand', 'two_hand'],
  },
  druid: {
    allowedSlots: ['main_hand', 'off_hand', 'two_hand'],
  },
  evoker: {
    allowedSlots: ['main_hand', 'off_hand', 'two_hand'],
  },
};

export const getClassWeaponConfig = (className?: string): ClassWeaponConfig | undefined => {
  if (!className) return undefined;
  return CLASS_WEAPON_CONFIG[normalizeClass(className)];
};

export const getClassSlotOverrides = (className?: string) => {
  if (!className) return undefined;
  return CLASS_SLOT_OVERRIDES[normalizeClass(className)];
};

/**
 * Spec-level slot query overrides — take priority over class-level config.
 * Specs listed here REPLACE the class slotQueryOverrides for the matching slot.
 */
export const SPEC_SLOT_QUERY_OVERRIDES: Record<string, Record<string, string>> = {
  Fury: { off_hand: 'main_hand' },
  Enhancement: { off_hand: 'main_hand' },
};

/**
 * Specs that explicitly cancel the class-level slotQueryOverrides.
 * (i.e. use the real slot as-is — e.g. Prot Warrior wants shields, not weapons)
 */
export const SPEC_SLOT_QUERY_RESET = new Set([
  'Protection', // Warrior Prot: shield in off_hand
  'Arms', // Warrior Arms: 2H weapon, off_hand not relevant
  'Elemental', // Shaman Elemental: off-hand item
  'Restoration', // Shaman Restoration: shield
  'Mistweaver', // Monk Heal: off-hand item, not weapon
  'Brewmaster', // Monk Tank: 1H weapon in off_hand (not DW override)
  'Blood', // DK Blood: 2H, no off_hand
  'Unholy', // DK Unholy: 2H, no off_hand
]);
