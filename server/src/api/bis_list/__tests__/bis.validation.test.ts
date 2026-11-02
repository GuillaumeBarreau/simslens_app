import { bisScopeQuery, bisSlotParam, saveBisSlotSchema } from '../bis.validation';

describe('bis validation', () => {
  it('requires a realm, a specialization and a tier', () => {
    expect(bisScopeQuery.validate({ realmId: '3', specializationId: '73' }).error).toBeDefined();
    expect(
      bisScopeQuery.validate({ realmId: '3', specializationId: '73', season: 'tier-1' }).value,
    ).toEqual({ realmId: 3, specializationId: 73, season: 'tier-1' });
  });

  it('knows the ranged slot of Forever, and only known slots', () => {
    expect(bisSlotParam.validate({ slot: 'ranged' }).error).toBeUndefined();
    expect(bisSlotParam.validate({ slot: 'tabard' }).error).toBeDefined();
  });

  it('caps the number of items of a slot', () => {
    const items = Array.from({ length: 6 }, (_, i) => ({ itemId: i + 1 }));
    expect(
      saveBisSlotSchema.validate({ specializationId: 73, season: 'tier-1', items }).error,
    ).toBeDefined();
  });
});
