/**
 * Guildes de l'utilisateur connecté, tous jeux confondus (SIMS-062) : celles dont
 * il est responsable (`realm_owners`), celles où il a un personnage actif, et
 * celles où il est invité. Sert au sélecteur Retail / Forever.
 */

import inviteRepo from '../../invite/invite.repository';
import realmRepo from '../realm.repository';
import type { MyRealm, RealmEntity } from '../realm.types';

/** Du plus au moins élevé : une guilde vue par plusieurs chemins garde le plus haut. */
const ROLE_RANK = ['owner', 'admin', 'moderator', 'member', 'guest'] as const;
type MyRealmRole = (typeof ROLE_RANK)[number];

function summarize(realm: RealmEntity, role: MyRealmRole): MyRealm {
  return {
    id: realm.id,
    guildName: realm.guildName,
    server: realm.server,
    region: realm.region,
    game: realm.game,
    role,
  };
}

/** Garde, pour chaque guilde, le rôle le plus élevé ; ordre : jeu, puis nom. */
export function mergeMyRealms(entries: { realm: RealmEntity; role: MyRealmRole }[]): MyRealm[] {
  const byId = new Map<number, MyRealm>();
  for (const { realm, role } of entries) {
    const known = byId.get(realm.id);
    if (!known || ROLE_RANK.indexOf(role) < ROLE_RANK.indexOf(known.role as MyRealmRole)) {
      byId.set(realm.id, summarize(realm, role));
    }
  }
  return [...byId.values()].sort(
    (a, b) => a.game.localeCompare(b.game) || a.guildName.localeCompare(b.guildName),
  );
}

export async function listMyRealms(userId: string): Promise<MyRealm[]> {
  const [owned, memberRealms, guestRows] = await Promise.all([
    realmRepo.findOwnershipsByUserId(userId),
    realmRepo.findRealmsByMemberUserId(userId),
    inviteRepo.getGuestMembershipsByUserId(userId),
  ]);
  // Le repository inclut la guilde (`include: { realm: true }`), que son contrat
  // TypeScript (GuestMemberEntity) ne déclare pas.
  const guests = guestRows as unknown as { realm: RealmEntity }[];

  return mergeMyRealms([
    ...owned.map((o) => ({ realm: o.realm, role: o.role as MyRealmRole })),
    ...memberRealms.map((realm) => ({ realm, role: 'member' as const })),
    ...guests.map((g) => ({ realm: g.realm, role: 'guest' as const })),
  ]);
}
