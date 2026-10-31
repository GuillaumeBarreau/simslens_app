import type { raid_guest_assignments, raid_guests } from '@prisma/client';

export type GuestEntity = raid_guests;
export type GuestAssignmentEntity = raid_guest_assignments;

export interface AddGuestInput {
  eventId: GuestEntity['eventId'];
  name: GuestEntity['name'];
  role: string;
  realmId?: GuestEntity['realmId'];
  class?: GuestEntity['class'];
  addedBy?: GuestEntity['addedBy'];
}

export interface AssignGuestInput {
  eventId: number;
  guestId: GuestAssignmentEntity['guestId'];
  bossId: GuestAssignmentEntity['bossId'];
  role: string;
}

export interface UnassignGuestInput {
  eventId: number;
  guestId: GuestAssignmentEntity['guestId'];
  bossId: GuestAssignmentEntity['bossId'];
}
