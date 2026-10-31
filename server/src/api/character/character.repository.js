const { prisma } = require('../../data');

async function listCharacters(realmId) {
  const where = {};
  if (realmId) {
    where.realmId = parseInt(realmId, 10);
  }
  const characters = await prisma.characters.findMany({
    where,
    include: {
      specialization: true,
      upgrades: {
        orderBy: { timeStamp: 'desc' },
        select: {
          reportID: true,
          timeStamp: true,
          difficulty: true,
          dps: true,
          baseDps: true,
        },
      },
    },
  });

  const DIFFICULTIES = ['normal', 'heroic', 'mythic'];
  return characters.map(({ upgrades, ...c }) => {
    const reportsByDifficulty = {};
    for (const diff of DIFFICULTIES) {
      const diffUpgrades = upgrades.filter((u) => u.difficulty.toLowerCase() === diff);
      const match = diffUpgrades[0];
      if (!match) {
        reportsByDifficulty[diff] = null;
        continue;
      }
      const reportRows = diffUpgrades.filter((u) => u.reportID === match.reportID);
      const hasNoUpgrade =
        reportRows.length > 0 && reportRows.every((u) => Number(u.dps) <= Number(u.baseDps));
      reportsByDifficulty[diff] = {
        id: match.reportID,
        timestamp: Number(match.timeStamp),
        hasNoUpgrade,
      };
    }
    const mostRecent = upgrades[0];
    return {
      ...c,
      recentReportId: mostRecent?.reportID || null,
      recentReportTimestamp: mostRecent?.timeStamp ? Number(mostRecent.timeStamp) : null,
      reportsByDifficulty,
    };
  });
}

async function findCharacterById(id) {
  return await prisma.characters.findUnique({
    where: { id: parseInt(id) },
    include: {
      specialization: true,
    },
  });
}

async function findCharacterByName(name) {
  return await prisma.characters.findFirst({
    where: {
      name: {
        equals: name,
        mode: 'insensitive',
      },
    },
    include: {
      specialization: true,
    },
  });
}

async function findCharacterIdByNameAndRealm(name, realm) {
  const character = await prisma.characters.findFirst({
    where: {
      name: {
        equals: name,
        mode: 'insensitive',
      },
      realm: {
        equals: realm,
        mode: 'insensitive',
      },
    },
    // realmId : l'import de guilde doit savoir à quelle guilde il appartient déjà
    select: { id: true, realmId: true },
  });
  return character;
}

async function createCharacter(fields) {
  const defaults = {
    // Sans spé : null, avec specializationId (SIMS-213) ; plus de '' en 3e valeur.
    spec: null,
    specializationId: null,
    region: 'EU',
    thumbnail: null,
    lastModified: new Date(),
    currentPeriodKeyCount: 0,
    ilvl: 0,
    score: 0,
    ManaforgeBuff: '0',
    discordTag: '',
  };

  if (fields.lastModified && typeof fields.lastModified === 'number') {
    fields.lastModified = new Date(fields.lastModified);
  }

  if (fields.archivedAt && typeof fields.archivedAt === 'number') {
    fields.archivedAt = new Date(fields.archivedAt);
  }

  const data = {
    ...defaults,
    ...fields,
    ManaforgeBuff: fields.ManaforgeBuff !== undefined ? String(fields.ManaforgeBuff) : '0',
    realmId: fields.realmId ? parseInt(fields.realmId, 10) : null,
    userId: fields.userId ? String(fields.userId) : null,
  };

  const character = await prisma.characters.create({ data });
  return character.id;
}

async function updateCharacterById(id, fields) {
  if (fields.lastModified && typeof fields.lastModified === 'number') {
    fields.lastModified = new Date(fields.lastModified);
  } else if (fields.lastModified && typeof fields.lastModified !== 'object') {
    fields.lastModified = new Date();
  }

  if (fields.ManaforgeBuff !== undefined && fields.ManaforgeBuff !== null) {
    fields.ManaforgeBuff = String(fields.ManaforgeBuff);
  }

  if (fields.userId !== undefined && fields.userId !== null) {
    fields.userId = String(fields.userId);
  }

  const updated = await prisma.characters.update({
    where: { id: parseInt(id, 10) },
    data: fields,
  });
  return { changes: 1, lastID: updated.id };
}

