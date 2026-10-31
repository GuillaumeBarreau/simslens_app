import { prisma } from '../../../data';
import { type ServerStats, summarizeCharacters } from '../admin.stats';

export async function getServerStats(): Promise<ServerStats> {
  const [realmCount, characters] = await Promise.all([
    prisma.realms.count(),
    prisma.characters.findMany({ include: { specialization: true } }),
  ]);

  return summarizeCharacters(realmCount, characters);
}
