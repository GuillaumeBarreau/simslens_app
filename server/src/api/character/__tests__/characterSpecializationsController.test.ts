// Routes des spécialisations d'un personnage (SIMS-212) : entrées validées par
// Joi, personnage lu dans le royaume vérifié par checkPermission.

const getCharacterSpecializations = vi.fn();
const updateCharacterSpecializations = vi.fn();
const listClassSpecializations = vi.fn();

vi.mock('../usecases', () => ({
  getCharacterSpecializations: (...a: unknown[]) => getCharacterSpecializations(...a),
  updateCharacterSpecializations: (...a: unknown[]) => updateCharacterSpecializations(...a),
  listClassSpecializations: (...a: unknown[]) => listClassSpecializations(...a),
}));

import type { RequestHandler } from 'express';

import * as controller from '../character.controller';
import {
  classSpecializationsQuery,
  idParam,
  updateCharacterSpecializationsSchema,
} from '../character.validation';

const {
  validateBody,
  validateParams,
  validateQuery,
} = require('../../../shared/middleware/validate');

async function validatedRequest(req: Record<string, unknown>, middlewares: RequestHandler[]) {
  for (const middleware of middlewares) {
    await new Promise<void>((resolve, reject) =>
      middleware(req as never, {} as never, (err?: unknown) => (err ? reject(err) : resolve())),
    );
  }
  return req as never;
}

function res() {
  const r = { json: vi.fn(), status: vi.fn() };
  r.status.mockReturnValue(r);
  return r;
}

beforeEach(() => {
  for (const fn of [
    getCharacterSpecializations,
    updateCharacterSpecializations,
    listClassSpecializations,
  ]) {
    fn.mockReset().mockResolvedValue({ ok: true });
  }
});

describe('GET /1/character/classes/specializations', () => {
  it('serves the reference list', async () => {
    const req = await validatedRequest({ query: {} }, [validateQuery(classSpecializationsQuery)]);
    const r = res();
    await controller.listClassSpecializations(req, r as never);
    expect(r.json).toHaveBeenCalledWith({ ok: true });
    expect(listClassSpecializations).toHaveBeenCalledWith(undefined);
  });

  it('passes the requested game (SIMS-027)', async () => {
    const req = await validatedRequest({ query: { game: 'forever' } }, [
      validateQuery(classSpecializationsQuery),
    ]);
    await controller.listClassSpecializations(req, res() as never);
    expect(listClassSpecializations).toHaveBeenCalledWith('forever');
  });

  it.each(['classic', 'Forever', ''])('refuses game=%s', async (game) => {
    await expect(
      validatedRequest({ query: { game } }, [validateQuery(classSpecializationsQuery)]),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('refuses (500) a route mounted without query validation', async () => {
    await expect(
      controller.listClassSpecializations({ query: {} } as never, res() as never),
    ).rejects.toMatchObject({ statusCode: 500, code: 'unvalidated_request' });
  });
});

describe('GET /1/character/:id/specializations', () => {
  it('reads the character within the checked realm', async () => {
    const req = await validatedRequest({ realmId: 3, realmRole: 'member', params: { id: '5' } }, [
      validateParams(idParam),
    ]);
    await controller.getSpecializations(req, res() as never);
    expect(getCharacterSpecializations).toHaveBeenCalledWith(5, 3);
  });

  it('refuses (500) a route mounted without checkPermission', async () => {
    const req = await validatedRequest({ realmId: 3, params: { id: '5' } }, [
      validateParams(idParam),
    ]);
    await expect(controller.getSpecializations(req, res() as never)).rejects.toMatchObject({
      statusCode: 500,
      code: 'unchecked_realm',
    });
    expect(getCharacterSpecializations).not.toHaveBeenCalled();
  });
});

describe('PUT /1/character/:id/specializations', () => {
  it('passes the converted ids to the usecase, within the checked realm', async () => {
    const req = await validatedRequest(
      {
        realmId: 3,
        realmRole: 'member',
        params: { id: '5' },
        body: { specializationId: '65', offSpecializationIds: ['70', 66] },
      },
      [validateParams(idParam), validateBody(updateCharacterSpecializationsSchema)],
    );
    await controller.updateSpecializations(req, res() as never);
    expect(updateCharacterSpecializations).toHaveBeenCalledWith(5, 3, {
      specializationId: 65,
      offSpecializationIds: [70, 66],
    });
  });

  it.each([
    ['a missing off-spec list', { specializationId: 65 }],
    ['a duplicated off-spec', { offSpecializationIds: [70, 70] }],
    ['an invalid id', { offSpecializationIds: [0] }],
  ])('refuses (400) %s', async (_label, body) => {
    await expect(
      validatedRequest({ realmId: 3, realmRole: 'admin', params: { id: '5' }, body }, [
        validateParams(idParam),
        validateBody(updateCharacterSpecializationsSchema),
      ]),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('does not let another field, such as the officer-only status, through', async () => {
    const req = await validatedRequest(
      {
        realmId: 3,
        realmRole: 'member',
        params: { id: '5' },
        body: { offSpecializationIds: [], status: 'approved' },
      },
      [validateParams(idParam), validateBody(updateCharacterSpecializationsSchema)],
    );
    await controller.updateSpecializations(req, res() as never);
    expect(updateCharacterSpecializations).toHaveBeenCalledWith(5, 3, { offSpecializationIds: [] });
  });
});
