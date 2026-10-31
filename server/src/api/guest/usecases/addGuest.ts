/**
 * Ajoute un invité ponctuel à un événement, puis déclenche la
 * resynchronisation de l'embed Discord sans bloquer la réponse.
 */

import { normalizeRole, RAID_ROLES } from '../../../shared/constants/roles';
import eventRepository from '../../event/event.repository';
import eventService from '../../event/event.service';
import {
  GuestEventNotFoundError,
  GuestNameRequiredError,
  InvalidGuestRoleError,
} from '../guest.errors';
import guestRepository from '../guest.repository';
import type { AddGuestInput, GuestEntity } from '../guest.types';

export async function addGuest(input: AddGuestInput): Promise<GuestEntity> {
  const normalizedRole = normalizeRole(input.role);
  if (!RAID_ROLES.includes(normalizedRole)) {
    throw new InvalidGuestRoleError(RAID_ROLES);
  }

  if (!input.name || !input.name.trim()) {
    throw new GuestNameRequiredError();
  }

  // event.repository n'est pas encore migré : sa JSDoc annonce `Object`.
  // On ne dépend ici que du royaume de l'événement.
  const event = (await eventRepository.findById(input.eventId)) as { realmId: number } | null;
  if (!event) {
    throw new GuestEventNotFoundError();
  }

  const guest: GuestEntity = await guestRepository.create({
    eventId: input.eventId,
    realmId: input.realmId || event.realmId,
    name: input.name.trim(),
    role: normalizedRole,
    class: input.class || null,
    addedBy: input.addedBy,
  });

  eventService.syncRosterToDiscord(input.eventId).catch((err: Error) => {
    console.error('[Guest Service] Discord sync error:', err.message);
  });

  return guest;
}
