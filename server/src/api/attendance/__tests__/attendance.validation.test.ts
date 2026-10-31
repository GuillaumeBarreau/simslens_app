import { attendanceQuery, characterIdParam } from '../attendance.validation';

describe('attendanceQuery', () => {
  it('requires realmId', () => {
    expect(attendanceQuery.validate({}).error!.message).toBe('realmId is required');
  });

  it('rejects a non-numeric realmId with the historical message', () => {
    expect(attendanceQuery.validate({ realmId: 'x' }).error!.message).toBe('realmId is required');
  });

  it.each([
    ['true', true],
    ['1', true],
    ['false', false],
    ['0', false],
  ])('maps includeOptional=%s to %s, as the controller did', (input: string, expected: boolean) => {
    expect(
      attendanceQuery.validate({ realmId: 1, includeOptional: input }).value.includeOptional,
    ).toBe(expected);
  });

  it('defaults includeOptional to false when omitted', () => {
    expect(attendanceQuery.validate({ realmId: 1 }).value.includeOptional).toBe(false);
  });

  it('leaves the date range optional, the service applying its own window', () => {
    const { error, value } = attendanceQuery.validate({ realmId: 1 });
    expect(error).toBeUndefined();
    expect(value.startDate).toBeUndefined();
    expect(value.endDate).toBeUndefined();
  });

  it('rejects an unparsable date with the historical message', () => {
    expect(attendanceQuery.validate({ realmId: 1, startDate: 'zzz' }).error!.message).toBe(
      'Invalid date',
    );
  });

  it('coerces a valid date range', () => {
    const { value } = attendanceQuery.validate({
      realmId: 1,
      startDate: '2026-01-01',
      endDate: '2026-02-01',
    });
    expect(value.startDate).toBeInstanceOf(Date);
    expect(value.endDate).toBeInstanceOf(Date);
  });
});

describe('characterIdParam', () => {
  it('coerces the character id', () => {
    expect(characterIdParam.validate({ characterId: '5' }).value.characterId).toBe(5);
  });

  it('rejects a non-numeric character id', () => {
    expect(characterIdParam.validate({ characterId: 'x' }).error!.message).toBe(
      'characterId is required',
    );
  });

  it.each(['1e1', '5.0', '-5', '0'])(
    'rejects %s, that checkPermission and Joi.number would read differently',
    (characterId: string) => {
      expect(characterIdParam.validate({ characterId }).error!.message).toBe(
        'characterId is required',
      );
    },
  );
});
