/**
 * Correspondance entre le type d'inventaire d'un objet et les emplacements
 * où il peut se porter.
 *
 * Certains types ouvrent deux emplacements : anneaux, bijoux, et armes à une
 * main qui se tiennent en principale comme en secondaire.
 */

/** Type d'inventaire → emplacement unique, pour les cas sans ambiguïté. */
export const INVENTORY_TYPE_TO_SLOT: Record<number, string> = {
  1: 'head',
  2: 'neck',
  3: 'shoulders',
  5: 'chest',
  6: 'waist',
  7: 'legs',
  8: 'feet',
  9: 'wrists',
  10: 'hands',
  11: 'finger1',
  12: 'trinket1',
  13: 'main_hand',
  16: 'back',
  17: 'main_hand',
  21: 'main_hand',
  22: 'off_hand',
  23: 'off_hand',
};

/** Types portant deux emplacements interchangeables. */
const PAIRED_SLOTS: Record<number, string[]> = {
  11: ['finger1', 'finger2'],
  12: ['trinket1', 'trinket2'],
  13: ['main_hand', 'off_hand'],
};

/** Deux mains, armes de tir et armes à distance : main droite seulement. */
const MAIN_HAND_ONLY = new Set([15, 17, 21, 26]);

/** Boucliers, tenus en main gauche et objets de main gauche. */
const OFF_HAND_ONLY = new Set([14, 22, 23]);

export function getPossibleSlots(inventoryType?: number | null): string[] {
  if (!inventoryType) return [];

  if (PAIRED_SLOTS[inventoryType]) return [...PAIRED_SLOTS[inventoryType]];
  if (MAIN_HAND_ONLY.has(inventoryType)) return ['main_hand'];
  if (OFF_HAND_ONLY.has(inventoryType)) return ['off_hand'];

  const slot = INVENTORY_TYPE_TO_SLOT[inventoryType];

  return slot ? [slot] : [];
}
