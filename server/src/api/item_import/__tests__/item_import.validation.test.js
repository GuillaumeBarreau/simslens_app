const { bulkLootsQuery, uploadSchema } = require('../item_import.validation');

// GET /1/import/loots?characterId= a été retirée (SIMS-124) : son schéma
// characterLootsQuery et ses tests avec.

describe('bulkLootsQuery', () => {
  it('requires realmId: loot is only read realm by realm', () => {
    expect(bulkLootsQuery.validate({ all: '1' }).error).toBeDefined();
    expect(bulkLootsQuery.validate({ all: '1', realmId: '2' }).value.realmId).toBe(2);
  });

  it.each(['1', 'true'])('reads all=%s as true', (all) => {
    expect(bulkLootsQuery.validate({ all, realmId: 2 }).value.all).toBe(true);
  });

  it('defaults all to false', () => {
    expect(bulkLootsQuery.validate({ realmId: 2 }).value.all).toBe(false);
  });

  it('splits a comma-separated id list into numbers', () => {
    expect(
      bulkLootsQuery.validate({ characterIds: '1,2,3', realmId: 2 }).value.characterIds,
    ).toEqual([1, 2, 3]);
  });

  it('tolerates spaces around the ids', () => {
    expect(
      bulkLootsQuery.validate({ characterIds: '1, 2', realmId: 2 }).value.characterIds,
    ).toEqual([1, 2]);
  });

  it('rejects a malformed id list instead of silently dropping entries', () => {
    expect(bulkLootsQuery.validate({ characterIds: 'a,b', realmId: 2 }).error.message).toBe(
      'characterIds must be a comma-separated list of ids',
    );
  });

  it('leaves characterIds undefined when absent, meaning every character', () => {
    expect(bulkLootsQuery.validate({ realmId: 2 }).value.characterIds).toBeUndefined();
  });
});

describe('uploadSchema', () => {
  it('requires realmId: an import always targets one realm', () => {
    expect(uploadSchema.validate({ rows: [] }).error).toBeDefined();
  });

  it('requires rows', () => {
    expect(uploadSchema.validate({ filename: 'sim.csv', realmId: 2 }).error.message).toBe(
      'rows is required',
    );
  });

  it('rejects rows that are not an array', () => {
    expect(uploadSchema.validate({ rows: 'nope', realmId: 2 }).error.message).toBe(
      'rows must be an array',
    );
  });

  it('accepts an empty import', () => {
    expect(uploadSchema.validate({ rows: [], realmId: 2 }).error).toBeUndefined();
  });

  it('leaves the shape of each row free', () => {
    const { error } = uploadSchema.validate({
      rows: [{ player: 'Bob-Hyjal', anything: 1 }, 'raw line'],
      realmId: 2,
    });
    expect(error).toBeUndefined();
  });
});
