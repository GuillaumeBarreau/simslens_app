/**
 * Régions et leurs serveurs, en deux lectures plutôt qu'une jointure :
 * le regroupement se fait en mémoire.
 */

import regionRepo from '../region.repository';
import type { Game, RegionWithServers, ServerSummary } from '../region.types';

/**
 * Retail garde toutes les régions, même sans serveur. Forever n'a qu'un
 * serveur unifié PvE ou PvP par région : on omet les régions qui n'en ont pas.
 */
export async function listRegionsWithServers(game: Game = 'retail'): Promise<RegionWithServers[]> {
  const [regions, servers] = await Promise.all([
    regionRepo.getAllRegions(),
    regionRepo.getAllServers(game),
  ]);

  const serversByRegion = new Map<string, ServerSummary[]>();
  for (const server of servers) {
    const bucket = serversByRegion.get(server.region) ?? [];
    bucket.push({
      id: server.id,
      name: server.name,
      slug: server.slug,
      locale: server.locale,
    });
    serversByRegion.set(server.region, bucket);
  }

  const withServers = regions.map((region) => ({
    ...region,
    servers: serversByRegion.get(region.name) ?? [],
  }));
  return game === 'retail' ? withServers : withServers.filter((r) => r.servers.length > 0);
}
