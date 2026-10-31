import eventRepository from '../../event/event.repository';
import { EventNotAccessibleError } from '../signup.errors';
import signupRepository from '../signup.repository';
import type { RosterByRole } from '../signup.types';

export async function getEventRoster(eventId: number, realmId: number): Promise<RosterByRole> {
  const hasAccess = await eventRepository.belongsToRealm(eventId, realmId);
  if (!hasAccess) {
    throw new EventNotAccessibleError();
  }

  return signupRepository.getRosterGroupedByRole(eventId);
}
