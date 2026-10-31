// Controller des notes de boss (SIMS-206) : entrées validées par Joi, royaume
// lu sur checkPermission, jamais dans la query ni le corps.

const listBossNotes = vi.fn();
const saveBossNote = vi.fn();

vi.mock('../usecases', () => ({
  listBossNotes: (...a: unknown[]) => listBossNotes(...a),
  saveBossNote: (...a: unknown[]) => saveBossNote(...a),
}));

import type { RequestHandler } from 'express';

import * as controller from '../boss_note.controller';
import {
  eventBossParam,
  eventIdParam,
  realmScopeQuery,
  saveBossNoteSchema,
} from '../boss_note.validation';

const {
  validateBody,
  validateParams,
  validateQuery,
} = require('../../../shared/middleware/validate');

/** Passe la requête dans les middlewares de validation, comme la route. */
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
  listBossNotes.mockReset().mockResolvedValue([]);
  saveBossNote.mockReset().mockResolvedValue({ bossId: 10 });
});

describe('GET /1/events/:eventId/boss-notes', () => {
  it('lists the notes of the event within the checked realm', async () => {
    const r = res();
    const req = await validatedRequest(
      { realmId: 3, realmRole: 'member', params: { eventId: '1' }, query: { realmId: '3' } },
      [validateParams(eventIdParam), validateQuery(realmScopeQuery)],
    );
    await controller.list(req, r as never);
    expect(listBossNotes).toHaveBeenCalledWith(1, 3);
    expect(r.json).toHaveBeenCalledWith({ notes: [] });
  });

  it('refuses (500) a realm set by injectRealmId alone, without checkPermission', async () => {
    const req = await validatedRequest({ realmId: 9, params: { eventId: '1' }, query: {} }, [
      validateParams(eventIdParam),
      validateQuery(realmScopeQuery),
    ]);
    await expect(controller.list(req, res() as never)).rejects.toMatchObject({
      statusCode: 500,
      code: 'unchecked_realm',
    });
    expect(listBossNotes).not.toHaveBeenCalled();
  });
});

describe('PUT /1/events/:eventId/boss-notes/:bossId', () => {
  const body = { content: 'Plan', assignments: [{ characterId: 7, task: 'soak' }] };

  it('saves the note as the connected user, within the checked realm', async () => {
    const r = res();
    const req = await validatedRequest(
      {
        realmId: 3,
        realmRole: 'moderator',
        user: { id: 'u1' },
        params: { eventId: '1', bossId: '10' },
        query: { realmId: '3' },
        body: { ...body, realmId: 9 },
      },
      [
        validateParams(eventBossParam),
        validateQuery(realmScopeQuery),
        validateBody(saveBossNoteSchema),
      ],
    );
    await controller.save(req, r as never);
    expect(saveBossNote).toHaveBeenCalledWith({
      eventId: 1,
      bossId: 10,
      realmId: 3,
      userId: 'u1',
      input: body,
    });
    expect(r.json).toHaveBeenCalledWith({ note: { bossId: 10 } });
  });

  it('refuses (401) an internal call without user', async () => {
    const req = await validatedRequest(
      { realmId: 3, realmRole: 'admin', params: { eventId: '1', bossId: '10' }, query: {}, body },
      [
        validateParams(eventBossParam),
        validateQuery(realmScopeQuery),
        validateBody(saveBossNoteSchema),
      ],
    );
    await expect(controller.save(req, res() as never)).rejects.toMatchObject({ statusCode: 401 });
    expect(saveBossNote).not.toHaveBeenCalled();
  });
});
