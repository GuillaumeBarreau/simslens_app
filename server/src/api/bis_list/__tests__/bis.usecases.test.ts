import { getBisList, saveBisSlot } from '../usecases';

const findSpecialization = vi.fn();
const listGuildEntries = vi.fn();
const replaceSlot = vi.fn();

vi.mock('../bis.repository', () => ({
  default: {
    findSpecialization: (...a: unknown[]) => findSpecialization(...a),
    listGuildEntries: (...a: unknown[]) => listGuildEntries(...a),
    replaceSlot: (...a: unknown[]) => replaceSlot(...a),
  },
}));

beforeEach(() => {
  findSpecialization
    .mockReset()
    .mockResolvedValue({ id: 73, name: 'Protection', class: { name: 'warrior' } });
  listGuildEntries.mockReset().mockResolvedValue([]);
  replaceSlot.mockReset().mockResolvedValue([]);
});

describe('getBisList', () => {
  it('reads the guild entries of every tier up to the current one', async () => {
    const result = await getBisList({ realmId: 3, specializationId: 73, season: 'tier-1' }, []);
    expect(listGuildEntries).toHaveBeenCalledWith(3, 73, ['tier-1']);
    expect(result.slots.map((s) => s.slot)).toContain('ranged');
    expect(result.slots.every((s) => s.items.length === 0)).toBe(true);
  });

  it('applies the reference of the specialization only', async () => {
    const result = await getBisList({ realmId: 3, specializationId: 73, season: 'tier-1' }, [
      {
        className: 'warrior',
        specName: 'Protection',
        season: 'tier-1',
        slots: { head: [{ itemId: 1, note: null }] },
        sources: [],
      },
      {
        className: 'warrior',
        specName: 'Fury',
        season: 'tier-1',
        slots: { chest: [{ itemId: 2, note: null }] },
        sources: [],
      },
    ]);
    expect(result.slots.find((s) => s.slot === 'head')?.source).toBe('curated');
    expect(result.slots.find((s) => s.slot === 'chest')?.source).toBeNull();
  });

  it('refuses a specialization that Forever does not offer', async () => {
    findSpecialization.mockResolvedValueOnce({
      id: 9,
      name: 'Havoc',
      class: { name: 'demon_hunter' },
    });
    await expect(
      getBisList({ realmId: 3, specializationId: 9, season: 'tier-1' }, []),
    ).rejects.toMatchObject({ statusCode: 400, code: 'invalid_specialization' });
  });

  it('refuses an unknown tier', async () => {
    await expect(
      getBisList({ realmId: 3, specializationId: 73, season: 'tier-9' }, []),
    ).rejects.toMatchObject({ statusCode: 400, code: 'unknown_season' });
    expect(listGuildEntries).not.toHaveBeenCalled();
  });
});

describe('saveBisSlot', () => {
  it('replaces the guild list of the slot, ranked in order', async () => {
    await saveBisSlot(
      3,
      'head',
      {
        specializationId: 73,
        season: 'tier-1',
        items: [{ itemId: 5 }, { itemId: 6, note: 'alt' }],
      },
      'user-1',
    );
    expect(replaceSlot).toHaveBeenCalledWith(
      { realmId: 3, specializationId: 73, season: 'tier-1', slot: 'head' },
      [
        { itemId: 5, note: null, rank: 1 },
        { itemId: 6, note: 'alt', rank: 2 },
      ],
      'user-1',
    );
  });

  it('clears the override with an empty list', async () => {
    await saveBisSlot(3, 'head', { specializationId: 73, season: 'tier-1', items: [] }, 'u');
    expect(replaceSlot).toHaveBeenCalledWith(expect.anything(), [], 'u');
  });

  it('refuses the same item twice', async () => {
    await expect(
      saveBisSlot(
        3,
        'head',
        { specializationId: 73, season: 'tier-1', items: [{ itemId: 5 }, { itemId: 5 }] },
        'u',
      ),
    ).rejects.toMatchObject({ statusCode: 400, code: 'duplicate_item' });
    expect(replaceSlot).not.toHaveBeenCalled();
  });
});