async function findCharacterByDiscordTag(discordTag) {
  if (!discordTag) return null;

  const cleaned = discordTag.replace(/^@/, '').replace(/#0$/i, '');
  if (!cleaned) return null;

  const variants = [cleaned, `@${cleaned}`, `${cleaned}#0`, `@${cleaned}#0`];

  const exact = await prisma.characters.findFirst({
    where: {
      archived: 0,
      OR: variants.map((v) => ({ discordTag: { equals: v, mode: 'insensitive' } })),
    },
    orderBy: { lastModified: 'desc' },
  });
  if (exact) return exact;

  const legacy = await prisma.characters.findFirst({
    where: {
      archived: 0,
      OR: [
        { discordTag: { startsWith: `${cleaned}#`, mode: 'insensitive' } },
        { discordTag: { startsWith: `@${cleaned}#`, mode: 'insensitive' } },
      ],
    },
    orderBy: { lastModified: 'desc' },
  });
  if (!legacy) return null;

  prisma.characters
    .update({ where: { id: legacy.id }, data: { discordTag: cleaned } })
    .catch((err) =>
      console.error(
        `[findCharacterByDiscordTag] Failed to migrate tag for ${legacy.id}:`,
        err.message,
      ),
    );

  return legacy;
}

/**
 * @param {{ includeArchived?: boolean, includePending?: boolean, realmId?: number | null }} [options]
 */
async function listCharactersRosterStatus({
  includeArchived = false,
  includePending = true,
  realmId = null,
} = {}) {
  const where = {
    AND: [
      includeArchived ? {} : { archived: 0 },
      includePending ? {} : { status: { not: 'pending' } },
      realmId ? { realmId: parseInt(realmId) } : {},
    ],
  };

  const characters = await prisma.characters.findMany({
    where,
    include: {
      upgrades: {
        orderBy: {
          timeStamp: 'desc',
        },
        select: {
          reportID: true,
          timeStamp: true,
          difficulty: true,
          dps: true,
          baseDps: true,
        },
      },
      specialization: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  let guestUserIdSet = new Set();
  if (realmId) {
    const guests = await prisma.realm_user_guests.findMany({
      where: { realmId: parseInt(realmId, 10) },
      select: { userId: true },
    });
    guestUserIdSet = new Set(guests.map((g) => String(g.userId)));
  }

  return characters.map(({ discordTag, upgrades, ...c }) => {
    const DIFFICULTIES = ['normal', 'heroic', 'mythic'];
    const reportsByDifficulty = {};
    for (const diff of DIFFICULTIES) {
      const diffUpgrades = upgrades.filter((u) => u.difficulty.toLowerCase() === diff);
      const match = diffUpgrades[0];
      if (!match) {
        reportsByDifficulty[diff] = null;
        continue;
      }
      const reportRows = diffUpgrades.filter((u) => u.reportID === match.reportID);
      const hasNoUpgrade =
        reportRows.length > 0 && reportRows.every((u) => Number(u.dps) <= Number(u.baseDps));
      reportsByDifficulty[diff] = {
        id: match.reportID,
        timestamp: Number(match.timeStamp),
        hasNoUpgrade,
      };
    }
    const mostRecent = upgrades[0];
    return {
      ...c,
      hasDiscord: !!(discordTag && discordTag.trim() !== ''),
      isGuest: c.userId ? guestUserIdSet.has(String(c.userId)) : false,
      recentReportId: mostRecent?.reportID || null,
      recentReportTimestamp: mostRecent?.timeStamp ? Number(mostRecent.timeStamp) : null,
      reportsByDifficulty,
    };
  });
}

async function listCharactersWithDiscordTag() {
  return await prisma.characters.findMany({
    where: {
      discordTag: {
        not: null,
      },
      AND: [{ discordTag: { not: '' } }, { archived: 0 }],
    },
  });
}

async function ensureCharacterExists(name, realm, realmId) {
  const existing = await findCharacterIdByNameAndRealm(name, realm);
  if (existing) {
    if (realmId) {
      await updateCharacterById(existing.id, { realmId });
    }
    return existing.id;
  }
  return createCharacter({ name, realm, realmId: realmId || null });
}

async function listCharactersByUserId(userId) {
  return await prisma.characters
    .findMany({
      where: {
        userId: String(userId),
        realmId: { not: null }, // Exclude characters removed from roster
      },
      include: {
        realmRelation: {
          select: {
            guildName: true,
            server: true,
          },
        },
      },
    })
    .then((chars) =>
      chars.map((c) => ({
        ...c,
        guildName: c.realmRelation?.guildName,
        realmSlug: c.realmRelation?.server,
        realmRelation: undefined,
      })),
    );
}

async function getLatestGearSnapshot(characterId) {
  const snapshot = await prisma.character_gear_snapshots.findFirst({
    where: { characterId: parseInt(characterId, 10) },
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        select: {
          slot: true,
          itemId: true,
          ilevel: true,
          encodedItem: true,
          itemSource: true,
          craftingQuality: true,
          upgradeLevel: true,
          upgradeMax: true,
          upgradeName: true,
          upgradeFullName: true,
          upgradeBonusId: true,
          upgradeItemLevel: true,
          upgradeGroup: true,
          baseItemLevel: true,
          item: {
            select: {
              id: true,
              name: true,
              icon: true,
              quality: true,
            },
          },
        },
      },
    },
  });
  return snapshot;
}

async function getAllLatestGearSnapshots(characterIds) {
  if (!characterIds || characterIds.length === 0) return {};

  const snapshots = await prisma.character_gear_snapshots.findMany({
    where: { characterId: { in: characterIds.map(Number) } },
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        select: {
          slot: true,
          itemId: true,
          ilevel: true,
          encodedItem: true,
          itemSource: true,
          craftingQuality: true,
          upgradeLevel: true,
          upgradeMax: true,
          upgradeName: true,
          upgradeFullName: true,
          upgradeBonusId: true,
          upgradeItemLevel: true,
          upgradeGroup: true,
          baseItemLevel: true,
          item: {
            select: { id: true, name: true, icon: true, quality: true },
          },
        },
      },
    },
  });

  const byCharacter = {};
  for (const s of snapshots) {
    if (!byCharacter[s.characterId]) byCharacter[s.characterId] = s;
  }
  return byCharacter;
}

