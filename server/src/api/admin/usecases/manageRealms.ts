import { prisma } from '../../../data';

export interface CreateSubscriptionInput {
  tier: number;
  type: string;
  price: number;
  expiresAt: Date;
  note?: string | null;
}

export async function listRealms() {
  return prisma.realms.findMany({
    orderBy: { guildName: 'asc' },
    include: {
      _count: { select: { characters: true } },
      subscriptions: {
        where: { status: 'active' },
        orderBy: { expiresAt: 'desc' },
        take: 1,
      },
    },
  });
}

export async function listRealmCharacters(realmId: number) {
  return prisma.characters.findMany({
    where: { realmId },
    include: { specialization: true },
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
  });
}

export async function listRealmSubscriptions(realmId: number) {
  return prisma.realm_subscriptions.findMany({
    where: { realmId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Crée l'abonnement d'un royaume et aligne son palier. Les abonnements
 * actifs précédents sont annulés dans la même transaction : un échec ne
 * laisse pas le royaume sans abonnement actif.
 */
export async function createRealmSubscription(realmId: number, input: CreateSubscriptionInput) {
  const [, subscription] = await prisma.$transaction([
    prisma.realm_subscriptions.updateMany({
      where: { realmId, status: 'active' },
      data: { status: 'cancelled' },
    }),
    prisma.realm_subscriptions.create({
      data: {
        realmId,
        tier: input.tier,
        type: input.type,
        price: input.price,
        expiresAt: input.expiresAt,
        note: input.note ?? null,
        status: 'active',
      },
    }),
    prisma.realms.update({ where: { id: realmId }, data: { tier: input.tier } }),
  ]);

  return subscription;
}
