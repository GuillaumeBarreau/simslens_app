import {
  approveDeviceCodeSchema,
  exchangeDeviceCodeSchema,
  requestDeviceCodeSchema,
  userCodeParam,
} from '../device_auth.validation';

describe('exchangeDeviceCodeSchema', () => {
  it.each([{}, { deviceCode: '' }, { deviceCode: '   ' }])(
    'keeps the device_code_required code for %j',
    (payload: Record<string, unknown>) => {
      expect(exchangeDeviceCodeSchema.validate(payload).error!.message).toBe(
        'device_code_required',
      );
    },
  );

  it('accepts a device code', () => {
    expect(exchangeDeviceCodeSchema.validate({ deviceCode: 'abc123' }).error).toBeUndefined();
  });
});

describe('approveDeviceCodeSchema', () => {
  it('defaults realmIds to an empty list, as the controller did', () => {
    expect(approveDeviceCodeSchema.validate({ userCode: 'ABCD' }).value.realmIds).toEqual([]);
  });

  it('coerces the realm ids', () => {
    expect(
      approveDeviceCodeSchema.validate({ userCode: 'ABCD', realmIds: ['1', '2'] }).value.realmIds,
    ).toEqual([1, 2]);
  });

  it('requires a user code', () => {
    expect(approveDeviceCodeSchema.validate({ realmIds: [1] }).error).toBeDefined();
  });

  it('rejects a non-numeric realm id', () => {
    expect(
      approveDeviceCodeSchema.validate({ userCode: 'ABCD', realmIds: ['x'] }).error,
    ).toBeDefined();
  });
});

describe('requestDeviceCodeSchema', () => {
  it('accepts an empty body, the device name being optional', () => {
    expect(requestDeviceCodeSchema.validate({}).error).toBeUndefined();
  });

  it('accepts a device name', () => {
    expect(requestDeviceCodeSchema.validate({ deviceName: 'Mon PC' }).error).toBeUndefined();
  });
});

describe('userCodeParam', () => {
  it('requires the user code', () => {
    expect(userCodeParam.validate({}).error).toBeDefined();
  });

  it('trims the user code', () => {
    expect(userCodeParam.validate({ userCode: ' ABCD ' }).value.userCode).toBe('ABCD');
  });
});
