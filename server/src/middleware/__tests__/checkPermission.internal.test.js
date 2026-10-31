import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const checkPermission = require('../checkPermission');
const realmRepo = require('../../api/realm/realm.repository');
// Valeur de Permission.SIGNUP_EVENT (permissions.ts, non chargeable depuis un test JS).
const SIGNUP_EVENT = 'signup_event';

const BOT_TOKEN = 'bot-token-for-tests';

/** Exécute le middleware sur une requête factice ; renvoie la requête et l'issue. */
async function run({ headers = {}, user } = {}) {
  const req = {
    headers,
    user,
    query: { realmId: '3' },
    body: {},
    params: {},
    baseUrl: '',
    path: '/t',
    originalUrl: '/t',
  };
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json: vi.fn(),
  };
  const next = vi.fn();
  await checkPermission(SIGNUP_EVENT)(req, res, next);
  return { req, res, next };
}

beforeEach(() => {
  vi.stubEnv('DISCORD_BOT_TOKEN', BOT_TOKEN);
  vi.spyOn(realmRepo, 'getRealmUserRole').mockResolvedValue('member');
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('checkPermission — internal calls (SIMS-166)', () => {
  it('flags a bot call carrying the internal token', async () => {
    const { req, next } = await run({ headers: { 'x-internal-token': BOT_TOKEN } });
    expect(next).toHaveBeenCalled();
    expect(req.isInternalCall).toBe(true);
    expect(req.realmRole).toBe('admin');
  });

  it('does not flag a session call', async () => {
    const { req, next } = await run({ user: { id: 'u1' } });
    expect(next).toHaveBeenCalled();
    expect(req.isInternalCall).toBe(false);
    expect(req.realmRole).toBe('member');
  });

  it('does not flag a session call carrying a wrong internal token', async () => {
    const { req } = await run({ user: { id: 'u1' }, headers: { 'x-internal-token': 'nope' } });
    expect(req.isInternalCall).toBe(false);
    expect(req.realmRole).toBe('member');
  });

  it('rejects a call with neither session nor valid token', async () => {
    const { res, next } = await run({ headers: { 'x-internal-token': 'nope' } });
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});