/**
 * Classe et ses spécialisations, par nom déjà normalisé (normalizeClass).
 * Lu par resolveSpecialization (SIMS-213).
 * @param {string} className
 */
async function findClassWithSpecializations(className) {
  if (!className) return null;
  return await prisma.classes.findUnique({
    where: { name: className },
    include: { specializations: { orderBy: { id: 'asc' } } },
  });
}

/**
 * Toutes les classes et leurs spécialisations : données de référence servies au
 * front, qui n'en garde plus de copie (SIMS-212).
 */
async function listClassesWithSpecializations() {
  return await prisma.classes.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      specializations: {
        orderBy: { id: 'asc' },
        select: { id: true, name: true, classId: true, role: true, icon: true },
      },
    },
  });
}

/**
 * Off-specs déclarées d'un personnage, telles qu'en base : l'appelant écarte
 * celles qui ne sont plus valides (autre classe, spé devenue principale).
 * @param {number} characterId
 * @returns {Promise<number[]>}
 */
async function listOffSpecializationIds(characterId) {
  const rows = await prisma.character_offspecs.findMany({
    where: { characterId: parseInt(characterId, 10) },
    select: { specializationId: true },
    orderBy: { specializationId: 'asc' },
  });
  return rows.map((row) => row.specializationId);
}

/**
 * Spés pour lesquelles le personnage a des données de sim : upgrades ou
 * équipement importé, rattachés à une spé (SIMS-210).
 * @param {number} characterId
 * @returns {Promise<number[]>}
 */
async function listSimmedSpecializationIds(characterId) {
  const id = parseInt(characterId, 10);
  const [upgrades, snapshots] = await Promise.all([
    prisma.upgrades.findMany({
      where: { characterID: id, specializationId: { not: null } },
      distinct: ['specializationId'],
      select: { specializationId: true },
    }),
    prisma.character_gear_snapshots.findMany({
      where: { characterId: id, specializationId: { not: null } },
      distinct: ['specializationId'],
      select: { specializationId: true },
    }),
  ]);
  return [...new Set([...upgrades, ...snapshots].map((row) => row.specializationId))];
}

/**
 * Écrit en une transaction la spé principale (si fournie) et remplace la liste
 * des off-specs du personnage. Les valeurs sont déjà validées par l'usecase.
 * @param {number} characterId
 * @param {{ primary?: { spec: string, specializationId: number }, offSpecializationIds: number[] }} input
 */
async function replaceCharacterSpecializations(characterId, { primary, offSpecializationIds }) {
  const id = parseInt(characterId, 10);
  await prisma.$transaction(async (tx) => {
    if (primary) {
      await tx.characters.update({ where: { id }, data: primary });
    }
    await tx.character_offspecs.deleteMany({ where: { characterId: id } });
    if (offSpecializationIds.length > 0) {
      await tx.character_offspecs.createMany({
        data: offSpecializationIds.map((specializationId) => ({
          characterId: id,
          specializationId,
        })),
        skipDuplicates: true,
      });
    }
  });
}

/**
 * Pose la spé d'un personnage **seulement si elle est vide** (SIMS-208) :
 * `specializationId` null et `spec` null, '' ou l'ancien littéral 'dps'.
 * La condition est dans la requête : une spé choisie à la main entre-temps par
 * un officier n'est jamais écrasée.
 * @param {number} id
 * @param {{ spec: string, specializationId: number }} specialization
 * @returns {Promise<boolean>} true si la spé a été écrite
 */
