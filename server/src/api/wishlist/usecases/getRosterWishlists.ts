const repository = require('../wishlist.repository');

export async function getRosterWishlists(realmId: number) {
  return repository.getRosterWishlists(realmId);
}
