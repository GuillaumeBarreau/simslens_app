/**
 * Enrichit l'utilisateur de session de ses personnages et des royaumes
 * qu'il a rejoints en tant qu'invité.
 */

import characterRepository from '../../character/character.repository';
import inviteRepository from '../../invite/invite.repository';
import { serializeBigInt } from '../auth.serialization';
import type { SessionUser, UserProfile } from '../auth.types';

export async function getUserProfile(user: SessionUser | null): Promise<UserProfile | null> {
  if (!user?.id) return null;

  try {
    const characters = await characterRepository.listCharactersByUserId(user.id);
    const guestMemberships = await inviteRepository.getGuestMembershipsByUserId(user.id);

    return serializeBigInt({
      ...user,
      linkedCharacters: characters,
      // Toujours null : la colonne isMain sur laquelle reposait ce calcul
      // n'existe pas dans le schéma. Le champ est conservé parce qu'il fait
      // partie de la réponse publique — voir la dette technique n°21.
      mainCharacter: null,
      guestRealms: guestMemberships.map((m) => {
        const membership = m as unknown as {
          realm: { id: number; guildName: string; server: string; region: string };
          joinedAt: Date;
        };

        return {
          id: membership.realm.id,
          guildName: membership.realm.guildName,
          server: membership.realm.server,
          region: membership.realm.region,
          joinedAt: membership.joinedAt,
        };
      }),
    }) as UserProfile;
  } catch (err) {
    // Le profil enrichi est un confort : un échec de lecture renvoie
    // l'utilisateur de session plutôt que de casser l'authentification.
    console.error(`Error fetching profile for user ${user.id}:`, err);

    return serializeBigInt(user) as UserProfile;
  }
}
