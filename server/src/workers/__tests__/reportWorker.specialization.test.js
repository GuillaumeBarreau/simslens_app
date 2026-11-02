import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * SIMS-210 : l'import d'un rapport Raidbots ou QE écrit la spé résolue
 * (`specializationId`) sur les upgrades et le gear snapshot, et `null` si le
 * libellé n'est pas reconnu, sans bloquer l'import.
 */

// Le worker importe le client Redis partagé, qui se connecte dès son chargement :
// on lui substitue un faux avant de charger le worker.
const fakeRedis = { get: vi.fn(), set: vi.fn() };
const redisPath = require.resolve('../../shared/redis');
require.cache[redisPath] = {
  id: redisPath,
  filename: redisPath,
  loaded: true,
  exports: fakeRedis,
};

// Les modules ci-dessous sont chargés par le `require` natif de Node, qui ne résout pas
// les modules TypeScript (shared/game, SIMS-020) : on active le chargeur CommonJS de tsx.
const { register: registerTsx } = require('tsx/cjs/api');
registerTsx();

const request = require('request');
const { prisma } = require('../../data');
const validationSettingsRepository = require('../../api/validation_settings/validation_settings.repository');
const blizzardSync = require('../../services/blizzardSync.service');
const blizzardApi = require('../../integrations/blizzard/api');
const { processReport, processQEReport } = require('../reportWorker');

const SHAMAN = {
  id: 7,
  name: 'shaman',
  specializations: [
    { id: 262, name: 'Elemental', classId: 7, role: 'ranged' },
    { id: 263, name: 'Enhancement', classId: 7, role: 'melee' },
    { id: 264, name: 'Restoration', classId: 7, role: 'healer' },
  ],
};

const WARRIOR = {
  id: 1,
  name: 'warrior',
  specializations: [
    { id: 71, name: 'Arms', classId: 1, role: 'melee' },
    { id: 72, name: 'Fury', classId: 1, role: 'melee' },
    { id: 73, name: 'Protection', classId: 1, role: 'tank' },
  ],
};

function raidbotsReport(specialization) {
  return {
    build_date: '2026-10-01',
    build_time: '10:00:00',
    timestamp: 1790000000,
    simbot: { meta: { rawFormData: { character: { name: 'Thrall', realm: 'Hyjal' } } } },
    sim: {
      players: [
        {
          specialization,
          talents: 'ABC',
          collected_data: { dps: { mean: 1000 } },
          gear: { head: { encoded_item: 'casque,id=500', ilevel: 650 } },
        },
      ],
      profilesets: {
        results: [{ name: '1/2/3-heroic/100', mean: 1100 }],
      },
    },
  };
}

function qeReport(spec) {
  return {
    playername: 'Thrall',
    realm: 'Hyjal',
    spec,
    timeCreated: '2026-10-01T10:00:00Z',
    ufSettings: { raid: [5] },
    results: [{ dropLoc: 'Raid', dropDifficulty: 5, item: 100, percDiff: 2, rawDiff: 20 }],
    equippedItems: [{ isEquipped: true, slot: 'Head', id: 500, level: 650 }],
  };
}

function serveReport(report) {
  vi.spyOn(request, 'get').mockImplementation((uri, callback) =>
    callback(null, { statusCode: 200 }, JSON.stringify(report)),
  );
}

let upgradeCreate;
let snapshotCreate;

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  fakeRedis.get.mockResolvedValue(null);
  fakeRedis.set.mockResolvedValue('OK');

  vi.spyOn(prisma.raids, 'findMany').mockResolvedValue([]);
  vi.spyOn(prisma.characters, 'findFirst').mockResolvedValue({
    id: 31,
    realmId: 4,
    name: 'Thrall',
    realm: 'Hyjal',
    region: 'eu',
    class: 'shaman',
  });
  vi.spyOn(prisma.classes, 'findUnique').mockImplementation(async ({ where }) =>
    where.name === 'shaman' ? SHAMAN : null,
  );
  vi.spyOn(prisma.upgrades, 'deleteMany').mockResolvedValue({ count: 0 });
  upgradeCreate = vi.spyOn(prisma.upgrades, 'create').mockResolvedValue({});
  snapshotCreate = vi
    .spyOn(prisma.character_gear_snapshots, 'create')
    .mockResolvedValue({ id: 900 });
  vi.spyOn(prisma.items, 'findUnique').mockResolvedValue(null);
  vi.spyOn(validationSettingsRepository, 'getValidationSettings').mockResolvedValue(null);
  vi.spyOn(blizzardSync, 'syncUpgradesFromBlizzard').mockResolvedValue({ updated: 0 });
  vi.spyOn(blizzardApi, 'getCharacterEquipment').mockRejectedValue(new Error('hors ligne'));
});

