import { characterIdParam } from '../talent.validation';

describe('talent characterIdParam', () => {
  it('coerces the character id', () => {
    expect(characterIdParam.validate({ id: '5' }).value).toEqual({ id: 5 });
  });

  it('rejects a non-numeric character id', () => {
    expect(characterIdParam.validate({ id: 'abc' }).error).toBeDefined();
  });
});
