import createError from 'http-errors';

const talentRepo = require('../talent.repository');

export async function getTalentTree(specializationId: number) {
  const tree = await talentRepo.getTalentTree(specializationId);
  if (!tree) {
    throw createError(404, `No talent tree for specialization ${specializationId}`);
  }
  return tree;
}
