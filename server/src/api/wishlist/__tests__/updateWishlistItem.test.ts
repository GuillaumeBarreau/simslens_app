// Historique des wishlists (SIMS-205) : un changement de priorité seul ne
// trace rien ; un changement d'objet ou un premier ajout est tracé.

const { logWishlistUpdate } = vi.hoisted(() => ({ logWishlistUpdate: vi.fn() }));

vi.mock('../../activity_log/activity_log.utils', () => ({ logWishlistUpdate }));

import { updateWishlistItem } from '../usecases/updateWishlistItem';

const { prisma } = require('../../../data');
const repo = require('../wishlist.repository');

function serveSlot(current: { slot: string; itemId: number | null; priority: number } | null) {
  vi.spyOn(repo, 'specBelongsToCharacter').mockResolvedValue(true);
  vi.spyOn(repo, 'getCharacterWishlist').mockResolvedValue(current ? [current] : []);
  vi.spyOn(prisma.characters, 'findUnique').mockResolvedValue({ name: 'Thrall', realmId: 3 });
  return vi.spyOn(repo, 'setWishlistItem').mockResolvedValue(1);
}

beforeEach(() => {
  logWishlistUpdate.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('updateWishlistItem — activity log', () => {
  it('does not log a priority change on the same item', async () => {
    const setItem = serveSlot({ slot: 'head', itemId: 100, priority: 0 });

    await updateWishlistItem(31, 262, 'head', 100, 5, 'user-1');

    expect(setItem).toHaveBeenCalledWith(31, 262, 'head', 100, 5);
    expect(logWishlistUpdate).not.toHaveBeenCalled();
  });

  it('logs a change of item', async () => {
    serveSlot({ slot: 'head', itemId: 100, priority: 2 });

    await updateWishlistItem(31, 262, 'head', 101, 2, 'user-1');

    expect(logWishlistUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ oldItemId: 100, newItemId: 101, realmId: 3, slot: 'head' }),
    );
  });

  it('logs the first item of a slot', async () => {
    serveSlot(null);

    await updateWishlistItem(31, 262, 'head', 100, 0, 'user-1');

    expect(logWishlistUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ oldItemId: null, newItemId: 100 }),
    );
  });
});
