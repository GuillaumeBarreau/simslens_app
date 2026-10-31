import { findEmptyReferenceTables, warnIfReferenceDataMissing } from '../referenceDataCheck';

const countClasses = vi.fn();
const countSpecializations = vi.fn();

vi.mock('../../../data', () => ({
  prisma: {
    classes: { count: (...a: unknown[]) => countClasses(...a) },
    specializations: { count: (...a: unknown[]) => countSpecializations(...a) },
  },
}));

const log = { warn: vi.fn() };

beforeEach(() => {
  log.warn.mockReset();
  countClasses.mockReset().mockResolvedValue(13);
  countSpecializations.mockReset().mockResolvedValue(39);
});

describe('findEmptyReferenceTables', () => {
  it('lists only the empty tables', () => {
    expect(findEmptyReferenceTables({ classes: 13, specializations: 39 })).toEqual([]);
    expect(findEmptyReferenceTables({ classes: 13, specializations: 0 })).toEqual([
      'specializations',
    ]);
    expect(findEmptyReferenceTables({ classes: 0, specializations: 0 })).toEqual([
      'classes',
      'specializations',
    ]);
  });
});

describe('warnIfReferenceDataMissing', () => {
  it('stays silent when the reference data is seeded', async () => {
    await expect(warnIfReferenceDataMissing(log)).resolves.toEqual([]);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('warns when specializations has not been seeded', async () => {
    countSpecializations.mockResolvedValueOnce(0);
    await expect(warnIfReferenceDataMissing(log)).resolves.toEqual(['specializations']);
    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn.mock.calls[0][0]).toContain('specializations');
    expect(log.warn.mock.calls[0][0]).toContain('npm run server:init-data');
  });

  it('never throws when the database cannot be queried', async () => {
    countClasses.mockRejectedValueOnce(new Error('db down'));
    await expect(warnIfReferenceDataMissing(log)).resolves.toEqual([]);
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('impossible'), 'db down');
  });
});
