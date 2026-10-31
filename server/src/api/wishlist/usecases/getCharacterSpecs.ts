import createError from 'http-errors';

const wishlistRepo = require('../wishlist.repository');

export interface CharacterSpec {
  id: number;
  name: string;
  classId: number;
  role: string;
  icon?: string | null;
  isPrimary: boolean;
}

export async function getCharacterSpecs(characterId: number): Promise<CharacterSpec[]> {
  const specs = await wishlistRepo.getCharacterSpecs(characterId);
  if (specs === null) {
    throw createError(404, `Character ${characterId} not found`);
  }
  return specs;
}
