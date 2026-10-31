import {
  addGuestSchema,
  addMemberSchema,
  createGroupSchema,
  groupGuestParam,
  listGroupsQuery,
  updateGroupSchema,
} from '../dungeon_group.validation';

const validGroup = {
  realmId: 1,
  date: '2026-05-07',
  startTime: '20:00',
  endTime: '23:00',
  type: 'M+',
};

describe('createGroupSchema', () => {
  it('accepts a well-formed group', () => {
    expect(createGroupSchema.validate(validGroup).error).toBeUndefined();
  });

  it('rejects a malformed time', () => {
    const { error } = createGroupSchema.validate({ ...validGroup, endTime: '23h00' });
    expect(error!.message).toBe('Time must use the HH:MM format');
  });

  it('rejects an unknown dungeon type', () => {
    expect(createGroupSchema.validate({ ...validGroup, type: 'HC' }).error).toBeDefined();
  });

  it.each(['realmId', 'date', 'startTime', 'endTime', 'type'])('requires %s', (field: string) => {
    const payload: Record<string, unknown> = { ...validGroup };
    delete payload[field];
    expect(createGroupSchema.validate(payload).error).toBeDefined();
  });
});

describe('updateGroupSchema', () => {
  it.each(['DRAFT', 'CONFIRMED'])('accepts the %s status', (status: string) => {
    expect(updateGroupSchema.validate({ status }).error).toBeUndefined();
  });

  it('rejects a status outside the documented set', () => {
    expect(updateGroupSchema.validate({ status: 'ARCHIVED' }).error).toBeDefined();
  });

  it('rejects an empty payload', () => {
    expect(updateGroupSchema.validate({}).error).toBeDefined();
  });
});

describe('addMemberSchema', () => {
  it('accepts a dungeon role', () => {
    expect(addMemberSchema.validate({ userId: 'u1', role: 'DPS' }).error).toBeUndefined();
  });

  it('rejects a raid-only role', () => {
    expect(addMemberSchema.validate({ userId: 'u1', role: 'RANGED' }).error).toBeDefined();
  });

  it('keeps the historical message when a field is missing', () => {
    expect(addMemberSchema.validate({ userId: 'u1' }).error!.message).toBe(
      'userId and role are required',
    );
  });
});

describe('addGuestSchema', () => {
  it('accepts a named guest with a role', () => {
    expect(addGuestSchema.validate({ name: 'Blip', role: 'TANK' }).error).toBeUndefined();
  });

  it('trims the guest name', () => {
    expect(addGuestSchema.validate({ name: '  Blip  ', role: 'TANK' }).value.name).toBe('Blip');
  });

  it('rejects a blank guest name', () => {
    expect(addGuestSchema.validate({ name: '   ', role: 'TANK' }).error).toBeDefined();
  });
});

describe('groupGuestParam', () => {
  it('coerces both ids', () => {
    const { value } = groupGuestParam.validate({ id: '3', guestId: '7' });
    expect(value).toEqual({ id: 3, guestId: 7 });
  });
});

describe('listGroupsQuery', () => {
  it('requires realmId', () => {
    expect(listGroupsQuery.validate({}).error!.message).toBe('realmId is required');
  });

  it('accepts a single date filter', () => {
    expect(listGroupsQuery.validate({ realmId: 1, date: '2026-05-07' }).error).toBeUndefined();
  });
});
