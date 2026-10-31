import { createRealmSubscription } from '../usecases/manageRealms';

const updateMany = vi.fn();
const create = vi.fn();
const updateRealm = vi.fn();
const transaction = vi.fn();

vi.mock('../../../data', () => ({
  prisma: {
    realm_subscriptions: {
      updateMany: (...a: unknown[]) => updateMany(...a),
      create: (...a: unknown[]) => create(...a),
    },
    realms: { update: (...a: unknown[]) => updateRealm(...a) },
    $transaction: (...a: unknown[]) => transaction(...a),
  },
}));

const INPUT = { tier: 3, type: 'monthly', price: 9.99, expiresAt: new Date('2027-01-01') };

beforeEach(() => {
  // Chaque opération renvoie un marqueur : on vérifie l'ordre passé à $transaction.
  updateMany.mockReset().mockReturnValue('cancel-active');
  create.mockReset().mockReturnValue('create-subscription');
  updateRealm.mockReset().mockReturnValue('update-tier');
  transaction
    .mockReset()
    .mockResolvedValue([{ count: 1 }, { id: 10, tier: 3 }, { id: 4, tier: 3 }]);
});

describe('createRealmSubscription', () => {
  it('cancels the active subscriptions, creates the new one and aligns the tier in one transaction', async () => {
    await createRealmSubscription(4, INPUT);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(transaction).toHaveBeenCalledWith([
      'cancel-active',
      'create-subscription',
      'update-tier',
    ]);
    expect(updateMany).toHaveBeenCalledWith({
      where: { realmId: 4, status: 'active' },
      data: { status: 'cancelled' },
    });
    expect(updateRealm).toHaveBeenCalledWith({ where: { id: 4 }, data: { tier: 3 } });
  });

  it('creates an active subscription from the input, with a null note by default', async () => {
    await createRealmSubscription(4, INPUT);
    expect(create).toHaveBeenCalledWith({
      data: { realmId: 4, ...INPUT, note: null, status: 'active' },
    });
  });

  it('returns the created subscription, not the cancellation count', async () => {
    await expect(createRealmSubscription(4, INPUT)).resolves.toEqual({ id: 10, tier: 3 });
  });
});
