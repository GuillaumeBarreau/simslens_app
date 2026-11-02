import { listRegionsQuery } from '../region.validation';

describe('listRegionsQuery', () => {
  it('defaults to Retail, as before Forever', () => {
    expect(listRegionsQuery.validate({}).value).toEqual({ game: 'retail' });
  });

  it('accepts forever', () => {
    expect(listRegionsQuery.validate({ game: 'forever' }).error).toBeUndefined();
  });

  it('rejects an unknown game', () => {
    expect(listRegionsQuery.validate({ game: 'classic' }).error).toBeDefined();
  });
});
