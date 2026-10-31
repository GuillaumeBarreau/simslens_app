/**
 * Régions et leurs serveurs, en deux lectures plutôt qu'une jointure :
 * le regroupement se fait en mémoire.
 */

import regionRepo from '../region.repository';
import type { RegionWithServers, ServerSummary } from '../region.types';

export async function listRegionsWithServers(): Promise<RegionWithServers[]> {
  const [regions, servers] = await Promise.all([
    regionRepo.getAllRegions(),
    regionRepo.getAllServers(),
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

  return regions.map((region) => ({
    ...region,
    servers: serversByRegion.get(region.name) ?? [],
  }));
}
