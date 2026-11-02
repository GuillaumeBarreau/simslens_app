/** Versions du jeu, alignées sur l'enum Prisma `Game` (SIMS-019). */
export const GAMES = ['retail', 'forever'] as const;
export type Game = (typeof GAMES)[number];

export interface RegionEntity {
  id: number;
  name: string;
}

export interface ServerEntity {
  id: number;
  name: string;
  slug: string;
  locale: string | null;
  region: string;
  game: Game;
}

/** Serveur tel qu'exposé au client, sans sa région (portée par le parent). */
export type ServerSummary = Omit<ServerEntity, 'region' | 'game'>;

export interface RegionWithServers extends RegionEntity {
  servers: ServerSummary[];
}

export interface ListRegionsQuery {
  game: Game;
}
