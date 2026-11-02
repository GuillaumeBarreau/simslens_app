// Catalogue Forever du palier 1 et seeds idempotents (SIMS-027).
import { GAMES, raidSize } from '../../shared/game/games';

// Les seeds sont chargés par le `require` natif de Node, qui ne résout pas les modules
// TypeScript (shared/game) : on active le chargeur CommonJS de tsx, comme initData.
const { register: registerTsx } = require('tsx/cjs/api');
registerTsx();

const foreverRaids = require('../data/forever/raids.json');
const foreverBosses = require('../data/forever/bosses.json');
const retailRaids = require('../data/raids.json');
const retailBosses = require('../data/boss.json');
const {
  assertDisjoint,
  assertUnique,
  loadBosses,
  loadRaids,
  raidDifficultiesFor,
} = require('../seed/catalog');
const { seedRaid } = require('../seed/seedRaid');
const { seedBosses } = require('../seed/seedBoss');
const { seedRaidDifficulties } = require('../seed/seedRaidDifficulties');

const silent = { log: () => undefined } as unknown as Console;

type Row = Record<string, unknown> & { id: number };

/** Client Prisma en mémoire : juste ce que les seeds de raids et de boss utilisent. */
function fakePrisma() {
  const raids = new Map<number, Row>();
  const bosses = new Map<number, Row>();
  const drops: { bossId: number; itemId: number }[] = [];
  const upsertInto =
    (table: Map<number, Row>) =>
    async ({ where, update, create }: { where: { id: number }; update: object; create: Row }) => {
      const row = table.get(where.id);
      table.set(where.id, row ? { ...row, ...update } : { ...create });
    };
  return {
    tables: { raids, bosses, drops },
    raids: { upsert: upsertInto(raids) },
    bosses: { upsert: upsertInto(bosses) },
    items: { findUnique: async ({ where }: { where: { id: number } }) => ({ id: where.id }) },
    boss_drop: {
      findFirst: async ({ where }: { where: { bossId: number; itemId: number } }) =>
        drops.find((d) => d.bossId === where.bossId && d.itemId === where.itemId) ?? null,
      create: async ({ data }: { data: { bossId: number; itemId: number } }) => {
        drops.push(data);
      },
    },
  };
}

/**
 * Client pg en mémoire pour seedRaidDifficulties : interprète ses trois requêtes
 * (SELECT des raids, DELETE des difficultés hors jeu, INSERT … ON CONFLICT).
 */
function fakePg(raids: { id: number; name: string; extension: string | null }[]) {
  const rows = new Map<string, { id: number; raidId: number; difficulty: string }>();
  let nextId = 1;
  const query = async (sql: string, params: unknown[] = []) => {
    if (sql.startsWith('SELECT')) return { rows: raids };
    if (sql.startsWith('DELETE')) {
      const [raidId, keep] = params as [number, string[]];
      for (const [key, row] of rows) {
        if (row.raidId === raidId && !keep.includes(row.difficulty)) rows.delete(key);
      }
      return { rows: [] };
    }
    if (sql.startsWith('INSERT') && sql.includes('ON CONFLICT')) {
      const [raidId, difficulty] = params as [number, string];
      const key = `${raidId}:${difficulty}`;
      if (!rows.has(key)) rows.set(key, { id: nextId++, raidId, difficulty });
      return { rows: [] };
    }
    throw new Error(`Unexpected query: ${sql}`);
  };
  return { rows, client: { query } };
}

