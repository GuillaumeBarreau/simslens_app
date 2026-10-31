import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const checkPermission = require('../checkPermission');
const realmRepo = require('../../api/realm/realm.repository');
const characterRepo = require('../../api/character/character.repository');
const eventRepo = require('../../api/event/event.repository');
// Valeur de Permission.MANAGE_WISHLIST (permissions.ts, non chargeable depuis un test JS).
const MANAGE_WISHLIST = 'manage_wishlist';

/** Exécute le middleware sur une requête factice ; renvoie la requête et l'issue. */
async function run({
  params = {},
  query = {},
  body = {},
  url = '/1/characters/5/wishlist/HEAD',
  permission = MANAGE_WISHLIST,
  options,
} = {}) {
  const [path] = url.split('?');
  const req = {
    headers: {},
    user: { id: 'u1' },
    params,
    query,
    body,
    baseUrl: '',
    path,
    originalUrl: url,
  };
  const res = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  const next = vi.fn();
  await checkPermission(permission, options)(req, res, next);
  return { req, res, next };
}

beforeEach(() => {
  vi.spyOn(realmRepo, 'getRealmUserRole').mockResolvedValue('admin');
  vi.spyOn(characterRepo, 'findCharacterById').mockResolvedValue({ id: 5, realmId: 1 });
  vi.spyOn(eventRepo, 'findById').mockResolvedValue({ id: 9, realmId: 1 });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('checkPermission — strict ids (SIMS-173)', () => {
  it.each(['1e1', '1.5e1', '12abc', '0'])('refuses the character id %j', async (id) => {
    const { res, next } = await run({ params: { id } });
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'invalid_id' });
    expect(next).not.toHaveBeenCalled();
    expect(characterRepo.findCharacterById).not.toHaveBeenCalled();
  });

  it('refuses an ambiguous realmId', async () => {
    const { res, next } = await run({ params: { id: '5' }, query: { realmId: '1e1' } });
    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('refuses a realmId given twice', async () => {
    const { res } = await run({ params: { id: '5' }, query: { realmId: ['1', '2'] } });
    expect(res.statusCode).toBe(400);
  });

  it('refuses an ambiguous event id', async () => {
    const { res } = await run({ params: { eventId: '9e0' }, url: '/1/events/9e0/roster' });
    expect(res.statusCode).toBe(400);
  });
});

describe('checkPermission — resource of the checked realm (SIMS-173)', () => {
  it('derives the realm from the character of the route', async () => {
    const { req, next } = await run({ params: { id: '5' } });
    expect(next).toHaveBeenCalled();
    expect(characterRepo.findCharacterById).toHaveBeenCalledWith(5);
    expect(req.realmId).toBe(1);
  });

  it('accepts a realmId matching the character', async () => {
    const { req, next } = await run({ params: { id: '5' }, query: { realmId: '1' } });
    expect(next).toHaveBeenCalled();
    expect(req.realmId).toBe(1);
  });

  it('refuses a character of another realm than the one passed in query', async () => {
    const { res, next } = await run({ params: { id: '5' }, query: { realmId: '2' } });
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('leaves a character without realm to the usecases', async () => {
    characterRepo.findCharacterById.mockResolvedValueOnce({ id: 5, realmId: null });
    const { req, next } = await run({ params: { id: '5' }, query: { realmId: '2' } });
    expect(next).toHaveBeenCalled();
    expect(req.realmId).toBe(2);
  });

  it('refuses an event of another realm than the one passed in query', async () => {
    const { res } = await run({
      params: { eventId: '9' },
      query: { realmId: '2' },
      url: '/1/events/9/roster',
    });
    expect(res.statusCode).toBe(403);
  });

  it('derives the realm from the event of the route', async () => {
    const { req, next } = await run({ params: { eventId: '9' }, url: '/1/events/9/roster' });
    expect(next).toHaveBeenCalled();
    expect(eventRepo.findById).toHaveBeenCalledWith(9);
    expect(req.realmId).toBe(1);
  });
});

describe('checkPermission — route and realm sources (SIMS-173, review)', () => {
  it('recognises a character route whatever its case', async () => {
    const { res, next } = await run({
      params: { id: '5' },
      query: { realmId: '2' },
      url: '/1/Characters/5/wishlist/HEAD',
    });
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('ignores the query string when telling the resource of :id', async () => {
    const { next } = await run({
      params: { id: '7' },
      query: { realmId: '2' },
      url: '/1/absences/7',
    });
    expect(next).toHaveBeenCalled();
    expect(eventRepo.findById).not.toHaveBeenCalled();
    expect(characterRepo.findCharacterById).not.toHaveBeenCalled();
  });

  it('refuses a query realm contradicting the realm of the route', async () => {
    const { res, next } = await run({
      params: { id: '2', realmId: '2' },
      query: { realmId: '1' },
      url: '/1/realms/2/invites',
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'realm_conflict' });
    expect(next).not.toHaveBeenCalled();
  });

  it('refuses a body realm contradicting the query realm', async () => {
    const { res } = await run({
      query: { realmId: '1' },
      body: { realmId: 2 },
      url: '/1/character/update-all',
    });
    expect(res.body).toEqual({ error: 'realm_conflict' });
  });

  it('accepts matching realm sources of different types', async () => {
    const { req, next } = await run({
      query: { realmId: '1' },
      body: { realmId: 1 },
      url: '/1/character/update-all',
    });
    expect(next).toHaveBeenCalled();
    expect(req.realmId).toBe(1);
  });

  it('lets an event of the realm manage a character that has since changed guild', async () => {
    characterRepo.findCharacterById.mockResolvedValueOnce({ id: 5, realmId: 2 });
    const { next } = await run({
      params: { eventId: '9', characterId: '5' },
      query: { realmId: '1' },
      url: '/1/events/9/signup/5',
    });
    expect(next).toHaveBeenCalled();
  });

  it('lets an owner self-edit their own character, loaded once', async () => {
    realmRepo.getRealmUserRole.mockResolvedValueOnce('member');
    characterRepo.findCharacterById.mockResolvedValueOnce({ id: 5, realmId: 1, userId: 'u1' });
    const { next } = await run({
      params: { id: '5' },
      url: '/1/character/5',
      permission: 'edit_roster',
      options: { allowSelfEdit: true },
    });
    expect(next).toHaveBeenCalled();
    expect(characterRepo.findCharacterById).toHaveBeenCalledTimes(1);
  });
});
