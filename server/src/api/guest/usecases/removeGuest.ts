/**
 * Retire un invité d'un événement et resynchronise l'embed Discord.
 */

import eventService from '../../event/event.service';
import { assertGuestInEvent } from '../guest.access';
import guestRepository from '../guest.repository';

/**
 * @throws {GuestNotFoundError} si l'invité n'est pas sur cet événement
 */
export async function removeGuest(guestId: number, eventId: number): Promise<void> {
  await assertGuestInEvent(guestId, eventId);
  await guestRepository.remove(guestId);

  eventService.syncRosterToDiscord(eventId).catch((err: Error) => {
    console.error('[Guest Service] Discord sync error after removal:', err.message);
  });
}
