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
}

/** Serveur tel qu'exposé au client, sans sa région (portée par le parent). */
export type ServerSummary = Omit<ServerEntity, 'region'>;

export interface RegionWithServers extends RegionEntity {
  servers: ServerSummary[];
}
