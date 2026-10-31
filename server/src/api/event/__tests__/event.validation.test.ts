import {
  createEventSchema,
  createEventSeriesSchema,
  deleteEventSeriesQuery,
  duplicateEventSchema,
  EVENT_STATUSES,
  eventIdParam,
  listEventsQuery,
  MAX_WEEKS_AHEAD,
  seriesIdParam,
  updateEventSchema,
  updateEventSeriesSchema,
} from '../event.validation';

const validEvent = {
  realmId: 1,
  title: 'Molten Core',
  startTime: '2026-05-25T20:00:00Z',
  endTime: '2026-05-25T23:00:00Z',
};

describe('createEventSchema', () => {
  it('accepts a well-formed event', () => {
    expect(createEventSchema.validate(validEvent).error).toBeUndefined();
  });

  it('rejects an endTime before the startTime', () => {
    const { error } = createEventSchema.validate({
      ...validEvent,
      endTime: '2026-05-25T19:00:00Z',
    });
    expect(error!.message).toBe('endTime must be on or after startTime');
  });

  it('accepts a zero-length event', () => {
    const { error } = createEventSchema.validate({
      ...validEvent,
      endTime: validEvent.startTime,
    });
    expect(error).toBeUndefined();
  });

  it('keeps the historical message when realmId is missing', () => {
    const withoutRealm: Record<string, unknown> = { ...validEvent };
    delete withoutRealm.realmId;
    expect(createEventSchema.validate(withoutRealm).error!.message).toBe('realmId is required');
  });

  it('rejects an empty title', () => {
    expect(createEventSchema.validate({ ...validEvent, title: '  ' }).error).toBeDefined();
  });

  it('allows a null raidDifficultyId', () => {
    expect(
      createEventSchema.validate({ ...validEvent, raidDifficultyId: null }).error,
    ).toBeUndefined();
  });

  it('coerces the boolean flags', () => {
    const { value } = createEventSchema.validate({ ...validEvent, defaultPresent: 'true' });
    expect(value.defaultPresent).toBe(true);
  });

  it('coerces the times to Date instances', () => {
    expect(createEventSchema.validate(validEvent).value.startTime).toBeInstanceOf(Date);
  });
});

describe('updateEventSchema', () => {
  it('rejects an empty payload', () => {
    expect(updateEventSchema.validate({}).error).toBeDefined();
  });

  it('accepts a single-field update', () => {
    expect(updateEventSchema.validate({ title: 'Blackwing Lair' }).error).toBeUndefined();
  });

  it.each(EVENT_STATUSES)('accepts the %s status', (status: string) => {
    expect(updateEventSchema.validate({ status }).error).toBeUndefined();
  });

  it('rejects a status outside the enum', () => {
    expect(updateEventSchema.validate({ status: 'DONE' }).error).toBeDefined();
  });
});

describe('listEventsQuery', () => {
  it('requires realmId', () => {
    expect(listEventsQuery.validate({}).error!.message).toBe('realmId is required');
  });

  it('accepts an optional date range and status', () => {
    const { error } = listEventsQuery.validate({
      realmId: '2',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: 'SCHEDULED',
    });
    expect(error).toBeUndefined();
  });
});

describe('duplicateEventSchema', () => {
  it('accepts an empty body, every field being optional', () => {
    expect(duplicateEventSchema.validate({}).error).toBeUndefined();
  });

  it('coerces copySignups', () => {
    expect(duplicateEventSchema.validate({ copySignups: 'true' }).value.copySignups).toBe(true);
  });
});

describe('eventIdParam', () => {
  it('coerces the id', () => {
    expect(eventIdParam.validate({ id: '12' }).value.id).toBe(12);
  });

  it('rejects a non-numeric id', () => {
    expect(eventIdParam.validate({ id: 'x' }).error!.message).toBe('Event ID must be a number');
  });
});

describe('createEventSeriesSchema', () => {
  const validSeries = {
    realmId: 1,
    title: 'Manaforge - Heroic',
    startDate: '2026-10-14',
    startTime: '21:00',
    endTime: '23:30',
  };

  it('accepts a series and fills the defaults', () => {
    const { error, value } = createEventSeriesSchema.validate(validSeries);
    expect(error).toBeUndefined();
    expect(value).toMatchObject({ timezone: 'Europe/Paris', weeksAhead: 4 });
  });

  it('converts the start date to UTC midnight', () => {
    expect(createEventSeriesSchema.validate(validSeries).value.startDate).toEqual(
      new Date('2026-10-14T00:00:00Z'),
    );
  });

  it.each([
    ['startDate', '2026-02-30'],
    ['startDate', '14/10/2026'],
    ['startTime', '24:00'],
    ['endTime', '9:00'],
    ['timezone', 'Mars/Olympus'],
    ['weeksAhead', 0],
    ['weeksAhead', MAX_WEEKS_AHEAD + 1],
  ])('rejects %s = %s', (field: string, value: unknown) => {
    expect(
      createEventSeriesSchema.validate({ ...validSeries, [field]: value }).error,
    ).toBeDefined();
  });

  it('requires realmId', () => {
    const withoutRealm: Record<string, unknown> = { ...validSeries };
    delete withoutRealm.realmId;
    expect(createEventSeriesSchema.validate(withoutRealm).error!.message).toBe(
      'realmId is required',
    );
  });
});

describe('updateEventSeriesSchema', () => {
  it('requires a change besides the date', () => {
    expect(updateEventSeriesSchema.validate({ fromDate: '2026-10-21' }).error).toBeDefined();
  });

  it('requires the date from which the change applies', () => {
    expect(updateEventSeriesSchema.validate({ title: 'x' }).error).toBeDefined();
  });

  it('accepts a change from a date', () => {
    const { error, value } = updateEventSeriesSchema.validate({
      fromDate: '2026-10-21',
      startTime: '20:30',
    });
    expect(error).toBeUndefined();
    expect(value.fromDate).toEqual(new Date('2026-10-21T00:00:00Z'));
  });
});

describe('deleteEventSeriesQuery', () => {
  it('requires the realm and the date', () => {
    expect(deleteEventSeriesQuery.validate({ realmId: '1' }).error).toBeDefined();
    expect(
      deleteEventSeriesQuery.validate({ realmId: '1', fromDate: '2026-10-21' }).error,
    ).toBeUndefined();
  });
});

describe('seriesIdParam', () => {
  it('reads digits only, like checkPermission', () => {
    expect(seriesIdParam.validate({ seriesId: '12' }).value.seriesId).toBe(12);
    expect(seriesIdParam.validate({ seriesId: '1e1' }).error).toBeDefined();
  });
});
