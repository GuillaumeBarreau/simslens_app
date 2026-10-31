// Fiche d'un objet : cache Redis, puis base, puis API Blizzard. Les refus de
// Blizzard deviennent des erreurs du domaine, que errorHandler met en forme
// (SIMS-181 : le controller ne fait plus de res.status(4xx)).

const redisGet = vi.fn();
const redisSetex = vi.fn();
const fetchItemFromBlizzard = vi.fn();
const findById = vi.fn();
const create = vi.fn();

vi.mock('../../../shared/redis', () => ({
  default: {
    get: (...a: unknown[]) => redisGet(...a),
    setex: (...a: unknown[]) => redisSetex(...a),
  },
}));
vi.mock('../item.blizzard', () => ({
  fetchItemFromBlizzard: (...a: unknown[]) => fetchItemFromBlizzard(...a),
}));
vi.mock('../item.repository', () => ({
  default: {
    findById: (...a: unknown[]) => findById(...a),
    create: (...a: unknown[]) => create(...a),
  },
}));

import { getItemById as getItemHandler } from '../item.controller';
import { BlizzardCredentialsError, ItemNotFoundError } from '../item.errors';
import { getItemById } from '../usecases/getItemById';

function upstreamError(status: number) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status },
  });
}

beforeEach(() => {
  redisGet.mockResolvedValue(null);
  redisSetex.mockResolvedValue('OK');
  findById.mockResolvedValue(null);
  create.mockImplementation(async (data: { id: number }) => ({ id: data.id, name: 'Épée' }));
});

describe('getItemById', () => {
  it('sert le cache Redis sans lire la base ni Blizzard', async () => {
    redisGet.mockResolvedValue(JSON.stringify({ id: 5, name: 'Épée' }));
    await expect(getItemById(5)).resolves.toEqual({ id: 5, name: 'Épée' });
    expect(findById).not.toHaveBeenCalled();
    expect(fetchItemFromBlizzard).not.toHaveBeenCalled();
  });

  it('interroge Blizzard avec la région en minuscules et enregistre la fiche', async () => {
    fetchItemFromBlizzard.mockResolvedValue({ id: 5 });
    await expect(getItemById(5, 'EU')).resolves.toEqual({ id: 5, name: 'Épée' });
    expect(fetchItemFromBlizzard).toHaveBeenCalledWith(5, 'eu');
    expect(create).toHaveBeenCalledWith({ id: 5 });
  });

  it('un objet inconnu de Blizzard lève ItemNotFoundError (404) sans rien enregistrer', async () => {
    fetchItemFromBlizzard.mockRejectedValue(upstreamError(404));
    const error = await getItemById(5).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ItemNotFoundError);
    expect(error).toMatchObject({ statusCode: 404, code: 'item_not_found' });
    expect(create).not.toHaveBeenCalled();
    expect(redisSetex).not.toHaveBeenCalled();
  });

  it('un refus de Blizzard (403) lève BlizzardCredentialsError sans rien enregistrer', async () => {
    fetchItemFromBlizzard.mockRejectedValue(upstreamError(403));
    const error = await getItemById(5).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BlizzardCredentialsError);
    expect(error).toMatchObject({ statusCode: 403, code: 'blizzard_forbidden' });
    expect(create).not.toHaveBeenCalled();
  });

  it('laisse remonter toute autre erreur', async () => {
    const boom = upstreamError(500);
    fetchItemFromBlizzard.mockRejectedValue(boom);
    await expect(getItemById(5)).rejects.toBe(boom);
  });
});

describe('GET /1/items/:itemId — controller', () => {
  it('exige une session Battle.net (401) avant toute lecture', async () => {
    const res = { json: vi.fn() };
    await expect(
      getItemHandler({ user: { id: 'u1' } } as never, res as never),
    ).rejects.toMatchObject({ statusCode: 401, code: 'no_bnet_session' });
    expect(redisGet).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
