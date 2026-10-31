const { prisma } = require('../../data');
const {
  SLOT_INVENTORY_TYPES,
  ID_TO_CLASS,
  CLASS_RESTRICTIONS,
  CLASS_SLOT_OVERRIDES,
  SPEC_SLOT_INVENTORY_TYPES,
} = require('../../shared/constants/wow');
const { isWantedPriority } = require('../../shared/constants/wishlistPriority');
const { normalizeClass } = require('../../shared/utils/normalizeClass');

async function getCharacterWishlist(characterId, specializationId) {
  return await prisma.character_wishlists
    .findMany({
      where: {
        characterId: parseInt(characterId, 10),
        specializationId: parseInt(specializationId, 10),
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            icon: true,
            itemLevel: true,
            quality: true,
          },
        },
      },
      orderBy: { slot: 'asc' },
    })
    .then((wishlists) =>
      wishlists.map((w) => ({
        ...w,
        itemName: w.item?.name,
        icon: w.item?.icon,
        ilvl: w.item?.itemLevel,
        quality: w.item?.quality,
        item: undefined,
      })),
    );
}

/**
 * Spécialisation dont la vue roster montre la wishlist, par personnage : sa
 * spé principale ; à défaut (spé non définie, SIMS-209), celle où il a rempli
 * le plus d'emplacements, la plus petite à égalité. Un personnage sans spé
 * n'est ainsi plus écarté de la vue ni du compte de complétion.
 * @param {{ characterId: number, specializationId: number, primarySpecId: number | null }[]} rows
 * @returns {Map<number, number>} characterId → specializationId affichée
 */
function displayedSpecByCharacter(rows) {
  const displayed = new Map();
  const countsWithoutSpec = new Map();
  for (const row of rows) {
    if (row.primarySpecId != null) {
      displayed.set(row.characterId, row.primarySpecId);
      continue;
    }
    const counts = countsWithoutSpec.get(row.characterId) || new Map();
    counts.set(row.specializationId, (counts.get(row.specializationId) || 0) + 1);
    countsWithoutSpec.set(row.characterId, counts);
  }
  for (const [characterId, counts] of countsWithoutSpec) {
    const [best] = [...counts].sort(([specA, a], [specB, b]) => b - a || specA - specB);
    displayed.set(characterId, best[0]);
  }
  return displayed;
}

/**
 * Get wishlist for all characters on a given realm, scoped to each
 * character's primary specialization (or, without one, the spec picked by
 * `displayedSpecByCharacter`).
 */
async function getRosterWishlists(realmId) {
  return await prisma.character_wishlists
    .findMany({
      where: {
        itemId: { not: null },
        character: {
          realmId: parseInt(realmId, 10),
        },
      },
      include: {
        character: {
          select: {
            id: true,
            name: true,
            class: true,
            spec: true,
            thumbnail: true,
            region: true,
            realm: true,
            specializationId: true,
          },
        },
        specialization: {
          select: { id: true, name: true, role: true, icon: true },
        },
        item: {
          select: {
            id: true,
            name: true,
            icon: true,
            itemLevel: true,
            quality: true,
          },
        },
      },
      orderBy: [{ character: { name: 'asc' } }, { slot: 'asc' }],
    })
    .then((rows) => {
      // « Je n'en veux pas » n'est pas un vœu (SIMS-205).
      const wishlists = rows.filter((w) => isWantedPriority(w.priority));
      // Prisma can't express "wishlist.specializationId == character.specializationId"
      // directly, so we filter the result to keep only the displayed spec rows.
      const displayed = displayedSpecByCharacter(
        wishlists.map((w) => ({
          characterId: w.character.id,
          specializationId: w.specializationId,
          primarySpecId: w.character.specializationId,
        })),
      );
      return wishlists
        .filter((w) => w.specializationId === displayed.get(w.character.id))
        .map((w) => ({
          ...w,
          itemName: w.item?.name,
          icon: w.item?.icon,
          ilvl: w.item?.itemLevel,
          quality: w.item?.quality,
          item: undefined,
        }));
    });
}

