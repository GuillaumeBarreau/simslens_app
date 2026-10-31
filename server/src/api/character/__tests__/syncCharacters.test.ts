import { normalizeRun, syncAllCharacterKeyRuns } from '../usecases/syncAllCharacterKeyRuns';
import { BLIZZARD_NOT_FOUND, updateAllCharacters } from '../usecases/updateAllCharacters';

const listCharacters = vi.fn();
const upsertKeyRuns = vi.fn();
const countWeeklyKeyRuns = vi.fn();
const updateCharacterById = vi.fn();
const getCharacterRunsBundle = vi.fn();
const getCharacterEnrichedData = vi.fn();
const findClassWithSpecializations = vi.fn();
const fillSpecializationIfEmpty = vi.fn();

vi.mock('../character.repository', () => ({
  default: {
    listCharacters: (...a: unknown[]) => listCharacters(...a),
    upsertKeyRuns: (...a: unknown[]) => upsertKeyRuns(...a),
    countWeeklyKeyRuns: (...a: unknown[]) => countWeeklyKeyRuns(...a),
    updateCharacterById: (...a: unknown[]) => updateCharacterById(...a),
    findClassWithSpecializations: (...a: unknown[]) => findClassWithSpecializations(...a),
    fillSpecializationIfEmpty: (...a: unknown[]) => fillSpecializationIfEmpty(...a),
  },
}));
vi.mock('../../../integrations/raiderio/api', () => ({
  getCharacterRunsBundle: (...a: unknown[]) => getCharacterRunsBundle(...a),
}));
vi.mock('../../../integrations/blizzard/api', () => ({
  getCharacterEnrichedData: (...a: unknown[]) => getCharacterEnrichedData(...a),
}));

const ARTHAS = { id: 5, name: 'Arthas', realm: 'hyjal', region: 'EU' };
const DEATH_KNIGHT = {
  id: 6,
  name: 'death_knight',
  specializations: [
    { id: 250, name: 'Blood', classId: 6, role: 'tank' },
    { id: 251, name: 'Frost', classId: 6, role: 'dps' },
  ],
};

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  listCharacters.mockReset().mockResolvedValue([ARTHAS]);
  upsertKeyRuns.mockReset().mockResolvedValue(1);
  countWeeklyKeyRuns.mockReset().mockResolvedValue(4);
  updateCharacterById.mockReset().mockResolvedValue({ changes: 1, lastID: 5 });
  getCharacterRunsBundle.mockReset().mockResolvedValue({ recent: [], weeklyBest: [] });
  getCharacterEnrichedData.mockReset().mockResolvedValue({
    currentPeriodKeyCount: 2,
    ilvl: 640,
    score: 2500,
    ManaforgeBuff: 1,
    thumbnail: null,
  });
  findClassWithSpecializations.mockReset().mockResolvedValue(DEATH_KNIGHT);
  fillSpecializationIfEmpty.mockReset().mockResolvedValue(true);
});

describe('normalizeRun', () => {
  const weekStart = new Date('2026-04-08T03:00:00Z');
  const weekEnd = new Date('2026-04-15T03:00:00Z');
  const now = new Date('2026-04-10T00:00:00Z');
  const run = {
    dungeon: 'Ara-Kara',
    short_name: 'ARAK',
    mythic_level: 12,
    completed_at: '2026-04-09T20:00:00Z',
    num_keystone_upgrades: 1,
    url: 'https://raider.io/run',
  };

  it('maps a run of the week to the database shape', () => {
    expect(normalizeRun(run, weekStart, weekEnd, now)).toEqual({
      dungeon: 'Ara-Kara',
      shortName: 'ARAK',
      keystoneLevel: 12,
      completedAt: new Date('2026-04-09T20:00:00Z'),
      score: null,
      numUpgrades: 1,
      clearTimeMs: null,
      parTimeMs: null,
      raiderIoUrl: 'https://raider.io/run',
    });
  });

  it('drops a run without date, with an invalid or future date, or outside the week', () => {
    expect(normalizeRun(null, weekStart, weekEnd, now)).toBeNull();
    expect(normalizeRun({ ...run, completed_at: undefined }, weekStart, weekEnd, now)).toBeNull();
    expect(normalizeRun({ ...run, completed_at: 'nope' }, weekStart, weekEnd, now)).toBeNull();
    expect(
      normalizeRun({ ...run, completed_at: '2026-04-11T00:00:00Z' }, weekStart, weekEnd, now),
    ).toBeNull();
    expect(
      normalizeRun({ ...run, completed_at: '2026-04-07T00:00:00Z' }, weekStart, weekEnd, now),
    ).toBeNull();
  });
});

