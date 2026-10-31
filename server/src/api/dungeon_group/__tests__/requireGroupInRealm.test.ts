import type { AddressInfo } from 'node:net';

import express, { type Request, type Response } from 'express';

import errorHandler from '../../../shared/middleware/errorHandler';
import { validateParams, validateQuery } from '../../../shared/middleware/validate';
import { requireGroupInRealm } from '../dungeon_group.middleware';
import { groupIdParam, realmScopeQuery } from '../dungeon_group.validation';

const groupBelongsToRealm = vi.fn();

vi.mock('../usecases', () => ({
  groupBelongsToRealm: (...a: unknown[]) => groupBelongsToRealm(...a),
}));

async function get(path: string) {
  const app = express();
  app.get(
    '/groups/:id',
    validateParams(groupIdParam),
    validateQuery(realmScopeQuery),
    requireGroupInRealm,
    (_req: Request, res: Response) => res.json({ reached: true }),
  );
  app.use(errorHandler);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}${path}`);
    return { status: res.status, body: (await res.json()) as Record<string, unknown> };
  } finally {
    server.close();
  }
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  groupBelongsToRealm.mockReset().mockResolvedValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('requireGroupInRealm', () => {
  it('lets a group of the realm through', async () => {
    await expect(get('/groups/4?realmId=3')).resolves.toEqual({
      status: 200,
      body: { reached: true },
    });
    expect(groupBelongsToRealm).toHaveBeenCalledWith(4, 3);
  });

  it('answers 404 for a group of another realm, without reaching the handler', async () => {
    groupBelongsToRealm.mockResolvedValueOnce(false);
    const { status, body } = await get('/groups/4?realmId=9');
    expect(status).toBe(404);
    expect(body.error).toBe('not_found');
    expect(body.reached).toBeUndefined();
  });
});
