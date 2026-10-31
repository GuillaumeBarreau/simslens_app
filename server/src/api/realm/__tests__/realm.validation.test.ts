import { REALM_OWNER_ROLES } from '../realm.constants';
import {
  addCharacterSchema,
  addOwnerSchema,
  createRealmSchema,
  realmIdParam,
  realmOwnerParam,
  updateOwnerRoleSchema,
  updateSettingsSchema,
} from '../realm.validation';

describe('realmIdParam', () => {
  it('coerces a numeric string id', () => {
    expect(realmIdParam.validate({ id: '42' }).value.id).toBe(42);
  });

  it('rejects a non-numeric id', () => {
    expect(realmIdParam.validate({ id: 'abc' }).error).toBeDefined();
  });

  it('tolerates the realmId copy made by the route middleware', () => {
    expect(realmIdParam.validate({ id: '42', realmId: '42' }).error).toBeUndefined();
  });
});

describe('realmOwnerParam', () => {
  it('requires both the realm id and the owner id', () => {
    expect(realmOwnerParam.validate({ id: 1, ownerId: 'u1' }).error).toBeUndefined();
    expect(realmOwnerParam.validate({ id: 1 }).error).toBeDefined();
  });
});

describe('createRealmSchema', () => {
  const valid = { name: 'Nocturne', server: 'Hyjal', region: 'EU' };

  it('accepts a well-formed realm', () => {
    expect(createRealmSchema.validate(valid).error).toBeUndefined();
  });

  it('rejects an unsupported region', () => {
    expect(createRealmSchema.validate({ ...valid, region: 'FR' }).error).toBeDefined();
  });

  it('rejects a name shorter than two characters', () => {
    expect(createRealmSchema.validate({ ...valid, name: 'N' }).error).toBeDefined();
  });

  it('trims the name', () => {
    expect(createRealmSchema.validate({ ...valid, name: '  Nocturne ' }).value.name).toBe(
      'Nocturne',
    );
  });
});

describe('addCharacterSchema', () => {
  it('keeps the historical message when characterId is missing', () => {
    expect(addCharacterSchema.validate({}).error!.message).toBe('characterId is required');
  });
});

describe('addOwnerSchema', () => {
  it.each(REALM_OWNER_ROLES)('accepts the %s role', (role: string) => {
    expect(addOwnerSchema.validate({ ownerId: 'u1', role }).error).toBeUndefined();
  });

  it('rejects a role outside the documented set', () => {
    expect(addOwnerSchema.validate({ ownerId: 'u1', role: 'member' }).error).toBeDefined();
  });

  it('keeps the historical message when a field is missing', () => {
    expect(addOwnerSchema.validate({ ownerId: 'u1' }).error!.message).toBe(
      'ownerId and role are required',
    );
  });
});

describe('updateSettingsSchema', () => {
  it('keeps the editable settings, converting numeric strings', () => {
    const { error, value } = updateSettingsSchema.validate({
      discordGuildId: '123456789012345678',
      discordRaidCategoryId: null,
      signupLockHours: '24',
      signupReminderHours: 2,
      confirmReminderHours: 0,
    });
    expect(error).toBeUndefined();
    expect(value).toEqual({
      discordGuildId: '123456789012345678',
      discordRaidCategoryId: null,
      signupLockHours: 24,
      signupReminderHours: 2,
      confirmReminderHours: 0,
    });
  });

  it('accepts an empty Discord id, which removes it', () => {
    expect(updateSettingsSchema.validate({ discordGuildId: '' }).error).toBeUndefined();
  });

  it.each([-1, 1.5, 721, 'abc'])('rejects %s hours', (value) => {
    expect(updateSettingsSchema.validate({ signupLockHours: value }).error).toBeDefined();
  });

  it('strips keys that are not settings', () => {
    const { value } = updateSettingsSchema.validate(
      { id: 9, guildName: 'Other', signupLockHours: 12 },
      { stripUnknown: true },
    );
    expect(value).toEqual({ signupLockHours: 12 });
  });

  it('keeps the trimmed time zone (SIMS-204)', () => {
    const { error, value } = updateSettingsSchema.validate({ timezone: ' America/New_York ' });
    expect(error).toBeUndefined();
    expect(value).toEqual({ timezone: 'America/New_York' });
  });

  it.each(['', 'x'.repeat(65), 42])('rejects the time zone %s', (timezone) => {
    expect(updateSettingsSchema.validate({ timezone }).error).toBeDefined();
  });
});

describe('updateOwnerRoleSchema', () => {
  it('requires a role', () => {
    expect(updateOwnerRoleSchema.validate({}).error!.message).toBe('role is required');
  });

  it('rejects an unknown role', () => {
    expect(updateOwnerRoleSchema.validate({ role: 'guest' }).error).toBeDefined();
  });
});