describe('syncAllCharacterKeyRuns', () => {
  it('merges recent and weekly runs, then recounts the week', async () => {
    const completedAt = new Date(Date.now() - 60_000).toISOString();
    const same = { dungeon: 'Ara-Kara', mythic_level: 12, completed_at: completedAt };
    getCharacterRunsBundle.mockResolvedValueOnce({ recent: [same], weeklyBest: [same] });

    await expect(syncAllCharacterKeyRuns()).resolves.toEqual({ synced: 1, failed: 0 });
    expect(getCharacterRunsBundle).toHaveBeenCalledWith('eu', 'hyjal', 'Arthas');
    expect(upsertKeyRuns).toHaveBeenCalledWith(5, [
      expect.objectContaining({ dungeon: 'Ara-Kara', keystoneLevel: 12 }),
    ]);
    expect(updateCharacterById).toHaveBeenCalledWith(5, { currentPeriodKeyCount: 4 });
  });

  it('counts a failure without stopping the other characters', async () => {
    listCharacters.mockResolvedValueOnce([ARTHAS, { ...ARTHAS, id: 6, name: 'Jaina' }]);
    getCharacterRunsBundle.mockRejectedValueOnce(new Error('Raider.IO down'));
    await expect(syncAllCharacterKeyRuns()).resolves.toEqual({ synced: 1, failed: 1 });
  });
});

describe('updateAllCharacters', () => {
  it('updates only the characters of the given realm', async () => {
    const result = await updateAllCharacters({ realmId: 3 });
    expect(listCharacters).toHaveBeenNthCalledWith(1, 3);
    expect(updateCharacterById).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ ilvl: 640, score: 2500, ManaforgeBuff: '1' }),
    );
    expect(result).toEqual({
      updated: 1,
      failed: 0,
      details: [{ id: 5, name: 'Arthas', ok: true }],
    });
  });

  it('keeps ilvl and score of a character unknown to Blizzard and counts it once', async () => {
    getCharacterEnrichedData.mockRejectedValueOnce({ response: { status: 404 } });
    const result = await updateAllCharacters({ realmId: 3 });
    // Aucune écriture : ilvl et score restent ceux en base (SIMS-214).
    // Quelle que soit la valeur (0, null, undefined), aucun de ces champs n'est écrit.
    for (const [, fields] of updateCharacterById.mock.calls) {
      expect(fields).not.toHaveProperty('ilvl');
      expect(fields).not.toHaveProperty('score');
      expect(fields).not.toHaveProperty('lastModified');
    }
    expect(result).toEqual({
      updated: 0,
      failed: 1,
      details: [{ id: 5, name: 'Arthas', ok: false, error: BLIZZARD_NOT_FOUND }],
    });
  });

  it('counts every character exactly once when one of them is unknown to Blizzard', async () => {
    listCharacters.mockResolvedValueOnce([ARTHAS, { ...ARTHAS, id: 6, name: 'Jaina' }]);
    getCharacterEnrichedData.mockRejectedValueOnce({ response: { status: 404 } });
    const result = await updateAllCharacters({ realmId: 3, concurrency: 1 });
    expect(result.updated + result.failed).toBe(2);
    expect(result.details).toHaveLength(2);
    expect(result.details).toEqual([
      { id: 5, name: 'Arthas', ok: false, error: BLIZZARD_NOT_FOUND },
      { id: 6, name: 'Jaina', ok: true },
    ]);
    expect(updateCharacterById).toHaveBeenCalledWith(
      6,
      expect.objectContaining({ ilvl: 640, score: 2500 }),
    );
  });

  describe('specialization (SIMS-208)', () => {
    const DK = { ...ARTHAS, class: 'death_knight' };

    it.each([
      ['without spec', { spec: null, specializationId: null }],
      ['with the legacy dps literal', { spec: 'dps', specializationId: null }],
    ])('fills the active Blizzard spec of a character %s', async (_label, current) => {
      listCharacters.mockResolvedValueOnce([{ ...DK, ...current }]);
      getCharacterEnrichedData.mockResolvedValueOnce({ ilvl: 640, active_spec: 'Blood' });
      await updateAllCharacters({ realmId: 3 });
      expect(findClassWithSpecializations).toHaveBeenCalledWith('death_knight');
      expect(fillSpecializationIfEmpty).toHaveBeenCalledWith(5, {
        spec: 'Blood',
        specializationId: 250,
      });
    });

    it('never overwrites a spec chosen by hand', async () => {
      listCharacters.mockResolvedValueOnce([{ ...DK, spec: 'Frost', specializationId: 251 }]);
      getCharacterEnrichedData.mockResolvedValueOnce({ ilvl: 640, active_spec: 'Blood' });
      await updateAllCharacters({ realmId: 3 });
      expect(fillSpecializationIfEmpty).not.toHaveBeenCalled();
      for (const [, fields] of updateCharacterById.mock.calls) {
        expect(fields).not.toHaveProperty('spec');
        expect(fields).not.toHaveProperty('specializationId');
      }
    });

    it('leaves an unknown spec empty and still counts the character as updated', async () => {
      listCharacters.mockResolvedValueOnce([{ ...DK, spec: null, specializationId: null }]);
      getCharacterEnrichedData.mockResolvedValueOnce({ ilvl: 640, active_spec: 'Sangre' });
      const result = await updateAllCharacters({ realmId: 3 });
      expect(fillSpecializationIfEmpty).not.toHaveBeenCalled();
      expect(result).toMatchObject({ updated: 1, failed: 0 });
    });
  });

  it('still counts other Blizzard errors as failures', async () => {
    getCharacterEnrichedData.mockRejectedValueOnce(new Error('Blizzard down'));
    const result = await updateAllCharacters({ realmId: 3 });
    expect(result).toEqual({
      updated: 0,
      failed: 1,
      details: [{ id: 5, name: 'Arthas', ok: false, error: 'Blizzard down' }],
    });
  });
});