/**
 * Wishlists que la vue roster n'affiche pas (SIMS-212) : celles des autres spés
 * que la spé affichée (`displayedSpecByCharacter`), en général des off-specs.
 * La vue les signale au lieu de les masquer en silence, y compris pour un
 * personnage dont aucune ligne n'est affichée (wishlist remplie seulement
 * hors de sa spé principale).
 * @returns {Promise<Array<{
 *   character: { id: number, name: string, class: string, specializationId: number | null },
 *   displayedSpecializationId: number,
 *   hiddenSpecializations: Array<{ id: number, name: string, itemCount: number, isDeclaredOffSpec: boolean }>
 * }>>} un élément par personnage ayant au moins une wishlist masquée, par nom
 */
async function getRosterHiddenSpecWishlists(realmId) {
  const allRows = await prisma.character_wishlists.findMany({
    where: {
      itemId: { not: null },
      character: {
        realmId: parseInt(realmId, 10),
      },
    },
    select: {
      specializationId: true,
      priority: true,
      character: {
        select: {
          id: true,
          name: true,
          class: true,
          specializationId: true,
          offspecs: { select: { specializationId: true } },
        },
      },
      specialization: { select: { id: true, name: true } },
    },
    orderBy: [{ character: { name: 'asc' } }],
  });
  // « Je n'en veux pas » n'est pas un vœu (SIMS-205).
  const rows = allRows.filter((w) => isWantedPriority(w.priority));

  const displayed = displayedSpecByCharacter(
    rows.map((w) => ({
      characterId: w.character.id,
      specializationId: w.specializationId,
      primarySpecId: w.character.specializationId,
    })),
  );

  const byCharacter = new Map();
  for (const w of rows) {
    const characterId = w.character.id;
    if (w.specializationId === displayed.get(characterId)) continue;
    if (!byCharacter.has(characterId)) {
      const { offspecs, ...character } = w.character;
      byCharacter.set(characterId, {
        character,
        displayedSpecializationId: displayed.get(characterId),
        declaredOffSpecs: new Set(offspecs.map((o) => o.specializationId)),
        hidden: new Map(),
      });
    }
    const entry = byCharacter.get(characterId);
    const current = entry.hidden.get(w.specializationId) || {
      id: w.specializationId,
      name: w.specialization?.name ?? null,
      itemCount: 0,
      isDeclaredOffSpec: entry.declaredOffSpecs.has(w.specializationId),
    };
    current.itemCount += 1;
    entry.hidden.set(w.specializationId, current);
  }

  return [...byCharacter.values()].map(({ character, displayedSpecializationId, hidden }) => ({
    character,
    displayedSpecializationId,
    hiddenSpecializations: [...hidden.values()].sort((a, b) => a.id - b.id),
  }));
}

async function setWishlistItem(characterId, specializationId, slot, itemId, priority = 0) {
  const result = await prisma.character_wishlists.upsert({
    where: {
      characterId_specializationId_slot: {
        characterId: parseInt(characterId, 10),
        specializationId: parseInt(specializationId, 10),
        slot,
      },
    },
    update: {
      itemId: itemId ? parseInt(itemId, 10) : null,
      priority: parseInt(priority, 10),
    },
    create: {
      characterId: parseInt(characterId, 10),
      specializationId: parseInt(specializationId, 10),
      slot,
      itemId: itemId ? parseInt(itemId, 10) : null,
      priority: parseInt(priority, 10),
    },
  });
  return result.id;
}

async function removeWishlistItem(characterId, specializationId, slot) {
  try {
    await prisma.character_wishlists.delete({
      where: {
        characterId_specializationId_slot: {
          characterId: parseInt(characterId, 10),
          specializationId: parseInt(specializationId, 10),
          slot,
        },
      },
    });
    return 1;
  } catch (e) {
    if (e.code === 'P2025') return 0;
    throw e;
  }
}

/**
 * Shared query helper: fetch boss-drop + tier-token items for given inventory types.
 * @param {number[]} inventoryTypes
 * @param {object|null} restrictions - CLASS_RESTRICTIONS entry
 * @param {string|null} className - normalised class name for tier token filtering
 * @param {string} extension
 * @param {string} season
 * @param {number|null} classId - used for allowableClasses post-filter
 */