describe('Forever tier-1 data', () => {
  it('describes the three raids of tier 1, sourced', () => {
    expect(foreverRaids.map((r: { name: string }) => r.name)).toEqual([
      'The Barrow Deeps',
      'Hyjal Summit',
      "Onyxia's Lair",
    ]);
    for (const raid of foreverRaids) {
      expect(raid.extension).toBe('Forever');
      expect(GAMES.forever.seasons).toContain(raid.season);
      expect(raid.sources.length).toBeGreaterThan(0);
      for (const url of raid.sources) expect(url).toMatch(/^https:\/\//);
    }
  });

  it('gives every raid a size in the registry', () => {
    expect(foreverRaids.map((r: { name: string }) => raidSize('forever', r.name))).toEqual([
      10, 20, 40,
    ]);
    expect(Object.keys(GAMES.forever.raidSizes).sort()).toEqual(
      foreverRaids.map((r: { name: string }) => r.name).sort(),
    );
  });

  it('lists 8, 13 and 1 bosses, ordered from 1, without loot', () => {
    const counts: Record<string, number> = {};
    for (const raid of foreverRaids) {
      const bosses = foreverBosses.filter((b: { raidName: string }) => b.raidName === raid.name);
      counts[raid.name] = bosses.length;
      expect(bosses.map((b: { order: number }) => b.order)).toEqual(
        bosses.map((_: unknown, i: number) => i + 1),
      );
      for (const boss of bosses) {
        expect(boss.extension).toBe(raid.extension);
        expect(boss.season).toBe(raid.season);
        expect(boss.sources.length).toBeGreaterThan(0);
        // Tables de loot non publiées : aucun objet inventé.
        expect(boss.loots).toBeUndefined();
      }
    }
    expect(counts).toEqual({ 'The Barrow Deeps': 8, 'Hyjal Summit': 13, "Onyxia's Lair": 1 });
    expect(foreverBosses).toHaveLength(22);
  });

  it('does not collide with Retail raids or bosses', () => {
    const raids = loadRaids();
    expect(raids).toHaveLength(retailRaids.length + foreverRaids.length);
    expect(loadBosses()).toHaveLength(retailBosses.length + foreverBosses.length);
  });
});

describe('catalog loaders', () => {
  it('refuses two raids with the same name (raids.name is unique)', () => {
    expect(() =>
      loadRaids([[{ id: 1, name: 'Hyjal Summit' }], [{ id: 2, name: 'Hyjal Summit' }]]),
    ).toThrow(/Duplicate raid name/);
  });

  it('refuses a boss id shared by two files', () => {
    expect(() => loadBosses([[{ bossId: 7 }], [{ bossId: 7 }]])).toThrow(
      /Duplicate boss bossId across files: 7/,
    );
  });

  it('gives each Forever boss its own id', () => {
    expect(() => assertUnique(foreverBosses, 'bossId', 'boss')).not.toThrow();
  });

  it('assertDisjoint tolerates a duplicate inside one file', () => {
    expect(() => assertDisjoint([[{ id: 1 }, { id: 1 }], [{ id: 2 }]], 'id', 'x')).not.toThrow();
  });

  it('assertUnique accepts distinct values', () => {
    expect(() => assertUnique([{ id: 1 }, { id: 2 }], 'id', 'raid')).not.toThrow();
  });

  it('offers normal only to Forever raids, every difficulty to Retail', () => {
    expect(raidDifficultiesFor('Forever').map((d: { key: string }) => d.key)).toEqual(['normal']);
    expect(raidDifficultiesFor('Midnight').map((d: { key: string }) => d.key)).toEqual([
      'lfr',
      'normal',
      'heroic',
      'mythic',
    ]);
  });
});

describe('seedRaid', () => {
  it('creates Forever raids and is idempotent', async () => {
    const prisma = fakePrisma();
    await seedRaid(prisma, loadRaids(), silent);
    const first = [...prisma.tables.raids.values()];
    await seedRaid(prisma, loadRaids(), silent);

    expect([...prisma.tables.raids.values()]).toEqual(first);
    expect(first).toHaveLength(retailRaids.length + foreverRaids.length);
    expect(prisma.tables.raids.get(9002)).toMatchObject({
      name: 'Hyjal Summit',
      extension: 'Forever',
      season: 'tier-1',
    });
  });
});

describe('seedBosses', () => {
  it('creates Forever bosses without drops and is idempotent', async () => {
    const prisma = fakePrisma();
    await seedBosses(prisma, loadBosses(), silent);
    const bosses = [...prisma.tables.bosses.values()];
    const drops = [...prisma.tables.drops];
    await seedBosses(prisma, loadBosses(), silent);

    expect([...prisma.tables.bosses.values()]).toEqual(bosses);
    expect(prisma.tables.drops).toEqual(drops);

    const onyxia = bosses.find((b) => b.name === 'Onyxia');
    expect(onyxia).toMatchObject({
      extension: 'Forever',
      season: 'tier-1',
      raidName: "Onyxia's Lair",
      order: 1,
    });
    expect(drops.some((d) => d.bossId === onyxia?.id)).toBe(false);
  });
});

describe('seedRaidDifficulties', () => {
  const raids = [
    { id: 1, name: 'Manaforge Omega', extension: 'The-War-Within' },
    { id: 9003, name: "Onyxia's Lair", extension: 'Forever' },
  ];

  it('attaches normal only to a Forever raid, the four difficulties to Retail', async () => {
    const pg = fakePg(raids);
    await expect(seedRaidDifficulties(pg.client, silent)).resolves.toBe(5);
    const keys = [...pg.rows.keys()].sort();
    expect(keys).toEqual(['1:heroic', '1:lfr', '1:mythic', '1:normal', '9003:normal']);
  });

  it('keeps existing rows (and their ids) when run again', async () => {
    const pg = fakePg(raids);
    await seedRaidDifficulties(pg.client, silent);
    const ids = [...pg.rows.entries()];
    await seedRaidDifficulties(pg.client, silent);
    expect([...pg.rows.entries()]).toEqual(ids);
  });

  it('removes a difficulty the Forever raid does not offer', async () => {
    const pg = fakePg(raids);
    pg.rows.set('9003:mythic', { id: 99, raidId: 9003, difficulty: 'mythic' });
    await seedRaidDifficulties(pg.client, silent);
    expect(pg.rows.has('9003:mythic')).toBe(false);
    expect(pg.rows.has('9003:normal')).toBe(true);
  });
});
