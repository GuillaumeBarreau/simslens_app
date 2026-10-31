const express = require('express');
const Joi = require('joi');

const { validateBody, validateParams, validateQuery } = require('../validate');

/**
 * Boot a throwaway express app and issue a single request against it.
 */
async function request(buildApp, path, init) {
  const app = express();
  app.use(express.json());
  buildApp(app);
  // Express reconnaît un error handler à son arité : les 4 paramètres sont requis.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({ code: err.code, errors: err.errors });
  });

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}${path}`, init);
    return { status: res.status, body: await res.json() };
  } finally {
    server.close();
  }
}

describe('validateQuery', () => {
  const schema = Joi.object({
    realmId: Joi.number().integer().required(),
    mode: Joi.string().default('all'),
  });
  const build = (app) => app.get('/t', validateQuery(schema), (req, res) => res.json(req.query));

  it('writes the coerced value back onto req.query', async () => {
    const { body } = await request(build, '/t?realmId=42');
    expect(body.realmId).toBe(42);
  });

  it('applies Joi defaults to req.query', async () => {
    const { body } = await request(build, '/t?realmId=42');
    expect(body.mode).toBe('all');
  });

  it('strips unknown query parameters', async () => {
    const { body } = await request(build, '/t?realmId=42&junk=nope');
    expect(body).not.toHaveProperty('junk');
  });

  it('rejects an invalid query with a 400 validation error', async () => {
    const { status, body } = await request(build, '/t?realmId=abc');
    expect(status).toBe(400);
    expect(body.code).toBe('validation_error');
    expect(body.errors[0].field).toBe('realmId');
  });
});

describe('validateBody', () => {
  it('writes the coerced body back onto req.body', async () => {
    const { body } = await request(
      (app) =>
        app.post('/t', validateBody(Joi.object({ n: Joi.number().required() })), (req, res) =>
          res.json({ type: typeof req.body.n }),
        ),
      '/t',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ n: '7' }),
      },
    );
    expect(body.type).toBe('number');
  });
});

describe('validateParams', () => {
  it('writes the coerced params back onto req.params', async () => {
    const { body } = await request(
      (app) =>
        app.get('/t/:id', validateParams(Joi.object({ id: Joi.number().required() })), (req, res) =>
          res.json({ type: typeof req.params.id }),
        ),
      '/t/9',
    );
    expect(body.type).toBe('number');
  });
});
