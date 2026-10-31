import { bulkVerifyQuery, characterIdParam } from '../enchantments.validation';

describe('characterIdParam', () => {
  it('coerces the character id', () => {
    expect(characterIdParam.validate({ characterId: '12' }).value.characterId).toBe(12);
  });

  it.each(['abc', '0', '-4'])('keeps the historical message for %s', (characterId: string) => {
    expect(characterIdParam.validate({ characterId }).error!.message).toBe('Invalid characterId');
  });
});

describe('bulkVerifyQuery', () => {
  it('requires ids with the historical message', () => {
    expect(bulkVerifyQuery.validate({}).error!.message).toBe('Missing ids query parameter');
  });

  it.each(['1', '1,2,3', '1, 2 , 3'])('accepts the id list %s', (ids: string) => {
    expect(bulkVerifyQuery.validate({ ids }).error).toBeUndefined();
  });

  it.each(['abc', '1,,2', '1,abc', ''])('rejects the malformed list %j', (ids: string) => {
    expect(bulkVerifyQuery.validate({ ids }).error).toBeDefined();
  });

  it('keeps the historical message for a fully invalid list', () => {
    expect(bulkVerifyQuery.validate({ ids: 'abc' }).error!.message).toBe('No valid ids provided');
  });

  it('converts the list into ids', () => {
    expect(bulkVerifyQuery.validate({ ids: '1, 2 ,30' }).value.ids).toEqual([1, 2, 30]);
  });
});