async function queryItems(
  inventoryTypes,
  restrictions,
  className,
  extension,
  season,
  classId = null,
) {
  let classFilter = {};
  if (restrictions) {
    const allowedArmor = restrictions.armor;
    const allowedWeapon = restrictions.weapon;
    classFilter = {
      OR: [
        { inventoryType: { in: [2, 11, 12, 16] } }, // Accessories
        { AND: [{ itemClass: 4 }, { itemSubClass: { in: allowedArmor } }] }, // Armor
        { AND: [{ itemClass: 2 }, { itemSubClass: { in: allowedWeapon } }] }, // Weapons
        { itemClass: { notIn: [2, 4] } }, // Misc items
      ],
    };
  }

  const bossDropItems = await prisma.items.findMany({
    where: {
      inventoryType: { in: inventoryTypes },
      boss_drop: {
        some: {
          boss: { extension, season },
        },
      },
      ...classFilter,
    },
    include: {
      boss_drop: {
        include: { boss: { select: { name: true } } },
        take: 1,
      },
    },
  });

  const tokenItems = await prisma.items.findMany({
    where: {
      inventoryType: { in: inventoryTypes },
      tokens: {
        some: {
          extension,
          season,
          ...(className ? { class: className } : {}),
        },
      },
      ...classFilter,
    },
  });

  const bossItems = bossDropItems.map((item) => ({
    ...item,
    bossName: item.boss_drop[0]?.boss?.name || 'Unknown',
    boss_drop: undefined,
  }));

  const tierItems = tokenItems.map((item) => ({
    ...item,
    bossName: 'Tier Set Token',
    tokens: undefined,
  }));

  let results = [...bossItems, ...tierItems];

  if (classId) {
    results = results.filter((item) => {
      if (!item.allowableClasses) return true;
      try {
        const allowed = JSON.parse(item.allowableClasses);
        if (Array.isArray(allowed) && allowed.length > 0) {
          return allowed.includes(classId);
        }
      } catch {
        // ignore
      }
      return true;
    });
  }

  results.sort((a, b) => {
    if (b.itemLevel !== a.itemLevel) return b.itemLevel - a.itemLevel;
    return a.name.localeCompare(b.name);
  });

  return results;
}

/**
 * @param {string} slot - Equipment slot
 * @param {string} extension - WoW extension (e.g., 'The-War-Within', 'Midnight')
 * @param {string} season - Season identifier (e.g., 'season-03')
 * @param {number|null} classId - Optional class ID for filtering
 * @param {string|null} specName - Optional spec name for weapon slot filtering
 * @returns {Promise<Array>} Array of available items
 */
async function getAvailableItemsForSlot(slot, extension, season, classId = null, specName = null) {
  const weaponSlots = ['main_hand', 'off_hand', 'two_hand'];
  if (specName && classId && weaponSlots.includes(slot)) {
    const specConfig = SPEC_SLOT_INVENTORY_TYPES[classId]?.[specName];
    if (specConfig) {
      const types = specConfig[slot];
      if (types === null) return [];
      if (Array.isArray(types)) {
        const WEAPON_INVENTORY_TYPES = [13, 15, 17, 21, 25, 26];
        const isWeapon = types.some((t) => WEAPON_INVENTORY_TYPES.includes(t));
        const restrictions = isWeapon ? CLASS_RESTRICTIONS[classId] : null;
        const className = ID_TO_CLASS[classId];
        return queryItems(types, restrictions, className, extension, season, classId);
      }
    }
  }

  let inventoryTypes = SLOT_INVENTORY_TYPES[slot] || [];

  if (classId && CLASS_SLOT_OVERRIDES[classId]?.[slot]) {
    inventoryTypes = [...new Set([...inventoryTypes, ...CLASS_SLOT_OVERRIDES[classId][slot]])];
  }

  if (inventoryTypes.length === 0) {
    return [];
  }

  const restrictions = classId ? CLASS_RESTRICTIONS[classId] : null;
  const className = classId ? ID_TO_CLASS[classId] : null;

  return queryItems(inventoryTypes, restrictions, className, extension, season, classId);
}

