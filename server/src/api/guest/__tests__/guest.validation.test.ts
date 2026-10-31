import { RAID_ROLES } from '../../../shared/constants/roles';
import {
  addGuestSchema,
  assignGuestSchema,
  guestAssignmentParam,
  guestParam,
  realmScopeQuery,
} from '../guest.validation';

describe('addGuestSchema', () => {
  it.each(RAID_ROLES)('accepts the %s role', (role: string) => {
    expect(addGuestSchema.validate({ name: 'Bob', role }).error).toBeUndefined();
  });

  it('normalises a lowercase role, as normalizeRole did', () => {
    expect(addGuestSchema.validate({ name: 'Bob', role: 'tank' }).value.role).toBe('TANK');
  });

  it('rejects DPS, which is a dungeon role', () => {
    expect(addGuestSchema.validate({ name: 'Bob', role: 'DPS' }).error!.message).toBe(
      `Invalid role. Must be one of: ${RAID_ROLES.join(', ')}`,
    );
  });

  it('trims the guest name', () => {
    expect(addGuestSchema.validate({ name: '  Bob  ', role: 'TANK' }).value.name).toBe('Bob');
  });

  it('rejects a blank guest name', () => {
    expect(addGuestSchema.validate({ name: '   ', role: 'TANK' }).error!.message).toBe(
      'Guest name is required',
    );
  });

  it('accepts an optional class and realmId', () => {
    const { error } = addGuestSchema.validate({
      name: 'Bob',
      role: 'HEALER',
      class: 'Priest',
      realmId: 3,
    });
    expect(error).toBeUndefined();
  });

  it('allows a null class', () => {
    expect(
      addGuestSchema.validate({ name: 'Bob', role: 'HEALER', class: null }).error,
    ).toBeUndefined();
  });
});

describe('assignGuestSchema', () => {
  it('requires a role', () => {
    expect(assignGuestSchema.validate({}).error!.message).toBe(
      `Invalid role. Must be one of: ${RAID_ROLES.join(', ')}`,
    );
  });

  it('normalises the role case', () => {
    expect(assignGuestSchema.validate({ role: 'ranged' }).value.role).toBe('RANGED');
  });
});

describe('route params', () => {
  it('coerces the guest params', () => {
    expect(guestParam.validate({ eventId: '4', guestId: '9' }).value).toEqual({
      eventId: 4,
      guestId: 9,
    });
  });

  it('coerces the assignment params', () => {
    expect(
      guestAssignmentParam.validate({ eventId: '4', guestId: '9', bossId: '2' }).value,
    ).toEqual({ eventId: 4, guestId: 9, bossId: 2 });
  });

  it('rejects a non-numeric event id', () => {
    expect(guestParam.validate({ eventId: 'x', guestId: '9' }).error).toBeDefined();
  });
});

describe('realmScopeQuery', () => {
  it('leaves realmId optional, since it may come from the body', () => {
    expect(realmScopeQuery.validate({}).error).toBeUndefined();
  });

  it('coerces realmId when present', () => {
    expect(realmScopeQuery.validate({ realmId: '7' }).value.realmId).toBe(7);
  });
});
