import { copyWishlistFromCharacter } from '../usecases/copyWishlistFromCharacter';

const findCharacterById = vi.fn();
const specBelongsToCharacter = vi.fn();
const copy = vi.fn();

vi.mock('../../character/character.repository', () => ({
  default: { findCharacterById: (...a: unknown[]) => findCharacterById(...a) },
}));
vi.mock('../wishlist.repository', () => ({
  default: {
    specBelongsToCharacter: (...a: unknown[]) => specBelongsToCharacter(...a),
    copyWishlistFromCharacter: (...a: unknown[]) => copy(...a),
  },
}));

beforeEach(() => {
  findCharacterById.mockReset().mockResolvedValue({ id: 7, realmId: 3 });
  specBelongsToCharacter.mockReset().mockResolvedValue(true);
  copy.mockReset().mockResolvedValue({ copied: 4 });
});

describe('copyWishlistFromCharacter', () => {
  it('copies from a source character of the same realm', async () => {
    await expect(copyWishlistFromCharacter(5, 62, 7, 63, 3)).resolves.toEqual({ copied: 4 });
    expect(copy).toHaveBeenCalledWith(5, 62, 7, 63);
  });

  it('refuses a source character of another realm (SIMS-173)', async () => {
    findCharacterById.mockResolvedValueOnce({ id: 7, realmId: 9 });
    await expect(copyWishlistFromCharacter(5, 62, 7, 63, 3)).rejects.toMatchObject({
      status: 403,
    });
    expect(copy).not.toHaveBeenCalled();
  });

  it('refuses an unknown source character', async () => {
    findCharacterById.mockResolvedValueOnce(null);
    await expect(copyWishlistFromCharacter(5, 62, 7, 63, 3)).rejects.toMatchObject({
      status: 403,
    });
  });
});
