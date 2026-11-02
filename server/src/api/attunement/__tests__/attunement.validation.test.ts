import {
  characterAttunementParam,
  realmQuery,
  saveAttunementSchema,
} from '../attunement.validation';

describe('attunement validation', () => {
  it('requires a realm for the roster', () => {
    expect(realmQuery.validate({}).error).toBeDefined();
    expect(realmQuery.validate({ realmId: '3' }).value).toEqual({ realmId: 3 });
  });

  it('only knows the attunements of the catalogue', () => {
    expect(
      characterAttunementParam.validate({ characterId: '10', attunement: 'drakefire_amulet' })
        .error,
    ).toBeUndefined();
    expect(
      characterAttunementParam.validate({ characterId: '10', attunement: 'nope' }).error,
    ).toBeDefined();
  });

  it('refuses a character id that checkPermission would read differently', () => {
    expect(
      characterAttunementParam.validate({ characterId: '1e1', attunement: 'drakefire_amulet' })
        .error,
    ).toBeDefined();
  });

  it('requires a faction and a non-negative step count', () => {
    expect(
      saveAttunementSchema.validate({ faction: 'horde', completedSteps: 2 }).error,
    ).toBeUndefined();
    expect(
      saveAttunementSchema.validate({ faction: 'scourge', completedSteps: 2 }).error,
    ).toBeDefined();
    expect(
      saveAttunementSchema.validate({ faction: 'horde', completedSteps: -1 }).error,
    ).toBeDefined();
  });
});
