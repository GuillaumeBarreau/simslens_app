import type { Request } from 'express';

import { actorFromRequest, resolveActingRole } from '../signup.actingRole';
import { EventNotAccessibleError, SignupCharacterNotFoundError } from '../signup.errors';
import { deleteSignup } from '../usecases/deleteSignup';
import { upsertSignup } from '../usecases/upsertSignup';

const findCharacterByDiscordTag = vi.fn();
const getRealmUserRole = vi.fn();
const findSignupCharacter = vi.fn();
const findByEventAndCharacter = vi.fn();
const upsert = vi.fn();
const remove = vi.fn();
const belongsToRealm = vi.fn();
const assertSignupNotLocked = vi.fn();

vi.mock('../../character/character.repository', () => ({
  default: { findCharacterByDiscordTag: (...a: unknown[]) => findCharacterByDiscordTag(...a) },
}));
vi.mock('../../realm/realm.repository', () => ({
  default: { getRealmUserRole: (...a: unknown[]) => getRealmUserRole(...a) },
}));
vi.mock('../signup.repository', () => ({
  default: {
    findSignupCharacter: (...a: unknown[]) => findSignupCharacter(...a),
    findByEventAndCharacter: (...a: unknown[]) => findByEventAndCharacter(...a),
    upsert: (...a: unknown[]) => upsert(...a),
    remove: (...a: unknown[]) => remove(...a),
  },
}));
vi.mock('../../event/event.repository', () => ({
  default: { belongsToRealm: (...a: unknown[]) => belongsToRealm(...a) },
}));
vi.mock('../../event/event.service', () => ({
  default: { syncRosterToDiscord: () => Promise.resolve() },
}));
vi.mock('../signup.lock', () => ({
  assertSignupNotLocked: (...a: unknown[]) => assertSignupNotLocked(...a),
}));
vi.mock('../signup.characterCleanup', () => ({ cleanupOtherCharacterSignups: vi.fn() }));
vi.mock('../../activity_log/activity_log.utils', () => ({ logEventSignup: vi.fn() }));
vi.mock('../../absence/usecases', () => ({ handleSignupStatusChange: vi.fn() }));
vi.mock('../../../data', () => ({
  prisma: { raid_events: { findFirst: () => Promise.resolve(null) } },
}));

const CHARACTER = {
  id: 7,
  name: 'Arthas',
  class: 'Paladin',
  spec: 'Protection',
  userId: 'u1',
  specialization: { name: 'Protection' },
};

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  findCharacterByDiscordTag.mockReset().mockResolvedValue(null);
  getRealmUserRole.mockReset().mockResolvedValue(null);
  findSignupCharacter.mockReset().mockResolvedValue(CHARACTER);
  findByEventAndCharacter.mockReset().mockResolvedValue(null);
  upsert.mockReset().mockResolvedValue({ id: 1, role: 'TANK' });
  remove.mockReset().mockResolvedValue({ id: 1 });
  belongsToRealm.mockReset().mockResolvedValue(true);
  assertSignupNotLocked.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('actorFromRequest', () => {
  const request = (isInternalCall: boolean) =>
    ({
      isInternalCall,
      realmRole: 'member',
      get: (name: string) => (name === 'x-acting-discord-tag' ? 'officer#1' : undefined),
    }) as unknown as Request;

  it('keeps the Discord tag of a bot call', () => {
    expect(actorFromRequest(request(true))).toEqual({
      discordTag: 'officer#1',
      realmRole: 'member',
    });
  });

  it('ignores the Discord tag sent by a session client (SIMS-166)', () => {
    expect(actorFromRequest(request(false))).toEqual({
      discordTag: undefined,
      realmRole: 'member',
    });
  });
});

describe('resolveActingRole', () => {
  it('uses the role set by checkPermission when no Discord tag is given', async () => {
    await expect(resolveActingRole({ realmRole: 'officer' }, 3)).resolves.toBe('officer');
    expect(findCharacterByDiscordTag).not.toHaveBeenCalled();
  });

  it("uses the Discord player's role on the realm for a bot call", async () => {
    findCharacterByDiscordTag.mockResolvedValueOnce({ userId: 'u9' });
    getRealmUserRole.mockResolvedValueOnce('admin');
    await expect(resolveActingRole({ discordTag: 'bob#1', realmRole: 'officer' }, 3)).resolves.toBe(
      'admin',
    );
    expect(getRealmUserRole).toHaveBeenCalledWith(3, 'u9');
  });

  it('treats an unknown Discord tag as a member', async () => {
    await expect(resolveActingRole({ discordTag: 'ghost#0' }, 3)).resolves.toBe('member');
  });

  it('treats a player without a role on the realm as having no role', async () => {
    findCharacterByDiscordTag.mockResolvedValueOnce({ userId: 'u9' });
    await expect(resolveActingRole({ discordTag: 'bob#1' }, 3)).resolves.toBeUndefined();
  });
});

describe('upsertSignup', () => {
  const input = { eventId: 10, characterId: 7, status: 'PRESENT' as const };

  it('raises a 404 for an unknown character, before any other check', async () => {
    findSignupCharacter.mockResolvedValueOnce(null);
    await expect(upsertSignup(input, 3, {})).rejects.toBeInstanceOf(SignupCharacterNotFoundError);
    expect(belongsToRealm).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('checks the lock against the resolved acting role', async () => {
    await upsertSignup(input, 3, { realmRole: 'officer' });
    expect(assertSignupNotLocked).toHaveBeenCalledWith(10, 'officer');
  });

  it('refuses an event of another realm', async () => {
    belongsToRealm.mockResolvedValueOnce(false);
    await expect(upsertSignup(input, 3, {})).rejects.toBeInstanceOf(EventNotAccessibleError);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("derives the role from the character's specialization", async () => {
    await upsertSignup(input, 3, {});
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ role: 'TANK' }));
  });
});

describe('deleteSignup', () => {
  it('checks the lock against the resolved acting role', async () => {
    findCharacterByDiscordTag.mockResolvedValueOnce(null);
    await deleteSignup(10, 7, 3, { discordTag: 'ghost#0' });
    expect(assertSignupNotLocked).toHaveBeenCalledWith(10, 'member');
    expect(remove).toHaveBeenCalledWith(10, 7);
  });
});
