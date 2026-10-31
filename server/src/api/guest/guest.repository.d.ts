import type { GuestAssignmentEntity, GuestEntity } from './guest.types';

/**
 * Contrat du repository, qui reste écrit en JavaScript.
 *
 * Les JSDoc `@returns {Promise<Object>}` du fichier .js sont trop imprécises
 * pour être exploitables : ce fichier donne aux use cases la forme réelle
 * des données, sans réécrire les requêtes Prisma.
 */

export interface CreateGuestData {
  eventId: number;
  realmId: number;
  name: string;
  role: string;
  class?: string | null;
  addedBy?: string | null;
}

export interface GuestAssignmentKey {
  guestId: number;
  bossId: number;
}

export interface UpsertAssignmentData extends GuestAssignmentKey {
  role: string;
}

declare const guestRepository: {
  belongsToEvent(guestId: number, eventId: number): Promise<boolean>;
  findByEvent(eventId: number): Promise<GuestEntity[]>;
  create(data: CreateGuestData): Promise<GuestEntity>;
  remove(id: number): Promise<GuestEntity>;
  findAssignmentsByEvent(eventId: number): Promise<GuestAssignmentEntity[]>;
  upsertAssignment(data: UpsertAssignmentData): Promise<GuestAssignmentEntity>;
  removeAssignment(data: GuestAssignmentKey): Promise<{ count: number }>;
};

export default guestRepository;