/**
 * Copy a wishlist from a source (character, spec) pair to a
 * target (character, spec) pair, replacing the target's existing wishlist.
 */
async function copyWishlistFromCharacter(targetCharId, targetSpecId, sourceCharId, sourceSpecId) {
  return await prisma.$transaction(async (tx) => {
    await tx.character_wishlists.deleteMany({
      where: {
        characterId: targetCharId,
        specializationId: targetSpecId,
      },
    });

    const sourceItems = await tx.character_wishlists.findMany({
      where: {
        characterId: sourceCharId,
        specializationId: sourceSpecId,
      },
    });

    if (sourceItems.length === 0) {
      return { success: true, count: 0 };
    }

    const itemsToCreate = sourceItems
      .filter((item) => item.itemId !== null)
      .map((item) => ({
        characterId: targetCharId,
        specializationId: targetSpecId,
        itemId: item.itemId,
        slot: item.slot,
        priority: item.priority || 0,
      }));

    if (itemsToCreate.length > 0) {
      await tx.character_wishlists.createMany({
        data: itemsToCreate,
      });
    }

    return { success: true, count: itemsToCreate.length };
  });
}

const WEAPON_SLOTS = ['main_hand', 'off_hand', 'two_hand'];

/**
 * Get wishlist completion counts per character for a realm.
 * Counts are scoped to each character's primary specialization (or, without
 * one, the spec picked by `displayedSpecByCharacter`, SIMS-209).
 * Weapon slots (main_hand/off_hand/two_hand) count as 1 group, so total = 15.
 * Returns: `{ [characterId]: number }`
 */
async function getRosterWishlistCompletion(realmId) {
  const characters = await prisma.characters.findMany({
    where: {
      realmId: parseInt(realmId, 10),
      archived: 0,
    },
    select: { id: true, specializationId: true },
  });

  if (characters.length === 0) return {};

  const primarySpecByCharId = new Map(characters.map((c) => [c.id, c.specializationId]));
  const charIds = characters.map((c) => c.id);

  const allRows = await prisma.character_wishlists.findMany({
    where: {
      itemId: { not: null },
      characterId: { in: charIds },
    },
    select: { characterId: true, specializationId: true, slot: true, priority: true },
  });
  // « Je n'en veux pas » ne remplit pas l'emplacement (SIMS-205).
  const rows = allRows.filter((row) => isWantedPriority(row.priority));

  const displayed = displayedSpecByCharacter(
    rows.map((row) => ({
      characterId: row.characterId,
      specializationId: row.specializationId,
      primarySpecId: primarySpecByCharId.get(row.characterId) ?? null,
    })),
  );

  const result = {};
  const weaponCounts = {};

  for (const row of rows) {
    if (displayed.get(row.characterId) !== row.specializationId) continue;

    const id = row.characterId;
    if (!result[id]) result[id] = 0;
    result[id] += 1;

    if (WEAPON_SLOTS.includes(row.slot)) {
      weaponCounts[id] = (weaponCounts[id] ?? 0) + 1;
    }
  }

  for (const [idStr, count] of Object.entries(weaponCounts)) {
    const id = parseInt(idStr, 10);
    result[id] -= Math.max(0, count - 1);
  }

  return result;
}

/**
 * Returns every specialization available for a character's class, plus a
 * flag marking the character's primary spec (`characters.specializationId`).
 */
async function getCharacterSpecs(characterId) {
  const character = await prisma.characters.findUnique({
    where: { id: parseInt(characterId, 10) },
    select: {
      id: true,
      class: true,
      specializationId: true,
      classes: { select: { id: true } },
    },
  });

  if (!character) return null;

  const specs = await prisma.specializations.findMany({
    where: { classId: character.classes.id },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, role: true, icon: true, classId: true },
  });

  return specs.map((s) => ({
    ...s,
    isPrimary: s.id === character.specializationId,
  }));
}

