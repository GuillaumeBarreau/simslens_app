import { prisma } from '../../../data';

export async function listEnchantments(): Promise<unknown[]> {
  return prisma.enchantments.findMany({
    select: { id: true, tokenizedName: true, spellId: true, itemId: true },
  });
}
