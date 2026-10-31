import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Un inscrit PRESENT sans spécialisation ne disparaît plus en silence de la
 * composition (SIMS-209) : il entre dans le pool avec son rôle d'inscription,
 * ou figure parmi les non-placés avec la raison « missing_specialization ».
 */
const { prisma } = require('../../../data');
const repo = require('../composition.repository');

// item_upgrade.service requiert un module .ts, que require() ne charge pas
// sous vitest (cf. routesLoad.test.ts) : on le remplace dans le cache avant
// de charger le service de composition.
const upgradeServicePath = require.resolve('../../item_upgrade/item_upgrade.service');
const servicePath = require.resolve('../composition.service');
const upgradeService = { getCharacterBossUpgrades: async () => [] };
delete require.cache[servicePath];
require.cache[upgradeServicePath] = {
  id: upgradeServicePath,
  filename: upgradeServicePath,
  loaded: true,
  exports: upgradeService,
};
const service = require('../composition.service');

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(() => {
  delete require.cache[upgradeServicePath];
  delete require.cache[servicePath];
});

const character = (id, name, cls, specialization = null) => ({
  id,
  name,
  class: cls,
  userId: `user-${id}`,
  realmId: 3,
  specialization,
});

const SIGNUPS = [
  {
    characterId: 1,
    role: 'RANGED',
    character: character(1, 'Mage', 'mage', { id: 10, name: 'Frost', role: 'ranged' }),
  },
  // Sans spé, inscrit comme tank : placé avec ce rôle.
  { characterId: 2, role: 'TANK', character: character(2, 'Tanky', 'warrior') },
  // Sans spé ni rôle, classe hybride : aucun rôle exploitable.
  { characterId: 3, role: null, character: character(3, 'Pala', 'paladin') },
];

function mockRepository() {
  vi.spyOn(repo, 'getEventContext').mockResolvedValue({
    id: 5,
    title: 'Raid',
    startTime: new Date('2026-10-10T20:00:00Z'),
    raidDifficultyId: 2,
    raid_difficulty: {
      id: 2,
      difficulty: 'heroic',
      raid: { id: 1, name: 'Raid', extension: 'tww', season: '3' },
    },
  });
  vi.spyOn(repo, 'getBossesForRaid').mockResolvedValue([
    { id: 100, name: 'Boss', order: 1, icon: null, raidName: 'Raid' },
  ]);
  vi.spyOn(repo, 'getPresentPool').mockResolvedValue(SIGNUPS);
  vi.spyOn(repo, 'getPastBossAssignments').mockResolvedValue([]);
  vi.spyOn(repo, 'getValidationSettings').mockResolvedValue(null);
  vi.spyOn(upgradeService, 'getCharacterBossUpgrades').mockResolvedValue([]);
}

describe('getPresentPool', () => {
  it('keeps a PRESENT signup whose character has no specialization', async () => {
    vi.spyOn(prisma.raid_signups, 'findMany').mockResolvedValue([
      ...SIGNUPS,
      { characterId: 4, role: 'HEALER', character: null },
    ]);
    const pool = await repo.getPresentPool(5);
    expect(pool.map((s) => s.characterId)).toEqual([1, 2, 3]);
  });
});

describe('composition context — characters without specialization', () => {
  it('keeps them in the pool with their signup role', async () => {
    mockRepository();
    const context = await service.buildCompositionContext({ eventId: 5, realmId: 3 });

    const tanky = context.pool.find((p) => p.characterId === 2);
    expect(tanky).toMatchObject({
      spec: null,
      granularRole: 'TANK',
      missingSpecialization: true,
    });
    expect(context.pool.find((p) => p.characterId === 1).missingSpecialization).toBe(false);
  });

  it('lists them as unplaced when no role can be resolved', async () => {
    mockRepository();
    const context = await service.buildCompositionContext({ eventId: 5, realmId: 3 });

    expect(context.pool.map((p) => p.characterId)).toEqual([1, 2]);
    expect(context.unplaced).toEqual([
      { characterId: 3, name: 'Pala', class: 'paladin', reason: 'missing_specialization' },
    ]);
  });
});

describe('composition generation — characters without specialization', () => {
  it('places them and warns that their specialization is missing', async () => {
    mockRepository();
    const result = await service.generateComposition({ eventId: 5, realmId: 3 });

    const assigned = result.bosses[0].assignments.map((a) => a.characterId);
    expect(assigned).toContain(2);
    expect(result.bosses[0].assignments.find((a) => a.characterId === 2)).toMatchObject({
      role: 'TANK',
      spec: null,
    });
    expect(result.warnings).toContainEqual({
      type: 'missing_specialization',
      characterId: 2,
      characterName: 'Tanky',
      role: 'TANK',
    });
  });

  it('reports the unplaced ones with the reason', async () => {
    mockRepository();
    const result = await service.generateComposition({ eventId: 5, realmId: 3 });

    expect(result.unplaced).toEqual([
      { characterId: 3, name: 'Pala', class: 'paladin', reason: 'missing_specialization' },
    ]);
    expect(result.warnings).toContainEqual({
      type: 'unplaced',
      reason: 'missing_specialization',
      characterId: 3,
      characterName: 'Pala',
    });
    expect(result.bosses[0].assignments.map((a) => a.characterId)).not.toContain(3);
  });

  it.each([
    ['no_bosses', [], null],
    ['no_bosses_selected', [{ id: 100, name: 'Boss' }], [999]],
  ])('keeps the missing spec report when returning early (%s)', (type, bosses, selected) => {
    const unplaced = [
      { characterId: 3, name: 'Pala', class: 'paladin', reason: 'missing_specialization' },
    ];
    const context = {
      schemaVersion: 1,
      event: { difficulty: 'heroic', raid: null },
      bosses,
      pool: [{ characterId: 2, name: 'Tanky', granularRole: 'TANK', missingSpecialization: true }],
      unplaced,
      history: { eventsFound: 0, events: [] },
      constraints: { activeBuffs: [] },
    };
    const result = service.generateFromContext(context, { selectedBossIds: selected });
    expect(result.unplaced).toEqual(unplaced);
    expect(result.warnings.map((w) => w.type)).toEqual([
      type,
      'missing_specialization',
      'unplaced',
    ]);
  });

  it('accepts a pre-built context without unplaced list', () => {
    const context = {
      schemaVersion: 1,
      event: { difficulty: 'heroic', raid: null },
      bosses: [{ id: 100, name: 'Boss' }],
      pool: [],
      history: { eventsFound: 0, events: [] },
      constraints: { activeBuffs: [] },
    };
    const result = service.generateFromContext(context);
    expect(result.unplaced).toEqual([]);
    expect(result.warnings.filter((w) => w.type === 'unplaced')).toEqual([]);
  });
});
