import type { Game, RegionEntity, ServerEntity } from './region.types';

/**
 * Contrat du repository, qui reste écrit en JavaScript.
 * Voir docs/api/architecture.md pour la raison d'être de ce fichier.
 */
declare const regionRepository: {
  getAllRegions(): Promise<RegionEntity[]>;
  getServersByRegion(region: string): Promise<ServerEntity[]>;
  getAllServers(game?: Game): Promise<ServerEntity[]>;
  findServerBySlug(slug: string, region: string): Promise<ServerEntity | null>;
};

export default regionRepository;
