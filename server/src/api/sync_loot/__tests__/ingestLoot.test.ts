import { ingestLoot } from '../usecases/ingestLoot';

const resolveCharactersByKeys = vi.fn();
const createImportRecord = vi.fn();
const getRealmUserRole = vi.fn();
const createMany = vi.fn();
const deleteImport = vi.fn();
const findCharacters = vi.fn();
const findTokens = vi.fn();
const findUpgrades = vi.fn();

vi.mock('../../item_import/item_import.repository', () => ({
  default: {
    resolveCharactersByKeys: (...a: unknown[]) => resolveCharactersByKeys(...a),
    createImportRecord: (...a: unknown[]) => createImportRecord(...a),
  },
}));

vi.mock('../../realm/realm.repository', () => ({
  default: { getRealmUserRole: (...a: unknown[]) => getRealmUserRole(...a) },
}));

vi.mock('../../../data', () => ({
  prisma: {
    imported_loots: { createMany: (...a: unknown[]) => createMany(...a) },
    imports: { delete: (...a: unknown[]) => deleteImport(...a) },
    characters: { findMany: (...a: unknown[]) => findCharacters(...a) },
    item_tokens: { findMany: (...a: unknown[]) => findTokens(...a) },
    upgrades: { findMany: (...a: unknown[]) => findUpgrades(...a) },
  },
}));

const entry = {
  player: 'Ghostbane-Hyjal',
  date: '12/05/26',
  time: '20:34:12',
  itemId: 42,
  response: 'BiS',
  instance: 'Manaforge Omega-Heroic',
};

const simBeforeDrop = {
  characterID: 11,
  itemID: 42,
  dps: 1025,
  baseDps: 1000,
  timeStamp: new Date('2026-05-11T18:00:00Z'),
  difficulty: 'heroic',
  spec: 'Elemental Shaman',
  specializationId: 262,
};

function input(overrides: Partial<Parameters<typeof ingestLoot>[0]> = {}) {
  return {
    realmId: 3,
    source: 'rclootcouncil',
    entries: [entry],
    tokenScopes: ['sync:loot:write', 'realm:3'],
    userId: 'u1',
    ...overrides,
  };
}

beforeEach(() => {
  resolveCharactersByKeys.mockReset().mockResolvedValue({ 'ghostbane|hyjal': 11 });
  createImportRecord.mockReset().mockResolvedValue(99);
  getRealmUserRole.mockReset().mockResolvedValue('admin');
  createMany.mockReset().mockResolvedValue({ count: 1 });
  deleteImport.mockReset().mockResolvedValue(undefined);
  findCharacters.mockReset().mockResolvedValue([
    {
      id: 11,
      class: 'shaman',
      specializationId: 262,
      specialization: { name: 'Elemental' },
    },
  ]);
  findTokens.mockReset().mockResolvedValue([]);
  findUpgrades.mockReset().mockResolvedValue([simBeforeDrop]);
});

/** Lignes passées à createMany lors du dernier import. */
function insertedRows() {
  return createMany.mock.calls.at(-1)?.[0].data;
}

describe('ingestLoot : royaume du jeton', () => {
  it('refuses a realm absent from the token scopes, without writing', async () => {
    await expect(ingestLoot(input({ realmId: 4 }))).rejects.toMatchObject({
      status: 403,
      message: 'missing_scope_for_realm_4',
    });
    expect(resolveCharactersByKeys).not.toHaveBeenCalled();
    expect(createImportRecord).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });

  it.each([['member'], ['moderator'], [null]])(
    'refuses a token owner who is now %s of the realm, without writing',
    async (role) => {
      getRealmUserRole.mockResolvedValueOnce(role);
      await expect(ingestLoot(input())).rejects.toMatchObject({
        status: 403,
        message: 'not_authorized_on_realm_3',
      });
      expect(getRealmUserRole).toHaveBeenCalledWith(3, 'u1');
      expect(createImportRecord).not.toHaveBeenCalled();
      expect(createMany).not.toHaveBeenCalled();
    },
  );

  it('resolves players among the characters of the checked realm only', async () => {
    await ingestLoot(input());
    expect(resolveCharactersByKeys).toHaveBeenCalledWith(expect.any(Array), 3);
  });

  it('keeps the response shape read by the companion app', async () => {
    const result = await ingestLoot(
      input({ entries: [entry, { ...entry, player: 'Inconnu-Hyjal' }] }),
    );
    expect(Object.keys(result).sort()).toEqual(['duplicates', 'importId', 'inserted', 'unmatched']);
    expect(result).toEqual({
      importId: 99,
      inserted: 1,
      duplicates: 1,
      unmatched: ['Inconnu-Hyjal'],
    });
  });

  it('drops the import record when every row is a duplicate', async () => {
    createMany.mockResolvedValueOnce({ count: 0 });
    const result = await ingestLoot(input());
    expect(result).toEqual({ importId: null, inserted: 0, duplicates: 1, unmatched: [] });
    expect(deleteImport).toHaveBeenCalledWith({ where: { id: 99 } });
  });
});