describe('processReport (Raidbots) — spécialisation des sims', () => {
  it.each(['Elemental Shaman', 'elemental'])(
    'écrit la spé résolue depuis « %s » sur les upgrades et le snapshot',
    async (label) => {
      serveReport(raidbotsReport(label));
      await processReport('report-1');

      expect(prisma.characters.findFirst.mock.calls[0][0].select).toMatchObject({ class: true });
      expect(upgradeCreate).toHaveBeenCalledTimes(1);
      expect(upgradeCreate.mock.calls[0][0].data).toMatchObject({
        characterID: 31,
        itemID: 100,
        spec: label,
        specializationId: 262,
        difficulty: 'heroic',
      });
      expect(snapshotCreate.mock.calls[0][0].data).toMatchObject({
        characterId: 31,
        spec: label,
        specializationId: 262,
      });
    },
  );

  it("écrit null sans bloquer l'import quand le libellé n'est pas reconnu", async () => {
    serveReport(raidbotsReport('Fire Mage'));
    await processReport('report-2');

    expect(upgradeCreate.mock.calls[0][0].data).toMatchObject({
      spec: 'Fire Mage',
      specializationId: null,
    });
    expect(snapshotCreate.mock.calls[0][0].data.specializationId).toBeNull();
    expect(fakeRedis.set.mock.calls.at(-1)[1]).toContain('"status":"completed"');
  });
});

describe('processQEReport — spécialisation des sims', () => {
  it('écrit la spé résolue sur les upgrades et le snapshot', async () => {
    serveReport(qeReport('Restoration Shaman'));
    await processQEReport('qe-1');

    expect(upgradeCreate.mock.calls[0][0].data).toMatchObject({
      itemID: 100,
      spec: 'Restoration Shaman',
      specializationId: 264,
      difficulty: 'heroic',
    });
    expect(snapshotCreate.mock.calls[0][0].data).toMatchObject({
      spec: 'Restoration Shaman',
      specializationId: 264,
    });
  });

  it('écrit null quand la classe du personnage est inconnue', async () => {
    prisma.classes.findUnique.mockResolvedValue(null);
    serveReport(qeReport('Restoration Shaman'));
    await processQEReport('qe-2');

    expect(upgradeCreate.mock.calls[0][0].data.specializationId).toBeNull();
    expect(snapshotCreate.mock.calls[0][0].data.specializationId).toBeNull();
  });
});

// SIMS-202 : grandeur simulée et rattachement des sims QE Live à une spé de soin.
describe('grandeur simulée (metric)', () => {
  it('Raidbots écrit des sims « dps »', async () => {
    serveReport(raidbotsReport('Elemental Shaman'));
    await processReport('report-m1');

    expect(upgradeCreate.mock.calls[0][0].data.metric).toBe('dps');
  });

  it('QE Live écrit des sims « hps »', async () => {
    serveReport(qeReport('Restoration Shaman'));
    await processQEReport('qe-m1');

    expect(upgradeCreate.mock.calls[0][0].data.metric).toBe('hps');
  });
});

