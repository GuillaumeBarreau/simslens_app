import { afterEach, describe, expect, it, vi } from 'vitest';

import { eventIdParam, generateCompositionBody, realmScopeQuery } from '../composition.validation';

/**
 * La composition ne lit l'événement :eventId que dans le royaume vérifié par
 * checkPermission : sans realmId dans le where, un officier d'une guilde
 * obtiendrait le contexte (inscrits, historique) d'un événement d'une autre.
 * buildCompositionContext répond 404 quand cette lecture ne trouve rien.
 */
const { prisma } = require('../../../data');
const repo = require('../composition.repository');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('composition repository — event scoped to the checked realm', () => {
  it('reads the event only within the given realm', async () => {
    const findFirst = vi.spyOn(prisma.raid_events, 'findFirst').mockResolvedValue(null);
    await expect(repo.getEventContext(5, 3)).resolves.toBeNull();
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5, realmId: 3 } }),
    );
  });

  it('reads past assignments only within the given realm', async () => {
    const findMany = vi.spyOn(prisma.raid_events, 'findMany').mockResolvedValue([]);
    await repo.getPastBossAssignments({
      realmId: 3,
      raidDifficultyId: 2,
      excludeEventId: 5,
      beforeDate: new Date('2026-01-15'),
      weeks: 2,
    });
    expect(findMany.mock.calls[0][0].where).toMatchObject({ realmId: 3, raidDifficultyId: 2 });
  });
});

describe('composition validation', () => {
  it('reads :eventId with digits only, like checkPermission', () => {
    expect(eventIdParam.validate({ eventId: '12' }).value.eventId).toBe(12);
    for (const eventId of ['1e1', '12.0', '0', 'abc']) {
      expect(eventIdParam.validate({ eventId }).error.message).toBe('Event ID must be a number');
    }
  });

  it('still requires realmId in the query', () => {
    expect(realmScopeQuery.validate({}).error.message).toBe('realmId is required');
  });

  it('keeps the generation settings and the pre-built context untouched', () => {
    const body = {
      weights: { buffs: 2 },
      selectedBossIds: ['3', 4],
      context: { schemaVersion: 1, pool: [{ characterId: 1, extra: true }] },
      unrelated: 'x',
    };
    const { error, value } = generateCompositionBody.validate(body, { stripUnknown: true });
    expect(error).toBeUndefined();
    expect(value).toEqual({
      weights: { buffs: 2 },
      selectedBossIds: ['3', 4],
      context: { schemaVersion: 1, pool: [{ characterId: 1, extra: true }] },
    });
  });

  it('accepts a request without body', () => {
    expect(generateCompositionBody.validate(undefined).value).toEqual({});
  });
});
