const {
  REGIONS,
  claimCharacterSchema,
  guildRosterQuery,
  importGuildMembersSchema,
  listCharactersQuery,
} = require('../blizzard.validation');

describe('region validation', () => {
  it.each(REGIONS)('accepts %s', (region) => {
    expect(listCharactersQuery.validate({ region }).error).toBeUndefined();
  });

  it.each(REGIONS.map((r) => r.toLowerCase()))('accepts the lowercase %s', (region) => {
    expect(listCharactersQuery.validate({ region }).error).toBeUndefined();
  });

  it.each([
    ['eu', 'eu'],
    ['EU', 'EU'],
    ['Us', 'Us'],
  ])('leaves %s untouched, the handlers owning the casing', (input, expected) => {
    expect(listCharactersQuery.validate({ region: input }).value.region).toBe(expected);
  });

  it('rejects an unknown region', () => {
    expect(listCharactersQuery.validate({ region: 'xx' }).error.message).toBe(
      `region must be one of: ${REGIONS.join(', ')}`,
    );
  });

  it('leaves the region optional', () => {
    expect(listCharactersQuery.validate({}).error).toBeUndefined();
  });
});

describe('claimCharacterSchema', () => {
  it('accepts a name and a realm', () => {
    expect(claimCharacterSchema.validate({ name: 'Bob', realm: 'Hyjal' }).error).toBeUndefined();
  });

  it.each(['name', 'realm'])('keeps the historical message without %s', (field) => {
    const payload = { name: 'Bob', realm: 'Hyjal' };
    delete payload[field];
    expect(claimCharacterSchema.validate(payload).error.message).toBe(
      'Name and Realm are required',
    );
  });

  it('rejects a blank name', () => {
    expect(claimCharacterSchema.validate({ name: '  ', realm: 'Hyjal' }).error.message).toBe(
      'Name and Realm are required',
    );
  });
});

describe('guildRosterQuery', () => {
  it('accepts a realm, a guild and the realm scope', () => {
    expect(
      guildRosterQuery.validate({ realm: 'hyjal', guild: 'Nocturne', realmId: 2 }).error,
    ).toBeUndefined();
  });

  it('requires realmId: reading a guild roster is checked against edit_roster', () => {
    expect(guildRosterQuery.validate({ realm: 'hyjal', guild: 'Nocturne' }).error).toBeDefined();
  });

  it.each(['realm', 'guild'])('keeps the historical message without %s', (field) => {
    const payload = { realm: 'hyjal', guild: 'Nocturne' };
    delete payload[field];
    expect(guildRosterQuery.validate(payload).error.message).toBe(
      'Realm and Guild name are required',
    );
  });
});

describe('importGuildMembersSchema', () => {
  it('accepts a list of members', () => {
    expect(
      importGuildMembersSchema.validate({ members: [{ name: 'Bob', classId: 1 }], realmId: 2 })
        .error,
    ).toBeUndefined();
  });

  it('accepts an empty list', () => {
    expect(importGuildMembersSchema.validate({ members: [], realmId: 2 }).error).toBeUndefined();
  });

  it('requires realmId: an import always targets one realm', () => {
    expect(importGuildMembersSchema.validate({ members: [] }).error).toBeDefined();
  });

  it.each([{ members: 'x' }, {}])('keeps the historical message for %j', (payload) => {
    expect(importGuildMembersSchema.validate(payload).error.message).toBe(
      'Members must be an array',
    );
  });
});
