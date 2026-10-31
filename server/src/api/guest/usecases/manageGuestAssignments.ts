import { normalizeRole, RAID_ROLES } from '../../../shared/constants/roles';
import { assertGuestInEvent } from '../guest.access';
import { InvalidGuestRoleError } from '../guest.errors';
import guestRepository from '../guest.repository';
import type { AssignGuestInput, GuestAssignmentEntity, UnassignGuestInput } from '../guest.types';

export async function listAssignments(eventId: number): Promise<GuestAssignmentEntity[]> {
  return guestRepository.findAssignmentsByEvent(eventId);
}

export async function assignGuestToBoss(input: AssignGuestInput): Promise<GuestAssignmentEntity> {
  const normalizedRole = normalizeRole(input.role);
  if (!RAID_ROLES.includes(normalizedRole)) {
    throw new InvalidGuestRoleError(RAID_ROLES);
  }
  await assertGuestInEvent(input.guestId, input.eventId);

  return guestRepository.upsertAssignment({
    guestId: input.guestId,
    bossId: input.bossId,
    role: normalizedRole,
  });
}

export async function unassignGuestFromBoss(input: UnassignGuestInput): Promise<void> {
  await assertGuestInEvent(input.guestId, input.eventId);
  await guestRepository.removeAssignment({ guestId: input.guestId, bossId: input.bossId });
}
