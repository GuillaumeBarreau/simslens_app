import type { AddressInfo } from 'node:net';

import express, { type Express, type Request, type Response } from 'express';
import Joi from 'joi';

import { NotFoundError } from '../../errors/AppError';
import errorHandler from '../errorHandler';
import { validateBody, validateParams, validateQuery } from '../validate';
import { validated } from '../validated';

/**
 * Monte une application jetable avec le vrai errorHandler, émet une requête
 * et renvoie le statut et le corps.
 */
async function request(build: (app: Express) => void, path: string, init?: RequestInit) {
  const app = express();
  app.use(express.json());
  build(app);
  app.use(errorHandler);

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}${path}`, init);
    return { status: res.status, body: (await res.json()) as Record<string, unknown> };
  } finally {
    server.close();
  }
}

beforeEach(() => {
  // errorHandler journalise chaque erreur : on garde la sortie des tests lisible.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('validated', () => {
  const idParam = Joi.object({ id: Joi.number().integer().positive().required() });

  it('returns params coerced by Joi', async () => {
    const { body } = await request(
      (app) =>
        app.get('/t/:id', validateParams(idParam), (req: Request, res: Response) => {
          const { id } = validated<{ id: number }>(req, 'params');
          res.json({ id, type: typeof id });
        }),
      '/t/42',
    );
    expect(body).toEqual({ id: 42, type: 'number' });
  });

  it('returns query with Joi defaults applied', async () => {
    const schema = Joi.object({ mode: Joi.string().default('all') });
    const { body } = await request(
      (app) =>
        app.get('/t', validateQuery(schema), (req: Request, res: Response) => {
          res.json(validated<{ mode: string }>(req, 'query'));
        }),
      '/t',
    );
    expect(body).toEqual({ mode: 'all' });
  });

  it('returns the validated body', async () => {
    const schema = Joi.object({ name: Joi.string().required() });
    const { body } = await request(
      (app) =>
        app.post('/t', validateBody(schema), (req: Request, res: Response) => {
          res.json(validated<{ name: string }>(req, 'body'));
        }),
      '/t',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Arthas', junk: true }),
      },
    );
    expect(body).toEqual({ name: 'Arthas' });
  });

  it('fails with a 500 when no schema validated the requested part', async () => {
    const { status, body } = await request(
      (app) =>
        app.get('/t/:id', (req: Request, res: Response) => {
          res.json(validated<{ id: number }>(req, 'params'));
        }),
      '/t/42',
    );
    expect(status).toBe(500);
    expect(body.error).toBe('unvalidated_request');
  });

  it('only trusts the parts that were actually validated', async () => {
    const { status, body } = await request(
      (app) =>
        app.get('/t/:id', validateParams(idParam), (req: Request, res: Response) => {
          res.json(validated(req, 'query'));
        }),
      '/t/42?raw=1',
    );
    expect(status).toBe(500);
    expect(body.error).toBe('unvalidated_request');
  });
});

describe('async handlers without try/catch (Express 5)', () => {
  it('forwards a thrown AppError to errorHandler', async () => {
    const { status, body } = await request(
      (app) =>
        app.get('/t', async () => {
          throw new NotFoundError('Character');
        }),
      '/t',
    );
    expect(status).toBe(404);
    expect(body.error).toBe('not_found');
    expect(body.message).toBe('Character not found');
    expect(body.errorId).toEqual(expect.any(String));
  });

  it('forwards an error thrown after an await', async () => {
    const { status, body } = await request(
      (app) =>
        app.get('/t', async () => {
          await Promise.resolve();
          throw new Error('boom');
        }),
      '/t',
    );
    expect(status).toBe(500);
    expect(body.error).toBe('server_error');
    expect(body.errorId).toEqual(expect.any(String));
  });
});
