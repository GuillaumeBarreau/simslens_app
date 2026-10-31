import { describe, expect, it, vi } from 'vitest';

import { buildDevUser, createDevLogin, devLoginBlockReason, safeRedirectPath } from './devLogin';

const ALLOWED = {
  nodeEnv: 'development',
  enableFlag: '1',
  clientUrl: 'http://localhost:5173',
  remoteAddress: '127.0.0.1',
};

describe('devLoginBlockReason', () => {
  it('autorise uniquement le développement local explicitement activé', () => {
    expect(devLoginBlockReason(ALLOWED)).toBeNull();
    expect(devLoginBlockReason({ ...ALLOWED, remoteAddress: '::1' })).toBeNull();
    expect(devLoginBlockReason({ ...ALLOWED, remoteAddress: '::ffff:127.0.0.1' })).toBeNull();
  });

  it.each([
    ['production', { nodeEnv: 'production' }],
    ['test', { nodeEnv: 'test' }],
    ['NODE_ENV absent', { nodeEnv: undefined }],
    ['drapeau absent', { enableFlag: undefined }],
    ['drapeau à 0', { enableFlag: '0' }],
    ['drapeau à true', { enableFlag: 'true' }],
    ['client distant', { clientUrl: 'https://droptimizer.example.com' }],
    ['client invalide', { clientUrl: 'pas une url' }],
    ['requête depuis le réseau', { remoteAddress: '192.168.1.20' }],
    ['requête depuis docker', { remoteAddress: '172.18.0.5' }],
    ['adresse absente', { remoteAddress: undefined }],
  ])('refuse : %s', (_label, override) => {
    expect(devLoginBlockReason({ ...ALLOWED, ...override })).not.toBeNull();
  });
});

describe('buildDevUser', () => {
  it('a le format passport-bnet, sans token Blizzard, et n’expire pas', () => {
    const user = buildDevUser('123456');
    expect(user).toMatchObject({
      id: '123456',
      battletag: 'Dev#123456',
      token: null,
      refreshToken: null,
      provider: 'dev',
    });
    expect(user.expiresAt).toBeGreaterThan(Date.now() + 300 * 24 * 3600 * 1000);
  });
});

describe('safeRedirectPath', () => {
  it('garde les chemins internes', () => {
    expect(safeRedirectPath('/roster')).toBe('/roster');
    expect(safeRedirectPath('/wishlist?specId=3')).toBe('/wishlist?specId=3');
  });

  it.each([undefined, '', 'roster', '//evil.com', '/\\evil.com', 'https://evil.com', ['/a']])(
    'remplace %s par /redirect',
    (value) => {
      expect(safeRedirectPath(value)).toBe('/redirect');
    },
  );
});

function setup({
  env = { NODE_ENV: 'development', ENABLE_DEV_LOGIN: '1' },
  remoteAddress = '127.0.0.1',
  query = {},
  characters = [{ id: 1 }],
} = {}) {
  const findCharactersByUserId = vi.fn().mockResolvedValue(characters);
  const logger = { warn: vi.fn() };
  const handler = createDevLogin({
    env,
    clientUrl: 'http://localhost:5173',
    findCharactersByUserId,
    logger,
  });
  const req = {
    query,
    socket: { remoteAddress },
    logIn: vi.fn((user, cb) => cb()),
  };
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    redirect: vi.fn(),
  };
  const next = vi.fn();
  return { handler, req, res, next, findCharactersByUserId };
}

describe('GET /auth/dev-login', () => {
  it('répond 404 et n’ouvre aucune session hors développement', async () => {
    const { handler, req, res, findCharactersByUserId } = setup({
      env: { NODE_ENV: 'production', ENABLE_DEV_LOGIN: '1' },
      query: { userId: '42' },
    });
    await handler(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(req.logIn).not.toHaveBeenCalled();
    expect(findCharactersByUserId).not.toHaveBeenCalled();
  });

  it('répond 404 pour une requête qui ne vient pas de la machine', async () => {
    const { handler, req, res } = setup({ remoteAddress: '10.0.0.8', query: { userId: '42' } });
    await handler(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(req.logIn).not.toHaveBeenCalled();
  });

  it('exige un userId numérique', async () => {
    for (const userId of [undefined, '', 'abc', '12;DROP', '1'.repeat(21)]) {
      const { handler, req, res } = setup({ query: { userId } });
      await handler(req, res, vi.fn());
      expect(res.status).toHaveBeenCalledWith(400);
      expect(req.logIn).not.toHaveBeenCalled();
    }
  });

  it('refuse un utilisateur sans personnage', async () => {
    const { handler, req, res } = setup({ query: { userId: '42' }, characters: [] });
    await handler(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(req.logIn).not.toHaveBeenCalled();
  });

  it('ouvre la session et redirige vers le client', async () => {
    const { handler, req, res, findCharactersByUserId } = setup({
      query: { userId: '42', redirect: '/roster' },
    });
    await handler(req, res, vi.fn());
    expect(findCharactersByUserId).toHaveBeenCalledWith('42');
    expect(req.logIn).toHaveBeenCalledWith(
      expect.objectContaining({ id: '42', token: null }),
      expect.any(Function),
    );
    expect(res.redirect).toHaveBeenCalledWith('http://localhost:5173/roster');
  });

  it('ne redirige jamais hors du client', async () => {
    const { handler, req, res } = setup({ query: { userId: '42', redirect: '//evil.com' } });
    await handler(req, res, vi.fn());
    expect(res.redirect).toHaveBeenCalledWith('http://localhost:5173/redirect');
  });

  it('transmet les erreurs à next', async () => {
    const { handler, req, res, next, findCharactersByUserId } = setup({ query: { userId: '42' } });
    findCharactersByUserId.mockRejectedValue(new Error('db down'));
    await handler(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(req.logIn).not.toHaveBeenCalled();
  });
});
