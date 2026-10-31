import type {
  AvailabilityEntity,
  CreateAvailabilityInput,
  ListAvailabilitiesFilters,
  UpdateAvailabilityInput,
} from './dungeon_availability.types';

/**
 * Contrat du repository, qui reste écrit en JavaScript.
 * Voir docs/api/architecture.md pour la raison d'être de ce fichier.
 */
declare const availabilityRepository: {
  findAll(filters: ListAvailabilitiesFilters): Promise<AvailabilityEntity[]>;
  findById(id: number): Promise<AvailabilityEntity | null>;
  create(data: CreateAvailabilityInput): Promise<AvailabilityEntity>;
  update(id: number, data: UpdateAvailabilityInput): Promise<AvailabilityEntity>;
  remove(id: number): Promise<AvailabilityEntity>;
  belongsToRealm(id: number, realmId: number, userId?: string | null): Promise<boolean>;
};

export default availabilityRepository;
