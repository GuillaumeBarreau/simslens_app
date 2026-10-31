import type {
  CreateEventInput,
  CreateSeriesOccurrenceInput,
  EventEntity,
  ListEventsFilters,
  UpdateEventInput,
} from './event.types';

/**
 * Contrat du repository, qui reste écrit en JavaScript.
 * Voir docs/api/architecture.md pour la raison d'être de ce fichier.
 */
declare const eventRepository: {
  findAll(filters: ListEventsFilters): Promise<EventEntity[]>;
  findById(id: number): Promise<EventEntity | null>;
  findWithRoster(id: number): Promise<EventEntity | null>;
  belongsToRealm(id: number, realmId: number): Promise<boolean>;
  create(
    data: (CreateEventInput | CreateSeriesOccurrenceInput) & { createdBy: string },
  ): Promise<EventEntity>;
  update(id: number, data: UpdateEventInput & Record<string, unknown>): Promise<EventEntity>;
  remove(id: number): Promise<EventEntity>;
};

export default eventRepository;
