import eventRepository from '../../event/event.repository';
import eventService from '../../event/event.service';
import { resolveActingRole, type SignupActor } from '../signup.actingRole';
import { EventNotAccessibleError } from '../signup.errors';
import { assertSignupNotLocked } from '../signup.lock';
import signupRepository from '../signup.repository';
import type { SignupEntity } from '../signup.types';

export async function deleteSignup(
  eventId: number,
  characterId: number,
  realmId: number,
  actor: SignupActor,
): Promise<SignupEntity> {
  const actingRole = await resolveActingRole(actor, realmId);

  const hasAccess = await eventRepository.belongsToRealm(eventId, realmId);
  if (!hasAccess) {
    throw new EventNotAccessibleError();
  }

  await assertSignupNotLocked(eventId, actingRole);

  const result = await signupRepository.remove(eventId, characterId);

  eventService
    .syncRosterToDiscord(eventId)
    .catch((err: Error) =>
      console.error('[Signup Service] Failed to sync roster to Discord after delete:', err.message),
    );

  return result;
}
