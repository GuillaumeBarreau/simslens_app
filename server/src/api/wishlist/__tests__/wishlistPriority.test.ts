// Échelle de priorité des vœux (SIMS-205).

import {
  isWantedPriority,
  wantedWishWhere,
  WISHLIST_PRIORITY,
} from '../../../shared/constants/wishlistPriority';
import {
  updateWishlistItemSchema,
  wishlistAlternativesQuery,
  wishlistSlotParams,
  wishlistStatusQuery,
} from '../wishlist.validation';

describe('wishlistSlotParams', () => {
  it('accepts a known slot', () => {
    expect(wishlistSlotParams.validate({ id: '12', slot: 'head' }).value).toEqual({
      id: 12,
      slot: 'head',
    });
  });

  it.each(['HEAD', 'tabard', ''])('refuses the slot %j', (slot) => {
    expect(wishlistSlotParams.validate({ id: '12', slot }).error).toBeDefined();
  });
});

describe('wishlist insights queries — bounds', () => {
  it('refuses an oversized difficulty, extension or season', () => {
    const long = 'x'.repeat(100);
    const query = { specializationId: 262, difficulty: 'heroic', extension: 'tww', season: '3' };
    expect(wishlistAlternativesQuery.validate({ ...query, difficulty: long }).error).toBeDefined();
    expect(wishlistAlternativesQuery.validate({ ...query, extension: long }).error).toBeDefined();
    expect(wishlistAlternativesQuery.validate({ ...query, season: long }).error).toBeDefined();
  });
});

describe('isWantedPriority', () => {
  it.each([0, 1, 2, 3, 4, null, undefined])('counts priority %j as a wish', (priority) => {
    expect(isWantedPriority(priority)).toBe(true);
  });

  it('does not count « not wanted » as a wish', () => {
    expect(isWantedPriority(WISHLIST_PRIORITY.NOT_WANTED)).toBe(false);
  });
});

describe('wantedWishWhere', () => {
  it('keeps the NULL priorities that a plain `not` would drop in SQL', () => {
    expect(wantedWishWhere()).toEqual({
      OR: [{ priority: null }, { priority: { not: 5 } }],
    });
  });
});

describe('updateWishlistItemSchema — priority', () => {
  const body = { itemId: 10, specializationId: 262 };

  it.each([0, 1, 2, 3, 4, 5])('accepts priority %j', (priority) => {
    expect(updateWishlistItemSchema.validate({ ...body, priority }).error).toBeUndefined();
  });

  it.each([-1, 6, 10, 2.5])('refuses priority %j', (priority) => {
    expect(updateWishlistItemSchema.validate({ ...body, priority }).error).toBeDefined();
  });
});

describe('wishlist insights queries', () => {
  it('requires the spec and the difficulty for the status', () => {
    expect(
      wishlistStatusQuery.validate({ specializationId: '262', difficulty: 'heroic' }).value,
    ).toEqual({ specializationId: 262, difficulty: 'heroic' });
    expect(wishlistStatusQuery.validate({ specializationId: 262 }).error).toBeDefined();
  });

  it('requires extension and season for the alternatives', () => {
    const query = { specializationId: 262, difficulty: 'heroic' };
    expect(wishlistAlternativesQuery.validate(query).error).toBeDefined();
    expect(
      wishlistAlternativesQuery.validate({ ...query, extension: 'tww', season: '3' }).error,
    ).toBeUndefined();
  });
});
