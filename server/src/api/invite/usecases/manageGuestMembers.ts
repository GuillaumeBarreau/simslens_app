import createError from 'http-errors';

import repo from '../invite.repository';
import type { GuestCharacterRecord, GuestCharacterSummary, GuestMemberView } from '../invite.types';

export function pickGuestCharacter(
  characters: GuestCharacterRecord[],
  realmId: number,
): GuestCharacterSummary | null {
  const [best] = characters
    .filter((c) => c.realmId === realmId)
    .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
  return best ? { name: best.name, class: best.class, realm: best.realm } : null;
}

export async function listGuestMembers(realmId: number): Promise<GuestMemberView[]> {
  const guests = await repo.getGuestMembersByRealm(realmId);
  const characters = await repo.getCharactersByUserIds(
    guests.map((g) => g.userId),
    realmId,
  );
  return guests.map((guest) => ({
    ...guest,
    character: pickGuestCharacter(
      characters.filter((c) => c.userId === guest.userId),
      realmId,
    ),
  }));
}

/**
 * Retire un invité, après s'être assuré qu'il appartient bien au royaume
 * appelant. Le repository expose aussi getGuestMember(guestId), mais celui-ci
 * ne porte pas la portée royaume : l'utiliser ici ouvrirait la suppression
 * d'un invité d'une autre guilde.
 */
export async function removeGuestMember(realmId: number, guestId: number): Promise<unknown> {
  const guests = await repo.getGuestMembersByRealm(realmId);
  const guest = guests.find((g) => g.id === guestId);
  if (!guest) throw createError(404, 'Guest not found');

  // L'invité trouvé dans le royaume, jamais l'identifiant brut de la requête.
  return repo.removeGuestMember(guest.id);
}