async function specBelongsToCharacter(characterId, specializationId) {
  const character = await prisma.characters.findUnique({
    where: { id: parseInt(characterId, 10) },
    select: { classes: { select: { id: true } } },
  });
  if (!character) return false;

  const spec = await prisma.specializations.findUnique({
    where: { id: parseInt(specializationId, 10) },
    select: { classId: true },
  });
  if (!spec) return false;

  return spec.classId === character.classes.id;
}

/**
 * Sims d'un personnage pour une difficulté et une liste d'objets, toutes spés
 * confondues, la plus récente d'abord (SIMS-205). Le choix de la spé se fait
 * ensuite avec la logique des upgrades par boss (SIMS-211).
 * @param {number} characterId
 * @param {string} difficulty
 * @param {number[]} itemIds
 */
async function getCharacterSims(characterId, difficulty, itemIds) {
  if (itemIds.length === 0) return [];
  return prisma.upgrades.findMany({
    where: {
      characterID: parseInt(characterId, 10),
      difficulty,
      itemID: { in: itemIds },
    },
    select: {
      itemID: true,
      dps: true,
      baseDps: true,
      spec: true,
      specializationId: true,
      reportID: true,
      timeStamp: true,
    },
    orderBy: [{ timeStamp: 'desc' }],
  });
}

/**
 * Classe d'un personnage et ses spés, pour rattacher une sim sans spé par son
 * libellé (même règle que l'import).
 * @param {string | null | undefined} className
 */
async function getClassWithSpecializations(className) {
  if (!className) return null;
  return prisma.classes.findUnique({
    where: { name: normalizeClass(className) },
    select: {
      name: true,
      specializations: {
        select: { id: true, name: true, icon: true, role: true },
        orderBy: { id: 'asc' },
      },
    },
  });
}

/**
 * Derniers relevés d'équipement d'un personnage (SIMS-205) : le plus récent
 * de la spé demandée, et le plus récent toutes spés confondues.
 * @param {number} characterId
 * @param {number} specializationId
 */
async function getLatestGearSnapshots(characterId, specializationId) {
  const select = {
    specializationId: true,
    timestamp: true,
    items: { select: { slot: true, itemId: true, ilevel: true } },
  };
  const cid = parseInt(characterId, 10);
  const [forSpec, latest] = await Promise.all([
    prisma.character_gear_snapshots.findFirst({
      where: { characterId: cid, specializationId: parseInt(specializationId, 10) },
      orderBy: { timestamp: 'desc' },
      select,
    }),
    prisma.character_gear_snapshots.findFirst({
      where: { characterId: cid },
      orderBy: { timestamp: 'desc' },
      select,
    }),
  ]);
  return { forSpec, latest };
}

/**
 * Boss de la saison qui lâchent des objets (SIMS-205) : directement, ou par le
 * jeton qui les donne (pièces de set). Données brutes, rapprochées par
 * `wishlist.insights`.
 * @param {number[]} itemIds
 * @param {string} extension
 * @param {string} season
 */
async function getRaidDropsOfItems(itemIds, extension, season) {
  if (itemIds.length === 0) return { drops: [], tokenLinks: [] };
  const bossSelect = { select: { id: true, name: true, order: true } };
  const tokenLinks = await prisma.item_tokens.findMany({
    where: { rewardItemId: { in: itemIds } },
    select: { tokenItemId: true, rewardItemId: true },
  });
  const dropItemIds = [...new Set([...itemIds, ...tokenLinks.map((t) => t.tokenItemId)])];
  const drops = await prisma.boss_drop.findMany({
    where: { itemId: { in: dropItemIds }, boss: { extension, season } },
    select: { itemId: true, boss: bossSelect },
  });
  return { drops, tokenLinks };
}

module.exports = {
  getCharacterSims,
  getClassWithSpecializations,
  getLatestGearSnapshots,
  getRaidDropsOfItems,
  getCharacterWishlist,
  setWishlistItem,
  removeWishlistItem,
  getAvailableItemsForSlot,
  getRosterWishlists,
  getRosterHiddenSpecWishlists,
  getRosterWishlistCompletion,
  displayedSpecByCharacter,
  copyWishlistFromCharacter,
  getCharacterSpecs,
  specBelongsToCharacter,
};
