import type { AddressInfo } from 'node:net';

import express, { type Request, type Response } from 'express';
import Joi from 'joi';

import { validateParams } from '../../middleware/validate';
import { validated } from '../../middleware/validated';
import { routeId } from '../routeId';

const schema = Joi.object({ id: routeId.required() });

describe('routeId', () => {
  it('converts a digits-only id into a number', () => {
    expect(schema.validate({ id: '12' }).value).toEqual({ id: 12 });
  });

  // Chacune de ces valeurs donne un autre nombre (ou NaN) à parseInt, utilisé
  // par checkPermission pour résoudre le royaume : elles doivent être refusées.
  it.each(['1e1', '1.5e1', '12.0', ' 12', '012', '0', '-3', 'abc', '0x10', ''])(
    'rejects %j',
    (id: string) => {
      expect(schema.validate({ id }).error).toBeDefined();
    },
  );
});

describe('routeId behind validateParams (SIMS-171)', () => {
  async function get(path: string) {
    const app = express();
    app.get('/characters/:id', validateParams(schema), (req: Request, res: Response) => {
      res.json(validated<{ id: number }>(req, 'params'));
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    app.use((err: { statusCode?: number }, _req: Request, res: Response, _next: unknown) => {
      res.status(err.statusCode ?? 500).json({});
    });
    const server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    try {
      const { port } = server.address() as AddressInfo;
      const res = await fetch(`http://127.0.0.1:${port}${path}`);
      return { status: res.status, body: (await res.json()) as unknown };
    } finally {
      server.close();
    }
  }

  it('hands the same id as parseInt to the handler', async () => {
    await expect(get('/characters/42')).resolves.toEqual({ status: 200, body: { id: 42 } });
  });

  it('refuses an exponent id that parseInt would read as another character', async () => {
    await expect(get('/characters/1e1')).resolves.toMatchObject({ status: 400 });
  });
});
