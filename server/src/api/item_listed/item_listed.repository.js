const { prisma } = require('../../data');

/**
 * @param {number} id
 */
async function findItemById(id) {
  return await prisma.items.findUnique({
    where: { id: parseInt(id) },
  });
}

module.exports = {
  findItemById,
};
