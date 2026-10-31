import {
  enrichCharacter,
  groupAndSortByUser,
  INHERITED_SIGNUP_STATUS,
  userKeyOf,
} from '../roster.availability';
import type { EnrichedPoolCharacter, PoolCharacter, SignupInfo } from '../roster.types';

const character = (over: Partial<PoolCharacter> = {}): PoolCharacter => ({
  id: 1,
  name: 'Bob',
  class: 'Warrior',
  specialization: null,
  userId: 'u1',
  realmId: 3,
  ...over,
});

const emptyContext = () => ({
  signupsByCharacterId: new Map<number, SignupInfo>(),
  assignedNameByUserKey: new Map<string, string>(),
  charactersInConcurrentEvents: new Set<number>(),
});

describe('userKeyOf', () => {
  it('combines the member and the realm', () => {
    expect(userKeyOf(character())).toBe('u1:3');
  });

  it('returns null for a character without a linked account', () => {
    expect(userKeyOf(character({ userId: null }))).toBeNull();
  });
});

describe('enrichCharacter', () => {
  it('marks a character whose member signed up with another one as inherited', () => {
    const result = enrichCharacter(character(), emptyContext());
    expect(result.signupStatus).toBe(INHERITED_SIGNUP_STATUS);
    expect(result.isDirectSignup).toBe(false);
  });

  it('carries the declared signup over', () => {
    const ctx = emptyContext();
    ctx.signupsByCharacterId.set(1, { status: 'PRESENT', role: 'TANK', lateTime: null });

    const result = enrichCharacter(character(), ctx);
    expect(result).toMatchObject({
      signupStatus: 'PRESENT',
      signupRole: 'TANK',
      isDirectSignup: true,
    });
  });

  it('keeps the late time of a LATE signup', () => {
    const ctx = emptyContext();
    ctx.signupsByCharacterId.set(1, { status: 'LATE', role: null, lateTime: '21:30' });
    expect(enrichCharacter(character(), ctx).lateTime).toBe('21:30');
  });

  it('disables a character whose member is already placed', () => {
    const ctx = emptyContext();
    ctx.assignedNameByUserKey.set('u1:3', 'Alt');

    const result = enrichCharacter(character(), ctx);
    expect(result.disabled).toBe(true);
    expect(result.disabledReason).toBe('SAME_USER_ALREADY_ASSIGNED');
    expect(result.assignedCharacterName).toBe('Alt');
  });

  it('leaves an unlinked character enabled, having no member to clash with', () => {
    const ctx = emptyContext();
    ctx.assignedNameByUserKey.set('u1:3', 'Alt');

    expect(enrichCharacter(character({ userId: null }), ctx).disabled).toBe(false);
  });

  it('flags a character already placed on an overlapping raid', () => {
    const ctx = emptyContext();
    ctx.charactersInConcurrentEvents.add(1);
    expect(enrichCharacter(character(), ctx).inConcurrentEvent).toBe(true);
  });

  it('does not disable a character merely booked on an overlapping raid', () => {
    const ctx = emptyContext();
    ctx.charactersInConcurrentEvents.add(1);
    expect(enrichCharacter(character(), ctx).disabled).toBe(false);
  });
});

const enriched = (over: Partial<EnrichedPoolCharacter>): EnrichedPoolCharacter => ({
  ...character(),
  signupStatus: INHERITED_SIGNUP_STATUS,
  signupRole: null,
  lateTime: null,
  isDirectSignup: false,
  disabled: false,
  disabledReason: null,
  inConcurrentEvent: false,
  assignedCharacterName: null,
  ...over,
});

describe('groupAndSortByUser', () => {
  it('puts the signed-up character ahead of the rerolls of the same member', () => {
    const result = groupAndSortByUser([
      enriched({ id: 2, name: 'Alt', userId: 'u1' }),
      enriched({ id: 1, name: 'Zed', userId: 'u1', isDirectSignup: true }),
    ]);
    expect(result.map((c) => c.name)).toEqual(['Zed', 'Alt']);
  });

  it('picks the first name alphabetically when a member signed up twice', () => {
    const result = groupAndSortByUser([
      enriched({ id: 1, name: 'Zed', userId: 'u1', isDirectSignup: true }),
      enriched({ id: 2, name: 'Abe', userId: 'u1', isDirectSignup: true }),
    ]);
    expect(result.map((c) => c.name)).toEqual(['Abe', 'Zed']);
  });

  it('sorts the rerolls of a member alphabetically', () => {
    const result = groupAndSortByUser([
      enriched({ id: 1, name: 'Main', userId: 'u1', isDirectSignup: true }),
      enriched({ id: 3, name: 'Zoe', userId: 'u1' }),
      enriched({ id: 2, name: 'Ana', userId: 'u1' }),
    ]);
    expect(result.map((c) => c.name)).toEqual(['Main', 'Ana', 'Zoe']);
  });

  it('sorts the members by the name of their main', () => {
    const result = groupAndSortByUser([
      enriched({ id: 1, name: 'Zed', userId: 'u1', isDirectSignup: true }),
      enriched({ id: 2, name: 'Abe', userId: 'u2', isDirectSignup: true }),
    ]);
    expect(result.map((c) => c.name)).toEqual(['Abe', 'Zed']);
  });

  it('falls back to the first reroll when a member has no signed-up character', () => {
    const result = groupAndSortByUser([
      enriched({ id: 1, name: 'Zed', userId: 'u1', isDirectSignup: true }),
      enriched({ id: 2, name: 'Abe', userId: 'u2' }),
    ]);
    expect(result.map((c) => c.name)).toEqual(['Abe', 'Zed']);
  });

  it('keeps unlinked characters as groups of their own', () => {
    const result = groupAndSortByUser([
      enriched({ id: 1, name: 'Solo', userId: null }),
      enriched({ id: 2, name: 'Other', userId: null }),
    ]);
    expect(result).toHaveLength(2);
  });

  it('returns an empty list unchanged', () => {
    expect(groupAndSortByUser([])).toEqual([]);
  });

  it('keeps every character exactly once', () => {
    const input = [
      enriched({ id: 1, name: 'Main', userId: 'u1', isDirectSignup: true }),
      enriched({ id: 2, name: 'Alt', userId: 'u1' }),
      enriched({ id: 3, name: 'Solo', userId: 'u2', isDirectSignup: true }),
    ];
    expect(groupAndSortByUser(input)).toHaveLength(3);
  });
});
