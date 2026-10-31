import { RAID_ROLES } from '../../../shared/constants/roles';
import {
  assignSchema,
  copySchema,
  eventBossParam,
  importSchema,
  realmScopeWithBossQuery,
  reorderSchema,
} from '../roster.validation';

describe('assignSchema', () => {
  const valid = { characterId: 1, role: 'TANK', bossId: 2 };

  it.each(RAID_ROLES)('accepts the %s role', (role: string) => {
    expect(assignSchema.validate({ ...valid, role }).error).toBeUndefined();
  });

  it('rejects DPS, which is not a raid role', () => {
    expect(assignSchema.validate({ ...valid, role: 'DPS' }).error!.message).toBe(
      `Invalid role. Must be one of: ${RAID_ROLES.join(', ')}`,
    );
  });

  it('keeps the historical message when characterId or role is missing', () => {
    expect(assignSchema.validate({ bossId: 2, role: 'TANK' }).error!.message).toBe(
      'characterId and role are required',
    );
    expect(assignSchema.validate({ characterId: 1, bossId: 2 }).error!.message).toBe(
      'characterId and role are required',
    );
  });

  it('keeps the historical message when bossId is missing', () => {
    expect(assignSchema.validate({ characterId: 1, role: 'TANK' }).error!.message).toBe(
      'bossId is required',
    );
  });

  it('defaults position to 0', () => {
    expect(assignSchema.validate(valid).value.position).toBe(0);
  });

  it('accepts an explicit position of 0', () => {
    expect(assignSchema.validate({ ...valid, position: 0 }).error).toBeUndefined();
  });
});

describe('reorderSchema', () => {
  it('accepts a well-formed reorder', () => {
    const { error, value } = reorderSchema.validate({
      bossId: 1,
      role: 'HEALER',
      characterIds: ['3', '4'],
    });
    expect(error).toBeUndefined();
    expect(value.characterIds).toEqual([3, 4]);
  });

  it('rejects a non-array characterIds', () => {
    expect(
      reorderSchema.validate({ bossId: 1, role: 'HEALER', characterIds: 'x' }).error!.message,
    ).toBe('bossId, role, and characterIds array are required');
  });

  it('accepts an empty characterIds array', () => {
    expect(
      reorderSchema.validate({ bossId: 1, role: 'HEALER', characterIds: [] }).error,
    ).toBeUndefined();
  });
});

describe('copySchema', () => {
  it('accepts a source and a list of targets', () => {
    expect(copySchema.validate({ sourceBossId: 1, targetBossIds: [2, 3] }).error).toBeUndefined();
  });

  it('keeps the historical message when targets are missing', () => {
    expect(copySchema.validate({ sourceBossId: 1 }).error!.message).toBe(
      'sourceBossId and targetBossIds array are required',
    );
  });
});

describe('importSchema', () => {
  it('requires sourceEventId', () => {
    expect(importSchema.validate({}).error!.message).toBe('sourceEventId is required');
  });
});

describe('realmScopeWithBossQuery', () => {
  it('keeps an optional bossId rather than stripping it', () => {
    const { value } = realmScopeWithBossQuery.validate({ realmId: '1', bossId: '9' });
    expect(value).toEqual({ realmId: 1, bossId: 9 });
  });

  it('still requires realmId', () => {
    expect(realmScopeWithBossQuery.validate({ bossId: 9 }).error!.message).toBe(
      'realmId is required',
    );
  });
});

describe('eventBossParam', () => {
  it('coerces both route ids', () => {
    expect(eventBossParam.validate({ eventId: '4', bossId: '8' }).value).toEqual({
      eventId: 4,
      bossId: 8,
    });
  });
});
