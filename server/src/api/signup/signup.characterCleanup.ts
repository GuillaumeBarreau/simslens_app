/**
 * Unicité de l'inscription par membre.
 *
 * Un membre ne s'inscrit qu'avec un personnage par événement : dès qu'il en
 * choisit un, les inscriptions de ses autres personnages sont retirées.
 *
 * L'opération est accessoire — son échec ne doit pas faire échouer
 * l'inscription elle-même.
 */

import { prisma } from '../../data';
import signupRepository from './signup.repository';

export async function cleanupOtherCharacterSignups(
  userId: string,
  realmId: number,
  eventId: number,
  excludeCharacterId: number,
): Promise<void> {
  try {
    const userCharacters = await prisma.characters.findMany({
      where: {
        userId: String(userId),
        realmId,
        archived: 0,
        NOT: { id: excludeCharacterId },
      },
      select: { id: true, name: true },
    });

    console.log(
      `[Signup Service] Cleaning up signups for ${userCharacters.length} other characters of user ${userId}`,
    );

    for (const char of userCharacters) {
      try {
        const existingSignup = await signupRepository.findByEventAndCharacter(eventId, char.id);
        if (existingSignup) {
          await signupRepository.remove(eventId, char.id);
          console.log(
            `[Signup Service] Removed signup for ${char.name} (was ${existingSignup.status})`,
          );
        }
      } catch {
        // L'inscription peut ne pas exister : ce n'est pas une erreur.
      }
    }
  } catch (error) {
    console.error('[Signup Service] Error cleaning up other signups:', (error as Error).message);
    // Opération non critique : on ne relance pas.
  }
}
