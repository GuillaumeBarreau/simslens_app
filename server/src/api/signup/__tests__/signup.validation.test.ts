import { DUNGEON_ROLES } from '../../../shared/constants/roles';
import {
  eventCharacterParam,
  realmScopeQuery,
  SIGNUP_STATUSES,
  upsertSignupSchema,
} from '../signup.validation';

describe('upsertSignupSchema', () => {
  it.each(SIGNUP_STATUSES)('accepts the %s status', (status: string) => {
    expect(upsertSignupSchema.validate({ characterId: 1, status }).error).toBeUndefined();
  });

  it('rejects a status outside the SignupStatus enum', () => {
    expect(upsertSignupSchema.validate({ characterId: 1, status: 'MAYBE' }).error).toBeDefined();
  });

  it('requires a character id', () => {
    expect(upsertSignupSchema.validate({ status: 'PRESENT' }).error).toBeDefined();
  });

  it.each(DUNGEON_ROLES)('accepts the stored role %s', (role: string) => {
    expect(
      upsertSignupSchema.validate({ characterId: 1, status: 'PRESENT', role }).error,
    ).toBeUndefined();
  });

  it('rejects a raid-only role, the column storing TANK/HEALER/DPS', () => {
    expect(
      upsertSignupSchema.validate({ characterId: 1, status: 'PRESENT', role: 'MELEE' }).error,
    ).toBeDefined();
  });

  it('accepts a late signup with its time', () => {
    expect(
      upsertSignupSchema.validate({ characterId: 1, status: 'LATE', lateTime: '21:30' }).error,
    ).toBeUndefined();
  });

  it.each(['9pm', '25:00', '21h30'])('rejects the malformed lateTime %s', (lateTime: string) => {
    expect(
      upsertSignupSchema.validate({ characterId: 1, status: 'LATE', lateTime }).error!.message,
    ).toBe('lateTime must use the HH:MM format');
  });

  it('allows clearing lateTime with null', () => {
    expect(
      upsertSignupSchema.validate({ characterId: 1, status: 'PRESENT', lateTime: null }).error,
    ).toBeUndefined();
  });

  it('allows an absence reason', () => {
    expect(
      upsertSignupSchema.validate({
        characterId: 1,
        status: 'ABSENT',
        absenceReason: 'vacances',
      }).error,
    ).toBeUndefined();
  });
});

describe('signup route params', () => {
  it('coerces the event and character ids', () => {
    expect(eventCharacterParam.validate({ eventId: '2', characterId: '9' }).value).toEqual({
      eventId: 2,
      characterId: 9,
    });
  });

  it('requires realmId in the query', () => {
    expect(realmScopeQuery.validate({}).error!.message).toBe('realmId is required');
  });
});