describe('processQEReport — spé de soin du personnage', () => {
  it('lit la spé principale et les off-specs du personnage', async () => {
    serveReport(qeReport('Restoration Shaman'));
    await processQEReport('qe-s1');

    expect(prisma.characters.findFirst.mock.calls[0][0].select).toMatchObject({
      specializationId: true,
      offspecs: { select: { specializationId: true } },
    });
  });

  it('rattache la sim à l’off-spec de soin quand le rapport ne donne pas la spé', async () => {
    prisma.characters.findFirst.mockResolvedValue({
      id: 31,
      name: 'Thrall',
      realm: 'Hyjal',
      region: 'eu',
      class: 'shaman',
      specializationId: 262,
      offspecs: [{ specializationId: 264 }],
    });
    serveReport(qeReport(''));
    await processQEReport('qe-s2');

    expect(upgradeCreate.mock.calls[0][0].data).toMatchObject({
      specializationId: 264,
      metric: 'hps',
    });
  });

  it('accepte la spé de soin du rapport même non déclarée (principale DPS, sans off-spec)', async () => {
    prisma.characters.findFirst.mockResolvedValue({
      id: 31,
      name: 'Thrall',
      realm: 'Hyjal',
      region: 'eu',
      class: 'shaman',
      specializationId: 262,
      offspecs: [],
    });
    serveReport(qeReport('Restoration Shaman'));
    await processQEReport('qe-s3');

    expect(upgradeCreate.mock.calls[0][0].data).toMatchObject({
      specializationId: 264,
      metric: 'hps',
    });
  });

  it.each([
    ['Elemental Shaman', 'QE_NOT_HEALER_SPEC', 'shaman'],
    ['Restoration Shaman', 'QE_NO_HEALER_SPEC', 'warrior'],
  ])('refuse « %s » sans rien effacer ni écrire (%s)', async (spec, code, className) => {
    prisma.classes.findUnique.mockImplementation(async ({ where }) =>
      where.name === 'shaman' ? SHAMAN : where.name === 'warrior' ? WARRIOR : null,
    );
    prisma.characters.findFirst.mockResolvedValue({
      id: 31,
      name: 'Thrall',
      realm: 'Hyjal',
      region: 'eu',
      class: className,
      specializationId: null,
      offspecs: [],
    });
    serveReport(qeReport(spec));

    await expect(processQEReport('qe-r1')).rejects.toMatchObject({ code });

    expect(prisma.upgrades.deleteMany).not.toHaveBeenCalled();
    expect(upgradeCreate).not.toHaveBeenCalled();
    expect(snapshotCreate).not.toHaveBeenCalled();
    const status = JSON.parse(fakeRedis.set.mock.calls.at(-1)[1]);
    expect(status).toMatchObject({ status: 'error', code });
  });

  it('une erreur ordinaire ne porte pas de code', async () => {
    prisma.characters.findFirst.mockResolvedValue(null);
    serveReport(qeReport('Restoration Shaman'));

    await expect(processQEReport('qe-r2')).rejects.toThrow('not found');
    const status = JSON.parse(fakeRedis.set.mock.calls.at(-1)[1]);
    expect(status.status).toBe('error');
    expect(status).not.toHaveProperty('code');
  });
});

// SIMS-211 : l'import remplace les sims de la même spé, quelle que soit la casse
// du libellé, au lieu de laisser des « spés parallèles ».
describe('purge des sims remplacées', () => {
  it('Raidbots, spé résolue : purge par specializationId', async () => {
    serveReport(raidbotsReport('elemental shaman'));
    await processReport('report-3');

    expect(prisma.upgrades.deleteMany).toHaveBeenCalledWith({
      where: {
        characterID: 31,
        difficulty: 'heroic',
        OR: [
          { specializationId: 262 },
          {
            specializationId: null,
            spec: { equals: 'elemental shaman', mode: 'insensitive' },
          },
        ],
      },
    });
  });

  it('Raidbots, spé non résolue : purge sur le libellé exact', async () => {
    serveReport(raidbotsReport('Fire Mage'));
    await processReport('report-4');

    expect(prisma.upgrades.deleteMany).toHaveBeenCalledWith({
      where: { characterID: 31, difficulty: 'heroic', spec: 'Fire Mage' },
    });
  });

  it('QE, spé résolue : purge par specializationId', async () => {
    serveReport(qeReport('Restoration Shaman'));
    await processQEReport('qe-3');

    expect(prisma.upgrades.deleteMany).toHaveBeenCalledWith({
      where: {
        characterID: 31,
        difficulty: 'heroic',
        OR: [
          { specializationId: 264 },
          {
            specializationId: null,
            spec: { equals: 'Restoration Shaman', mode: 'insensitive' },
          },
        ],
      },
    });
  });

  it('QE, classe inconnue : purge sur le libellé exact', async () => {
    prisma.classes.findUnique.mockResolvedValue(null);
    serveReport(qeReport('Restoration Shaman'));
    await processQEReport('qe-4');

    expect(prisma.upgrades.deleteMany).toHaveBeenCalledWith({
      where: { characterID: 31, difficulty: 'heroic', spec: 'Restoration Shaman' },
    });
  });
});
