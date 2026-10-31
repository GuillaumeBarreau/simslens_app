import { GuestNotFoundError } from './guest.errors';
import guestRepository from './guest.repository';

/**
 * Rattache un invité à l'événement de la route, dont checkPermission a vérifié
 * le royaume. Sans ce contrôle, un officier atteindrait l'invité d'un autre
 * événement, d'une autre guilde, par son seul identifiant (SIMS-162).
 *
 * @throws {GuestNotFoundError} si l'invité n'est pas sur cet événement
 */
export async function assertGuestInEvent(guestId: number, eventId: number): Promise<void> {
  if (!(await guestRepository.belongsToEvent(guestId, eventId))) {
    throw new GuestNotFoundError();
  }
}
