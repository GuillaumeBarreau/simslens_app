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

async function getAllServers() {
  return await prisma.servers.findMany({
    orderBy: [{ region: 'asc' }, { name: 'asc' }],
  });
}

module.exports = {
  getAllRegions,
  getServersByRegion,
  getAllServers,
};
