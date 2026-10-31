import {
  createInstanceSchema,
  initializeBossesSchema,
  INSTANCE_STATUSES,
  instanceIdParam,
  listInstancesQuery,
  updateInstanceSchema,
} from '../instance.validation';

const validInstance = { name: 'Molten Core', date: '2026-06-21', raidDifficultyId: 3 };

describe('createInstanceSchema', () => {
  it('accepts the payload the client actually sends', () => {
    expect(createInstanceSchema.validate(validInstance).error).toBeUndefined();
  });

  it('keeps realmId optional, the repository falling back to ensureRealmId', () => {
    expect(createInstanceSchema.validate({ ...validInstance, realmId: 1 }).error).toBeUndefined();
    expect(createInstanceSchema.validate(validInstance).value.realmId).toBeUndefined();
  });

  it('keeps the historical message without raidDifficultyId', () => {
    const payload: Record<string, unknown> = { ...validInstance };
    delete payload.raidDifficultyId;
    expect(createInstanceSchema.validate(payload).error!.message).toBe(
      'Raid difficulty ID is required',
    );
  });

  it.each(['name', 'date'])('requires %s, the column being non-nullable', (field: string) => {
    const payload: Record<string, unknown> = { ...validInstance };
    delete payload[field];
    expect(createInstanceSchema.validate(payload).error).toBeDefined();
  });

  it('coerces the date', () => {
    expect(createInstanceSchema.validate(validInstance).value.date).toBeInstanceOf(Date);
  });

  it('accepts an explicit boss list', () => {
    expect(
      createInstanceSchema.validate({ ...validInstance, bossIds: ['1', '2'] }).value.bossIds,
    ).toEqual([1, 2]);
  });
});

describe('updateInstanceSchema', () => {
  it('keeps the historical message for an empty payload', () => {
    expect(updateInstanceSchema.validate({}).error!.message).toBe(
      'At least one field must be provided for update',
    );
  });

  it.each(INSTANCE_STATUSES)('accepts the %s status', (status: string) => {
    expect(updateInstanceSchema.validate({ status }).error).toBeUndefined();
  });

  it('rejects an unknown status', () => {
    expect(updateInstanceSchema.validate({ status: 'PAUSED' }).error).toBeDefined();
  });

  it('accepts a zero boss count', () => {
    expect(updateInstanceSchema.validate({ bossesKilled: 0 }).error).toBeUndefined();
  });

  it('rejects a negative boss count', () => {
    expect(updateInstanceSchema.validate({ bossesKilled: -1 }).error).toBeDefined();
  });
});

describe('instanceIdParam', () => {
  it('coerces the id', () => {
    expect(instanceIdParam.validate({ id: '7' }).value.id).toBe(7);
  });

  it('keeps the historical message for a non-numeric id', () => {
    expect(instanceIdParam.validate({ id: 'x' }).error!.message).toBe('Instance ID is required');
  });
});

describe('listInstancesQuery', () => {
  it('leaves realmId optional', () => {
    expect(listInstancesQuery.validate({}).error).toBeUndefined();
  });
});

describe('initializeBossesSchema', () => {
  it('accepts an empty body, the difficulty being read from the instance', () => {
    expect(initializeBossesSchema.validate({}).error).toBeUndefined();
  });

  it('accepts an explicit difficulty', () => {
    expect(initializeBossesSchema.validate({ raidDifficultyId: 4 }).error).toBeUndefined();
  });
});
