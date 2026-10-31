const VALID_SLOTS = [
  'head',
  'neck',
  'shoulders',
  'back',
  'chest',
  'wrists',
  'hands',
  'waist',
  'legs',
  'feet',
  'finger1',
  'finger2',
  'trinket1',
  'trinket2',
  'main_hand',
  'off_hand',
  'two_hand',
];

/**
 * Map of slot names to WoW Inventory Type IDs
 * Derived from DB usage and https://wowpedia.fandom.com/wiki/InventoryType
 */
const SLOT_INVENTORY_TYPES = {
  misc: [0],
  head: [1],
  neck: [2],
  shoulders: [3],
  back: [16],
  chest: [5, 20],
  wrists: [9],
  hands: [10],
  waist: [6],
  legs: [7],
  feet: [8],
  finger1: [11],
  finger2: [11],
  trinket1: [12],
  trinket2: [12],
  main_hand: [13, 21], // One-Hand, Main-Hand
  off_hand: [14, 22, 23], // Shield, Off-Hand, Held In Off-Hand
  two_hand: [17, 15, 26, 25], // Two-Hand, Bows, Guns, Crossbows
};

/**
 * Map of Class ID to normalized Class Name (matches DB item_tokens)
 */
const ID_TO_CLASS = {
  1: 'warrior',
  2: 'paladin',
  3: 'hunter',
  4: 'rogue',
  5: 'priest',
  6: 'death_knight',
  7: 'shaman',
  8: 'mage',
  9: 'warlock',
  10: 'monk',
  11: 'druid',
  12: 'demon_hunter',
  13: 'evoker',
};

/**
 * Class Specific Item Restrictions
 * Class ID -> { armor: [subclass codes], weapon: [subclass codes] }
 */
const CLASS_RESTRICTIONS = {
  1: {
    // Warrior
    armor: [4, 6], // Plate, Shield
    weapon: [0, 1, 4, 5, 6, 7, 8, 13, 15, 17, 18, 20],
  },
  2: {
    // Paladin
    armor: [4, 6], // Plate, Shield
    weapon: [0, 1, 4, 5, 6, 7, 8, 17, 20],
  },
  3: {
    // Hunter
    armor: [3], // Mail
    weapon: [0, 1, 2, 3, 6, 7, 8, 10, 13, 15, 17, 18, 20],
  },
  4: {
    // Rogue
    armor: [2], // Leather
    weapon: [0, 4, 7, 13, 15, 2, 3, 18, 20],
  },
  5: {
    // Priest
    armor: [1, 0], // Cloth, Misc (Held In Off-hand)
    weapon: [4, 10, 15, 19, 20],
  },
  6: {
    // Death Knight
    armor: [4], // Plate
    weapon: [0, 1, 4, 5, 6, 7, 8, 20],
  },
  7: {
    // Shaman
    armor: [3, 6], // Mail, Shield
    weapon: [0, 1, 4, 5, 13, 15, 10, 20],
  },
  8: {
    // Mage
    armor: [1, 0], // Cloth, Misc (Held In Off-hand)
    weapon: [7, 10, 15, 19, 20],
  },
  9: {
    // Warlock
    armor: [1, 0], // Cloth, Misc (Held In Off-hand)
    weapon: [7, 10, 15, 19, 20],
  },
  10: {
    // Monk
    armor: [2, 0],
    // Mistweaver can use Off-hands.
    weapon: [0, 4, 7, 6, 10, 13, 20],
  },
  11: {
    // Druid
    armor: [2, 0], // Leather, Misc (Held In Off-hand)
    weapon: [4, 5, 6, 10, 13, 15, 20],
  },
  12: {
    // Demon Hunter
    armor: [2], // Leather
    weapon: [0, 7, 9, 13, 15, 20],
  },
  13: {
    // Evoker
    armor: [3, 0], // Mail, Misc (Held In Off-hand)
    weapon: [0, 4, 7, 10, 13, 15, 20],
  },
};

/**
 * Class-level slot overrides — used as fallback when specName is not provided.
 * Only kept for classes where all specs behave identically for that slot.
 */
const CLASS_SLOT_OVERRIDES = {
  1: {
    // Warrior — main_hand gets Two-Hand (fallback, spec config preferred)
    main_hand: [17],
  },
};

/**
 * Spec-level inventory types for weapon slots (main_hand, off_hand, two_hand).
 * These take priority over SLOT_INVENTORY_TYPES + CLASS_SLOT_OVERRIDES.
 * null → slot not applicable for this spec (returns empty array).
 * Armor slots (head, chest…) are spec-independent and use class-level filtering.
 *
 * Inventory type IDs:
 *   13=One-Hand  14=Shield  15=Bow  17=Two-Hand  21=Main Hand
 *   22=Off-Hand  23=Held In Off-Hand  25=Crossbow  26=Gun
 */