async function fillSpecializationIfEmpty(id, { spec, specializationId }) {
  const result = await prisma.characters.updateMany({
    where: {
      id: parseInt(id, 10),
      specializationId: null,
      OR: [{ spec: null }, { spec: '' }, { spec: { equals: 'dps', mode: 'insensitive' } }],
    },
    data: { spec, specializationId },
  });
  return result.count > 0;
}

/**
 * Inserts new key runs for a character, ignoring duplicates.
 * @param {number} characterId
 * @param {Array<{dungeon: string, shortName?: string | null, keystoneLevel: number, completedAt: Date, score?: number | null, numUpgrades?: number | null, clearTimeMs?: number | null, parTimeMs?: number | null, raiderIoUrl?: string | null}>} runs
 * @returns {Promise<number>} number of runs inserted
 */
async function upsertKeyRuns(characterId, runs) {
  if (!runs || runs.length === 0) return 0;
  const result = await prisma.character_key_runs.createMany({
    data: runs.map((run) => ({
      characterId,
      dungeon: run.dungeon,
      shortName: run.shortName ?? null,
      keystoneLevel: run.keystoneLevel,
      completedAt: run.completedAt,
      score: run.score ?? null,
      numUpgrades: run.numUpgrades ?? null,
      clearTimeMs: run.clearTimeMs ?? null,
      parTimeMs: run.parTimeMs ?? null,
      raiderIoUrl: run.raiderIoUrl ?? null,
    })),
    skipDuplicates: true,
  });
  return result.count;
}

/**
 * @param {number} characterId
 * @param {Date} weekStart
 * @param {number} minLevel
 * @returns {Promise<number>}
 */
async function countWeeklyKeyRuns(characterId, weekStart, minLevel = 10) {
  return await prisma.character_key_runs.count({
    where: {
      characterId,
      keystoneLevel: { gte: minLevel },
      completedAt: { gte: weekStart },
    },
  });
}

/**
 * Returns per-character key-run counts for a given realm within [weekStart, weekEnd).
 * @param {number} realmId
 * @param {Date} weekStart
 * @param {Date} weekEnd
 * @param {number} minLevel
 * @returns {Promise<Array<{id:number,name:string,class:(string|number),realm:string,thumbnail:string|null,specialization:object|null,keyCount:number}>>}
 */
async function listKeyCountsForRealmRange(realmId, weekStart, weekEnd, minLevel = 10) {
  const characters = await prisma.characters.findMany({
    where: {
      realmId: parseInt(realmId, 10),
      archived: 0,
      status: { not: 'pending' },
    },
    include: {
      specialization: true,
      key_runs: {
        where: {
          keystoneLevel: { gte: minLevel },
          completedAt: { gte: weekStart, lt: weekEnd },
        },
        select: {
          id: true,
          dungeon: true,
          shortName: true,
          keystoneLevel: true,
          completedAt: true,
          score: true,
          numUpgrades: true,
          clearTimeMs: true,
          parTimeMs: true,
          raiderIoUrl: true,
        },
        orderBy: { completedAt: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  return characters.map((c) => ({
    id: c.id,
    name: c.name,
    class: c.class,
    realm: c.realm,
    thumbnail: c.thumbnail,
    specialization: c.specialization
      ? { id: c.specialization.id, name: c.specialization.name, role: c.specialization.role }
      : null,
    keyCount: c.key_runs.length,
    runs: c.key_runs.map((r) => ({
      id: r.id,
      dungeon: r.dungeon,
      shortName: r.shortName,
      keystoneLevel: r.keystoneLevel,
      completedAt: r.completedAt,
      score: r.score,
      numUpgrades: r.numUpgrades,
      clearTimeMs: r.clearTimeMs,
      parTimeMs: r.parTimeMs,
      raiderIoUrl: r.raiderIoUrl,
      isTimed: (r.numUpgrades ?? 0) > 0,
    })),
  }));
}

module.exports = {
  listCharacters,
  findCharacterById,
  findCharacterByName,
  findCharacterIdByNameAndRealm,
  createCharacter,
  updateCharacterById,
  listCharactersRosterStatus,
  findCharacterByDiscordTag,
  listCharactersWithDiscordTag,
  ensureCharacterExists,
  listCharactersByUserId,
  getLatestGearSnapshot,
  getAllLatestGearSnapshots,
  findClassWithSpecializations,
  listClassesWithSpecializations,
  listOffSpecializationIds,
  listSimmedSpecializationIds,
  replaceCharacterSpecializations,
  fillSpecializationIfEmpty,
  upsertKeyRuns,
  countWeeklyKeyRuns,
  listKeyCountsForRealmRange,
};
