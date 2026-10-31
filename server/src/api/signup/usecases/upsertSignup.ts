/**
 * Inscrit ou met à jour un personnage sur un événement, puis propage :
 * unicité du personnage inscrit, levée d'absence, journal d'activité et
 * resynchronisation de l'embed Discord.
 */

import { prisma } from '../../../data';
import { roleFromSpec } from '../../../shared/constants/roles';
import * as absenceUsecases from '../../absence/usecases';
import { logEventSignup } from '../../activity_log/activity_log.utils';
import eventRepository from '../../event/event.repository';
import eventService from '../../event/event.service';
import { resolveActingRole, type SignupActor } from '../signup.actingRole';
import { cleanupOtherCharacterSignups } from '../signup.characterCleanup';
import { EventNotAccessibleError, SignupCharacterNotFoundError } from '../signup.errors';
import { assertSignupNotLocked } from '../signup.lock';
import signupRepository from '../signup.repository';
import type { SignupEntity, UpsertSignupInput } from '../signup.types';

export async function upsertSignup(
  input: UpsertSignupInput,
  realmId: number,
  actor: SignupActor,
): Promise<SignupEntity> {
  const character = await signupRepository.findSignupCharacter(input.characterId);
  if (!character) {
    throw new SignupCharacterNotFoundError();
  }

  const actingRole = await resolveActingRole(actor, realmId);

  const hasAccess = await eventRepository.belongsToRealm(input.eventId, realmId);
  if (!hasAccess) {
    throw new EventNotAccessibleError();
  }

  await assertSignupNotLocked(input.eventId, actingRole);

  const data: UpsertSignupInput = {
    ...input,
    // Le rôle est déduit de la spécialisation quand le client ne l'impose pas.
    role: input.role || roleFromSpec(character.specialization?.name),
    // Ces deux champs n'ont de sens que pour leur statut respectif.
    lateTime: input.status === 'LATE' ? input.lateTime : null,
    absenceReason: input.status === 'ABSENT' ? input.absenceReason : null,
  };

  const [oldSignup, event] = await Promise.all([
    signupRepository.findByEventAndCharacter(data.eventId, data.characterId),
    prisma.raid_events.findFirst({ where: { id: data.eventId }, select: { startTime: true } }),
  ]);

  console.log(
    `[Signup Service] Upserting signup for event ${data.eventId}, character ${data.characterId}...`,
  );
  const signup = await signupRepository.upsert(data);
  console.log(`[Signup Service] Signup successful: ${signup.id}`);

  if (character.userId && realmId) {
    logEventSignup({
      realmId,
      userId: character.userId,
      characterName: character.name ?? `character#${data.characterId}`,
      eventId: data.eventId,
      eventDate: event?.startTime?.toISOString() ?? null,
      status: data.status,
      oldStatus: oldSignup?.status ?? null,
      role: signup.role,
    });
  }

  if (character.userId) {
    await cleanupOtherCharacterSignups(character.userId, realmId, data.eventId, data.characterId);
  }

  if (data.status && data.status !== 'ABSENT') {
    try {
      await absenceUsecases.handleSignupStatusChange(signup, data.status);
    } catch (error) {
      // La levée d'absence ne doit pas faire échouer l'inscription.
      console.error('[Signup Service] Error handling absence sync:', (error as Error).message);
    }
  }

  syncRosterToDiscord(data.eventId);

  return signup;
}

/**
 * Resynchronise l'embed Discord sans bloquer la réponse.
 *
 * La garde sur syncRosterToDiscord couvre un cas de dépendance circulaire
 * entre signup et event, où la fonction peut ne pas être encore définie.
 */
function syncRosterToDiscord(eventId: number): void {
  console.log(`[Signup Service] Triggering Discord roster sync for event ${eventId}...`);
  try {
    if (eventService.syncRosterToDiscord) {
      eventService
        .syncRosterToDiscord(eventId)
        .catch((err: Error) =>
          console.error('[Signup Service] Failed to sync roster to Discord:', err.message),
        );
    } else {
      console.warn(
        '[Signup Service] eventService.syncRosterToDiscord is undefined (circular dependency?)',
      );
    }
  } catch (error) {
    console.error(
      '[Signup Service] Synchronous error calling syncRosterToDiscord:',
      (error as Error).message,
    );
  }
}
