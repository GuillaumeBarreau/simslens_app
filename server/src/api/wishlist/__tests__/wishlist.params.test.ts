import {
  availableItemsParams,
  characterIdParam,
  copyFromCharacterParams,
  wishlistItemParams,
} from '../wishlist.validation';

describe('wishlist route params', () => {
  it('coerces the character id', () => {
    expect(characterIdParam.validate({ id: '12' }).value).toEqual({ id: 12 });
  });

  it.each(['abc', '0', '-3'])('rejects the character id %j', (id: string) => {
    expect(characterIdParam.validate({ id }).error).toBeDefined();
  });

  it('keeps the slot as a string next to the character id', () => {
    expect(wishlistItemParams.validate({ id: '12', slot: 'HEAD' }).value).toEqual({
      id: 12,
      slot: 'HEAD',
    });
  });

  it('coerces both ids of a copy', () => {
    expect(copyFromCharacterParams.validate({ id: '12', sourceId: '7' }).value).toEqual({
      id: 12,
      sourceId: 7,
    });
  });

  it('requires the source character of a copy', () => {
    expect(copyFromCharacterParams.validate({ id: '12' }).error).toBeDefined();
  });

  it('requires extension, season and slot for available items', () => {
    expect(
      availableItemsParams.validate({ extension: 'tww', season: '3', slot: 'HEAD' }).error,
    ).toBeUndefined();
    expect(availableItemsParams.validate({ extension: 'tww', season: '3' }).error).toBeDefined();
  });
});
