// Cloisonnement par royaume de la lecture du loot importé (SIMS-124).
// Le repository est en CommonJS et fait require('../../data') : on place un
// Prisma factice dans le cache de modules Node avant de le charger.
vi.hoisted(() => {
  process.env.DATABASE_URL ||= 'postgresql://test:test@127.0.0.1:1/test';
});

const findCharacters = vi.fn();
const findLoots = vi.fn();
const findItems = vi.fn();

const dataPath = require.resolve('../../../data');
const repoPath = require.resolve('../item_import.repository');

let repository: {
  getLootsWithItemsByCharacterIds(ids: number[] | null, realmId: unknown): Promise<unknown[]>;
};

beforeAll(() => {
  require.cache[dataPath] = {
    id: dataPath,
    filename: dataPath,
    loaded: true,
    exports: {
      prisma: {
        characters: { findMany: (...a: unknown[]) => findCharacters(...a) },
        imported_loots: { findMany: (...a: unknown[]) => findLoots(...a) },
        items: { findMany: (...a: unknown[]) => findItems(...a) },
      },
    },
  } as unknown as NodeJS.Module;
  delete require.cache[repoPath];
  repository = require('../item_import.repository');
});

afterAll(() => {
  delete require.cache[dataPath];
  delete require.cache[repoPath];
});

beforeEach(() => {
  findCharacters.mockReset().mockResolvedValue([{ id: 11 }]);
  findLoots.mockReset().mockResolvedValue([{ id: 1, characterID: 11, itemID: 5 }]);
  findItems.mockReset().mockResolvedValue([{ id: 5, name: 'Épée', icon: 'sword' }]);
});

describe('getLootsWithItemsByCharacterIds', () => {
  it('refuse de lire sans royaume', async () => {
    await expect(repository.getLootsWithItemsByCharacterIds([11], undefined)).rejects.toThrow(
      /realmId requis/,
    );
    await expect(repository.getLootsWithItemsByCharacterIds(null, 0)).rejects.toThrow();
    expect(findLoots).not.toHaveBeenCalled();
  });

  it('ne garde des characterIds explicites que ceux du royaume', async () => {
    await repository.getLootsWithItemsByCharacterIds([11, 99], 2);
    expect(findCharacters).toHaveBeenCalledWith({
      where: { id: { in: [11, 99] }, realmId: 2 },
      select: { id: true },
    });
    // seuls les personnages renvoyés par la requête cloisonnée sont lus
    expect(findLoots.mock.calls[0][0].where).toEqual({ characterID: { in: [11] } });
  });

  it('sans characterIds, lit les personnages actifs du royaume', async () => {
    await repository.getLootsWithItemsByCharacterIds(null, '2');
    expect(findCharacters.mock.calls[0][0].where).toEqual({
      realmId: 2,
      archived: 0,
      status: { not: 'pending' },
    });
  });

  it('ne lit rien si aucun personnage du royaume ne correspond', async () => {
    findCharacters.mockResolvedValueOnce([]);
    await expect(repository.getLootsWithItemsByCharacterIds([99], 2)).resolves.toEqual([]);
    expect(findLoots).not.toHaveBeenCalled();
  });
});
