import { NoGearSnapshotError } from '../enchantments.errors';
import { getCharacterEnchantmentReport } from '../usecases/getCharacterEnchantmentReport';

const verifyCharacterEnchantments = vi.fn();
const verifyCharacterGems = vi.fn();

vi.mock('../usecases/verifyCharacterEnchantments', () => ({
  verifyCharacterEnchantments: (...a: unknown[]) => verifyCharacterEnchantments(...a),
  verifyCharacterGems: (...a: unknown[]) => verifyCharacterGems(...a),
}));

const ENCHANT = { slot: 'CHEST', isValid: true };
const GEM = { slot: 'NECK', isValid: true };

beforeEach(() => {
  verifyCharacterEnchantments.mockReset().mockResolvedValue([ENCHANT]);
  verifyCharacterGems.mockReset().mockResolvedValue({ slots: [GEM], hasEpicGem: true });
});

describe('getCharacterEnchantmentReport', () => {
  it('merges enchantments and gems of the latest snapshot', async () => {
    await expect(getCharacterEnchantmentReport(7)).resolves.toEqual({
      characterId: 7,
      results: [ENCHANT],
      gems: [GEM],
      hasEpicGem: true,
    });
    expect(verifyCharacterEnchantments).toHaveBeenCalledWith(7);
    expect(verifyCharacterGems).toHaveBeenCalledWith(7);
  });

  it('raises a typed 404 without any gear snapshot', async () => {
    verifyCharacterEnchantments.mockResolvedValueOnce(null);
    verifyCharacterGems.mockResolvedValueOnce(null);
    const error = await getCharacterEnchantmentReport(7).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NoGearSnapshotError);
    expect(error).toMatchObject({
      statusCode: 404,
      code: 'not_found',
      message: 'No gear snapshot found for this character',
    });
  });

  it('reports no gems when the gem check finds nothing', async () => {
    verifyCharacterGems.mockResolvedValueOnce(null);
    await expect(getCharacterEnchantmentReport(7)).resolves.toMatchObject({
      gems: [],
      hasEpicGem: false,
    });
  });
});
