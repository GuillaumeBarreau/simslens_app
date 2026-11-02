import {
  addOwnCharacterSchema,
  bulkGearQuery,
  characterIdParam,
  checkMountParam,
  createCharacterSchema,
  discordTagParam,
  idParam,
  keyHistoryQuery,
  updateCharacterSchema,
} from '../character.validation';

const validate = (schema: { validate: (v: unknown, o: object) => unknown }, value: unknown) =>
  schema.validate(value, { abortEarly: false, stripUnknown: true, convert: true }) as {
    error?: unknown;
    value: Record<string, unknown>;
  };

describe('route identifiers', () => {
  it('convert digits to numbers', () => {
    expect(validate(characterIdParam, { characterId: '5' }).value).toEqual({ characterId: 5 });
    expect(validate(idParam, { id: '12' }).value).toEqual({ id: 12 });
    expect(validate(checkMountParam, { characterId: '5', mountId: '7' }).value).toEqual({
      characterId: 5,
      mountId: 7,
    });
  });

  // checkPermission lit l'identifiant brut : "1e1" désignerait deux personnages (SIMS-171).
  it.each(['1e1', '1.5e1', '0', '-1', 'abc'])('refuse %j', (id) => {
    expect(validate(characterIdParam, { characterId: id }).error).toBeDefined();
    expect(validate(idParam, { id }).error).toBeDefined();
  });
});

describe('bulkGearQuery', () => {
  it('converts the list of ids', () => {
    expect(validate(bulkGearQuery, { ids: '5,6, 7' }).value).toEqual({ ids: [5, 6, 7] });
  });

  it.each(['', '0', '5,', 'a,b', '5,1e1'])('refuses %j', (ids) => {
    expect(validate(bulkGearQuery, { ids }).error).toBeDefined();
  });

  it('requires ids', () => {
    expect(validate(bulkGearQuery, {}).error).toBeDefined();
  });
});

describe('keyHistoryQuery', () => {
  it('requires the realm', () => {
    expect(validate(keyHistoryQuery, {}).error).toBeDefined();
  });

  it('converts the realm, the week and the minimum level', () => {
    expect(
      validate(keyHistoryQuery, {
        realmId: '3',
        weekStart: '2026-04-08T03:00:00.000Z',
        minLevel: '12',
      }).value,
    ).toEqual({ realmId: 3, weekStart: new Date('2026-04-08T03:00:00.000Z'), minLevel: 12 });
  });

  it('refuses a week that is not an ISO date', () => {
    expect(validate(keyHistoryQuery, { realmId: '3', weekStart: 'yesterday' }).error).toBeDefined();
  });
});

describe('class and spec (SIMS-213)', () => {
  const character = { name: 'Arthas', realm: 'hyjal', class: 'paladin' };

  it('accepts a spec name or a spec id', () => {
    expect(validate(createCharacterSchema, { ...character, spec: ' Holy ' }).value).toMatchObject({
      spec: 'Holy',
    });
    expect(
      validate(createCharacterSchema, { ...character, specializationId: '4' }).value,
    ).toMatchObject({ specializationId: 4 });
    expect(validate(updateCharacterSchema, { specializationId: 4 }).error).toBeUndefined();
  });

  it('refuses a spec name and a spec id together', () => {
    expect(
      validate(createCharacterSchema, { ...character, spec: 'Holy', specializationId: 4 }).error,
    ).toBeDefined();
    expect(
      validate(updateCharacterSchema, { spec: 'Holy', specializationId: 4 }).error,
    ).toBeDefined();
  });

  it('refuses a blank spec or class', () => {
    expect(validate(createCharacterSchema, { ...character, spec: '  ' }).error).toBeDefined();
    expect(validate(createCharacterSchema, { ...character, class: ' ' }).error).toBeDefined();
    expect(validate(updateCharacterSchema, { spec: '' }).error).toBeDefined();
  });
});

describe('discordTagParam', () => {
  it('trims the tag', () => {
    expect(validate(discordTagParam, { tag: ' arthas ' }).value).toEqual({ tag: 'arthas' });
  });

  it('refuses a blank tag', () => {
    expect(validate(discordTagParam, { tag: '  ' }).error).toBeDefined();
  });
});

describe('addOwnCharacterSchema', () => {
  const own = { realmId: 7, name: ' Jean-Luc Picard ', class: 'rogue' };

  it('requires the guild and trims the name', () => {
    expect(validate(addOwnCharacterSchema, own).value).toEqual({
      ...own,
      name: 'Jean-Luc Picard',
    });
    expect(validate(addOwnCharacterSchema, { ...own, realmId: undefined }).error).toBeDefined();
  });

  it('refuses a name too long and duplicate off-specs', () => {
    expect(validate(addOwnCharacterSchema, { ...own, name: 'a'.repeat(41) }).error).toBeDefined();
    expect(
      validate(addOwnCharacterSchema, { ...own, offSpecializationIds: [3, 3] }).error,
    ).toBeDefined();
  });
});
