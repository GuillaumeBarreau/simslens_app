const { prisma } = require('../../data');

async function getAllRegions() {
  return await prisma.regions.findMany({
    orderBy: {
      name: 'asc',
    },
  });
}

/**
 * @param {string} regionName
 */
async function getServersByRegion(regionName) {
  return await prisma.servers.findMany({
    where: {
      region: regionName,
    },
    orderBy: {
      name: 'asc',
    },
  });
}

/**
 * @param {'retail' | 'forever'} [game] - sans valeur : tous les jeux
 */
async function getAllServers(game) {
  return await prisma.servers.findMany({
    where: game ? { game } : undefined,
    orderBy: [{ region: 'asc' }, { name: 'asc' }],
  });
}

/**
 * Serveur d'une région par son slug, sans tenir compte de la casse.
 * @param {string} slug
 * @param {string} region
 */
async function findServerBySlug(slug, region) {
  return await prisma.servers.findFirst({
    where: {
      slug: { equals: slug, mode: 'insensitive' },
      region: { equals: region, mode: 'insensitive' },
    },
  });
}

module.exports = {
  getAllRegions,
  getServersByRegion,
  getAllServers,
  findServerBySlug,
};
