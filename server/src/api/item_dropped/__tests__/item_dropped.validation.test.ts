import {
  assignLootSchema,
  createLootSchema,
  listLootsQuery,
  lootIdParam,
} from '../item_dropped.validation';

describe('listLootsQuery', () => {
  it('requires instanceId', () => {
    expect(listLootsQuery.validate({}).error!.message).toBe('instanceId query param is required');
  });

  it('coerces instanceId', () => {
    expect(listLootsQuery.validate({ instanceId: '5' }).value.instanceId).toBe(5);
  });

  it('converts the "null" sentinel used to list unassigned loot into null', () => {
    expect(listLootsQuery.validate({ instanceId: 5, assignedTo: 'null' }).value.assignedTo).toBe(
      null,
    );
  });

  it('leaves assignedTo out when absent', () => {
    expect(listLootsQuery.validate({ instanceId: 5 }).value).not.toHaveProperty('assignedTo');
  });

  it('coerces a numeric assignedTo', () => {
    expect(listLootsQuery.validate({ instanceId: 5, assignedTo: '7' }).value.assignedTo).toBe(7);
  });

  it('rejects any other assignedTo string', () => {
    expect(listLootsQuery.validate({ instanceId: 5, assignedTo: 'nobody' }).error).toBeDefined();
  });

  it('accepts an optional bossId', () => {
    expect(listLootsQuery.validate({ instanceId: 5, bossId: '3' }).value.bossId).toBe(3);
  });
});

describe('createLootSchema', () => {
  it('accepts a complete loot', () => {
    expect(
      createLootSchema.validate({ instanceId: 1, bossId: 2, itemId: 3 }).error,
    ).toBeUndefined();
  });

  it.each(['instanceId', 'bossId', 'itemId'])(
    'keeps the historical message without %s',
    (field: string) => {
      const payload: Record<string, unknown> = { instanceId: 1, bossId: 2, itemId: 3 };
      delete payload[field];
      expect(createLootSchema.validate(payload).error!.message).toBe(
        'Missing required fields: instanceId, bossId, itemId',
      );
    },
  );

  it('allows creating an already assigned loot', () => {
    expect(
      createLootSchema.validate({ instanceId: 1, bossId: 2, itemId: 3, assignedTo: 9 }).error,
    ).toBeUndefined();
  });
});

describe('assignLootSchema', () => {
  it('requires assignedTo', () => {
    expect(assignLootSchema.validate({}).error!.message).toBe('assignedTo is required');
  });

  it('accepts null to unassign', () => {
    expect(assignLootSchema.validate({ assignedTo: null }).error).toBeUndefined();
  });

  it('accepts assignedBy 0, the historical default', () => {
    expect(assignLootSchema.validate({ assignedTo: 5, assignedBy: 0 }).error).toBeUndefined();
  });
});

describe('lootIdParam', () => {
  it('coerces the loot id', () => {
    expect(lootIdParam.validate({ id: '42' }).value.id).toBe(42);
  });

  it('rejects a non-numeric loot id', () => {
    expect(lootIdParam.validate({ id: 'x' }).error!.message).toBe('Loot not found');
  });
});
