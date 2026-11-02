import type { NextFunction, Request, Response } from 'express';

import { requireGameCapability } from '../requireGameCapability';

const getRealmById = vi.fn();

vi.mock('../../api/realm/realm.repository', () => ({
  default: { getRealmById: (...a: unknown[]) => getRealmById(...a) },
}));

function run(capability: Parameters<typeof requireGameCapability>[0], realmId?: number) {
  const req = { realmId } as Request;
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  const next = vi.fn() as unknown as NextFunction;
  return requireGameCapability(capability)(req, res as unknown as Response, next).then(() => ({
    res,
    next,
  }));
}

beforeEach(() => {
  getRealmById.mockReset();
});

describe('requireGameCapability', () => {
  it('lets a Retail realm use a Retail capability', async () => {
    getRealmById.mockResolvedValue({ id: 3, game: 'retail' });
    const { next, res } = await run('droptimizer', 3);
    expect(next).toHaveBeenCalledWith();
    expect(res.statusCode).toBe(200);
  });

  it('refuses a Retail-only capability to a Forever realm', async () => {
    getRealmById.mockResolvedValue({ id: 3, game: 'forever' });
    const { next, res } = await run('mythicPlus', 3);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({ code: 'GAME_CAPABILITY_UNAVAILABLE' });
  });

  it('lets a Forever realm use a Forever capability', async () => {
    getRealmById.mockResolvedValue({ id: 3, game: 'forever' });
    const { next } = await run('attunements', 3);
    expect(next).toHaveBeenCalledWith();
  });

  it('refuses a Forever-only capability to a Retail realm', async () => {
    getRealmById.mockResolvedValue({ id: 3, game: 'retail' });
    const { res } = await run('attunements', 3);
    expect(res.statusCode).toBe(409);
  });

  it('answers 400 when checkPermission did not run before', async () => {
    const { res, next } = await run('droptimizer');
    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
    expect(getRealmById).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown realm', async () => {
    getRealmById.mockResolvedValue(null);
    const { res } = await run('droptimizer', 3);
    expect(res.statusCode).toBe(404);
  });

  it('hands repository errors to the error handler', async () => {
    const boom = new Error('db down');
    getRealmById.mockRejectedValue(boom);
    const { next } = await run('droptimizer', 3);
    expect(next).toHaveBeenCalledWith(boom);
  });
});
