import {
  absenceIdParam,
  createAbsenceSchema,
  listAbsencesQuery,
  realmScopeQuery,
  updateAbsenceSchema,
} from '../absence.validation';

describe('absenceIdParam', () => {
  it('coerces a numeric string id', () => {
    const { error, value } = absenceIdParam.validate({ id: '12' });
    expect(error).toBeUndefined();
    expect(value.id).toBe(12);
  });

  it('rejects a non-numeric id', () => {
    expect(absenceIdParam.validate({ id: 'abc' }).error).toBeDefined();
  });

  it('rejects a negative id', () => {
    expect(absenceIdParam.validate({ id: '-3' }).error).toBeDefined();
  });
});

describe('realmScopeQuery', () => {
  it('requires realmId', () => {
    expect(realmScopeQuery.validate({}).error!.message).toBe('realmId is required');
  });

  it('coerces realmId to a number', () => {
    expect(realmScopeQuery.validate({ realmId: '7' }).value.realmId).toBe(7);
  });
});

describe('listAbsencesQuery', () => {
  it('accepts an optional date range', () => {
    const { error, value } = listAbsencesQuery.validate({
      realmId: '7',
      startDate: '2026-04-01',
      endDate: '2026-04-30',
    });
    expect(error).toBeUndefined();
    expect(value.startDate).toBeInstanceOf(Date);
  });

  it('rejects an unparsable date', () => {
    expect(listAbsencesQuery.validate({ realmId: 7, startDate: 'not-a-date' }).error).toBeDefined();
  });
});

describe('createAbsenceSchema', () => {
  it('accepts a well-formed payload', () => {
    const { error } = createAbsenceSchema.validate({
      realmId: 1,
      startDate: '2026-04-01',
      endDate: '2026-04-03',
    });
    expect(error).toBeUndefined();
  });

  it('rejects an endDate before the startDate', () => {
    const { error } = createAbsenceSchema.validate({
      realmId: 1,
      startDate: '2026-04-05',
      endDate: '2026-04-03',
    });
    expect(error!.message).toBe('endDate must be on or after startDate');
  });

  it('accepts an absence spanning a single day', () => {
    const { error } = createAbsenceSchema.validate({
      realmId: 1,
      startDate: '2026-04-05',
      endDate: '2026-04-05',
    });
    expect(error).toBeUndefined();
  });

  it('requires realmId', () => {
    const { error } = createAbsenceSchema.validate({
      startDate: '2026-04-01',
      endDate: '2026-04-03',
    });
    expect(error!.message).toBe('realmId is required');
  });

  it('allows a null reason', () => {
    const { error } = createAbsenceSchema.validate({
      realmId: 1,
      startDate: '2026-04-01',
      endDate: '2026-04-03',
      reason: null,
    });
    expect(error).toBeUndefined();
  });
});

describe('updateAbsenceSchema', () => {
  it('rejects an empty payload', () => {
    expect(updateAbsenceSchema.validate({}).error).toBeDefined();
  });

  it('accepts a partial update', () => {
    expect(updateAbsenceSchema.validate({ reason: 'Vacances' }).error).toBeUndefined();
  });
});