const SPEC_SLOT_INVENTORY_TYPES = {
  1: {
    // Warrior
    Arms: { main_hand: null, off_hand: null, two_hand: 17 },
    Fury: { main_hand: [17], off_hand: [17], two_hand: null },
    Protection: { main_hand: [13, 21], off_hand: [14], two_hand: null },
  },
  2: {
    // Paladin
    Holy: { main_hand: [13, 21], off_hand: [14, 22, 23], two_hand: null },
    Protection: { main_hand: [13, 21], off_hand: [14], two_hand: null },
    Retribution: { main_hand: [13, 21, 17], off_hand: null, two_hand: [17] },
  },
  3: {
    // Hunter
    'Beast Mastery': { main_hand: null, off_hand: null, two_hand: [15, 25, 26] },
    Marksmanship: { main_hand: null, off_hand: null, two_hand: [15, 25, 26] },
    Survival: { main_hand: null, off_hand: null, two_hand: [17] },
  },
  4: {
    // Rogue — all specs DW
    Assassination: { main_hand: [13, 21], off_hand: [13, 21], two_hand: null },
    Outlaw: { main_hand: [13, 21], off_hand: [13, 21], two_hand: null },
    Subtlety: { main_hand: [13, 21], off_hand: [13, 21], two_hand: null },
  },
  5: {
    // Priest — all specs same
    Discipline: { main_hand: [13, 21], off_hand: [22, 23], two_hand: [17] },
    Holy: { main_hand: [13, 21], off_hand: [22, 23], two_hand: [17] },
    Shadow: { main_hand: [13, 21], off_hand: [22, 23], two_hand: [17] },
  },
  6: {
    // Death Knight
    Blood: { main_hand: null, off_hand: null, two_hand: [17] },
    Frost: { main_hand: [13, 21], off_hand: [13, 21], two_hand: [17] },
    Unholy: { main_hand: [13, 21, 17], off_hand: null, two_hand: [17] },
  },
  7: {
    // Shaman
    Enhancement: { main_hand: [13, 21], off_hand: [13, 21], two_hand: null },
    Elemental: { main_hand: [13, 21], off_hand: [14, 22, 23], two_hand: null },
    Restoration: { main_hand: [13, 21], off_hand: [14, 22, 23], two_hand: [17] },
  },
  8: {
    // Mage — all specs same
    Arcane: { main_hand: [13, 21], off_hand: [22, 23], two_hand: [17] },
    Fire: { main_hand: [13, 21], off_hand: [22, 23], two_hand: [17] },
    Frost: { main_hand: [13, 21], off_hand: [22, 23], two_hand: [17] },
  },
  9: {
    // Warlock — all specs same
    Affliction: { main_hand: [13, 21], off_hand: [22, 23], two_hand: [17] },
    Demonology: { main_hand: [13, 21], off_hand: [22, 23], two_hand: [17] },
    Destruction: { main_hand: [13, 21], off_hand: [22, 23], two_hand: [17] },
  },
  10: {
    // Monk
    Brewmaster: { main_hand: [13, 21], off_hand: [13, 21], two_hand: [17] },
    Mistweaver: { main_hand: [13, 21], off_hand: [22, 23], two_hand: [17] },
    Windwalker: { main_hand: [13, 21], off_hand: [13, 21], two_hand: [17] },
  },
  11: {
    // Druid
    Balance: { main_hand: [13, 21], off_hand: [22, 23], two_hand: [17] },
    Feral: { main_hand: [13, 21], off_hand: null, two_hand: [17] },
    Guardian: { main_hand: [13, 21], off_hand: null, two_hand: [17] },
    Restoration: { main_hand: [13, 21], off_hand: [22, 23], two_hand: [17] },
  },
  12: {
    // Demon Hunter — all specs DW
    Havoc: { main_hand: [13, 21], off_hand: [13, 21], two_hand: null },
    Devoreur: { main_hand: [13, 21], off_hand: [13, 21], two_hand: null },
    Vengeance: { main_hand: [13, 21], off_hand: [13, 21], two_hand: null },
  },
  13: {
    // Evoker — all specs same
    Devastation: { main_hand: [13, 21], off_hand: [22, 23], two_hand: [17] },
    Augmentation: { main_hand: [13, 21], off_hand: [22, 23], two_hand: [17] },
    Preservation: { main_hand: [13, 21], off_hand: [22, 23], two_hand: [17] },
  },
};

module.exports = {
  VALID_SLOTS,
  SLOT_INVENTORY_TYPES,
  ID_TO_CLASS,
  CLASS_RESTRICTIONS,
  CLASS_SLOT_OVERRIDES,
  SPEC_SLOT_INVENTORY_TYPES,
};
