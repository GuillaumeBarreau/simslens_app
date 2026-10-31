const {
  SUBSCRIPTION_TIERS,
  SUBSCRIPTION_TYPES,
  createSubscriptionSchema,
  realmIdParam,
} = require('../admin.validation');

const validSubscription = { tier: 2, type: 'monthly', price: 10, expiresAt: '2027-01-01' };

describe('realmIdParam', () => {
  it('coerces the realm id', () => {
    expect(realmIdParam.validate({ id: '3' }).value.id).toBe(3);
  });

  it.each(['x', '0', '-1'])('keeps the historical message for %s', (id) => {
    expect(realmIdParam.validate({ id }).error.message).toBe('Invalid realm id');
  });
});

describe('createSubscriptionSchema', () => {
  it('accepts a well-formed subscription', () => {
    expect(createSubscriptionSchema.validate(validSubscription).error).toBeUndefined();
  });

  it.each(SUBSCRIPTION_TIERS)('accepts tier %s', (tier) => {
    expect(createSubscriptionSchema.validate({ ...validSubscription, tier }).error).toBeUndefined();
  });

  it.each([0, 6, 9])('rejects tier %s with the historical message', (tier) => {
    expect(createSubscriptionSchema.validate({ ...validSubscription, tier }).error.message).toBe(
      'tier must be between 1 and 5',
    );
  });

  it.each(SUBSCRIPTION_TYPES)('accepts the %s period', (type) => {
    expect(createSubscriptionSchema.validate({ ...validSubscription, type }).error).toBeUndefined();
  });

  it('rejects an unknown period with the historical message', () => {
    expect(
      createSubscriptionSchema.validate({ ...validSubscription, type: 'weekly' }).error.message,
    ).toBe('type must be monthly or annual');
  });

  it.each(['tier', 'type', 'price', 'expiresAt'])(
    'keeps the historical message without %s',
    (f) => {
      const payload = { ...validSubscription };
      delete payload[f];
      expect(createSubscriptionSchema.validate(payload).error.message).toBe(
        'tier, type, price and expiresAt are required',
      );
    },
  );

  it('accepts a zero price, as the previous null check did', () => {
    expect(
      createSubscriptionSchema.validate({ ...validSubscription, price: 0 }).error,
    ).toBeUndefined();
  });

  it('rejects a negative price', () => {
    expect(
      createSubscriptionSchema.validate({ ...validSubscription, price: -1 }).error,
    ).toBeDefined();
  });
});
