import {
  createAvailabilitySchema,
  updateAvailabilitySchema,
} from '../dungeon_availability.validation';

const validPayload = {
  realmId: 1,
  date: '2026-05-01',
  startTime: '20:00',
  endTime: '23:00',
  type: 'M+',
  roles: ['TANK', 'DPS'],
};

describe('createAvailabilitySchema', () => {
  it('accepts a payload sent by the client', () => {
    expect(createAvailabilitySchema.validate(validPayload).error).toBeUndefined();
  });

  it('serialises a roles array into the stored JSON string', () => {
    expect(createAvailabilitySchema.validate(validPayload).value.roles).toBe('["TANK","DPS"]');
  });

  it('keeps roles already serialised as they are', () => {
    const roles = '["TANK","HEALER"]';
    expect(createAvailabilitySchema.validate({ ...validPayload, roles }).value.roles).toBe(roles);
  });

  it('accepts roles already serialised as a JSON string', () => {
    const { error } = createAvailabilitySchema.validate({
      ...validPayload,
      roles: '["TANK","HEALER"]',
    });
    expect(error).toBeUndefined();
  });

  it.each(['24:00', '9:30', '20h00', '20:60'])(
    'rejects the malformed time %s',
    (startTime: string) => {
      const { error } = createAvailabilitySchema.validate({ ...validPayload, startTime });
      expect(error!.message).toBe('Time must use the HH:MM format');
    },
  );

  it.each(['00:00', '09:30', '23:59'])('accepts the well-formed time %s', (startTime: string) => {
    expect(createAvailabilitySchema.validate({ ...validPayload, startTime }).error).toBeUndefined();
  });

  it('rejects a dungeon type outside M0 / M+', () => {
    expect(createAvailabilitySchema.validate({ ...validPayload, type: 'M2' }).error).toBeDefined();
  });

  it('rejects a raid-only role', () => {
    const { error } = createAvailabilitySchema.validate({ ...validPayload, roles: ['MELEE'] });
    expect(error).toBeDefined();
  });

  it('rejects an empty roles array', () => {
    expect(createAvailabilitySchema.validate({ ...validPayload, roles: [] }).error).toBeDefined();
  });

  it('coerces the date to a Date instance', () => {
    expect(createAvailabilitySchema.validate(validPayload).value.date).toBeInstanceOf(Date);
  });

  it.each(['realmId', 'date', 'startTime', 'endTime', 'type', 'roles'])(
    'requires %s',
    (field: string) => {
      const payload: Record<string, unknown> = { ...validPayload };
      delete payload[field];
      expect(createAvailabilitySchema.validate(payload).error).toBeDefined();
    },
  );
});

describe('updateAvailabilitySchema', () => {
  it('rejects an empty payload', () => {
    expect(updateAvailabilitySchema.validate({}).error).toBeDefined();
  });

  it('accepts a single-field update', () => {
    expect(updateAvailabilitySchema.validate({ note: 'dispo tard' }).error).toBeUndefined();
  });

  it('still enforces the time format on a partial update', () => {
    expect(updateAvailabilitySchema.validate({ endTime: '99:00' }).error).toBeDefined();
  });
});

describe('updateAvailabilitySchema roles', () => {
  it('serialises a roles array on update too', () => {
    expect(updateAvailabilitySchema.validate({ roles: ['TANK', 'DPS'] }).value.roles).toBe(
      '["TANK","DPS"]',
    );
  });

  it('does not add roles when they are not updated', () => {
    expect(updateAvailabilitySchema.validate({ note: 'a' }).value).not.toHaveProperty('roles');
  });
});