describe('ingestLoot : gain figé (SIMS-229)', () => {
  it('freezes the gain of the current sim on the imported row', async () => {
    await ingestLoot(input());

    expect(insertedRows()).toEqual([
      expect.objectContaining({
        importID: 99,
        characterID: 11,
        itemID: 42,
        upgradePercent: 2.5,
        upgradeSimAt: new Date('2026-05-11T18:00:00Z'),
        upgradeSpecializationId: 262,
        upgradeMetric: 'dps',
      }),
    ]);
  });

  it('freezes the HPS metric of a QE Live sim (SIMS-202)', async () => {
    findUpgrades.mockResolvedValueOnce([{ ...simBeforeDrop, metric: 'hps' }]);
    await ingestLoot(input());

    expect(findUpgrades.mock.calls[0][0].select).toMatchObject({ metric: true });
    expect(insertedRows()[0]).toMatchObject({ upgradePercent: 2.5, upgradeMetric: 'hps' });
  });

  it('reads characters, tokens and sims of the realm characters only', async () => {
    await ingestLoot(input());

    expect(findCharacters.mock.calls[0][0].where).toEqual({ id: { in: [11] }, realmId: 3 });
    expect(findTokens.mock.calls[0][0].where).toEqual({ tokenItemId: { in: [42] } });
    expect(findUpgrades.mock.calls[0][0].where).toEqual({
      characterID: { in: [11] },
      itemID: { in: [42] },
    });
  });

  it('imports the row without a frozen gain when no sim matches', async () => {
    findUpgrades.mockResolvedValueOnce([]);
    const result = await ingestLoot(input());

    expect(result.inserted).toBe(1);
    expect(insertedRows()[0]).toMatchObject({
      upgradePercent: null,
      upgradeSimAt: null,
      upgradeSpecializationId: null,
      upgradeMetric: null,
    });
  });

  it('does not freeze a sim run after the drop', async () => {
    findUpgrades.mockResolvedValueOnce([
      { ...simBeforeDrop, timeStamp: new Date('2026-05-13T00:00:00Z') },
    ]);
    await ingestLoot(input());

    expect(insertedRows()[0].upgradePercent).toBeNull();
  });

  it('skips the lookup for non-attributive responses and unmatched players', async () => {
    await ingestLoot(
      input({
        entries: [
          { ...entry, response: 'Disenchant' },
          { ...entry, player: 'Inconnu-Hyjal', time: '20:40:00' },
        ],
      }),
    );

    expect(findCharacters).not.toHaveBeenCalled();
    expect(findUpgrades).not.toHaveBeenCalled();
    expect(insertedRows()).toHaveLength(2);
    expect(
      insertedRows().every((r: { upgradePercent: unknown }) => r.upgradePercent === null),
    ).toBe(true);
  });

  it('never updates a row already imported: a duplicate keeps its frozen gain', async () => {
    // Nouveau sim depuis le premier import : la ligne existante est ignorée
    // par skipDuplicates. Le mock n'expose ni update ni upsert sur
    // imported_loots : toute réécriture ferait échouer l'import.
    findUpgrades.mockResolvedValueOnce([{ ...simBeforeDrop, dps: 1300 }]);
    createMany.mockResolvedValueOnce({ count: 0 });
    const result = await ingestLoot(input());

    expect(createMany).toHaveBeenCalledTimes(1);
    expect(createMany.mock.calls[0][0].skipDuplicates).toBe(true);
    expect(result).toMatchObject({ inserted: 0, duplicates: 1 });
  });
});
