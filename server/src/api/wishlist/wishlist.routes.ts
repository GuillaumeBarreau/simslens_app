import express from 'express';

import checkPermission from '../../middleware/checkPermission';
import { Permission } from '../../shared/config/permissions/permissions';
import * as controller from './wishlist.controller';
const { validateBody, validateParams, validateQuery } = require('../../shared/middleware/validate');
const {
  availableItemsParams,
  availableItemsQuery,
  characterIdParam,
  copyFromCharacterParams,
  copyWishlistFromCharacterSchema,
  updateWishlistItemSchema,
  wishlistAlternativesQuery,
  wishlistItemParams,
  wishlistQuery,
  wishlistSlotParams,
  wishlistStatusQuery,
} = require('./wishlist.validation');

const router = express.Router();

router.get(
  '/characters/:id/wishlist/specs',
  checkPermission(Permission.VIEW_WISHLIST),
  validateParams(characterIdParam),
  controller.getCharacterSpecs,
);

router.get(
  '/characters/:id/wishlist',
  checkPermission(Permission.VIEW_WISHLIST),
  validateParams(characterIdParam),
  validateQuery(wishlistQuery),
  controller.getWishlist,
);

router.get(
  '/characters/:id/wishlist/status',
  checkPermission(Permission.VIEW_WISHLIST),
  validateParams(characterIdParam),
  validateQuery(wishlistStatusQuery),
  controller.getWishlistStatus,
);

router.get(
  '/characters/:id/wishlist/:slot/alternatives',
  checkPermission(Permission.VIEW_WISHLIST),
  validateParams(wishlistSlotParams),
  validateQuery(wishlistAlternativesQuery),
  controller.getWishlistSlotAlternatives,
);

router.put(
  '/characters/:id/wishlist/:slot',
  checkPermission(Permission.MANAGE_WISHLIST),
  validateParams(wishlistItemParams),
  validateBody(updateWishlistItemSchema),
  controller.updateWishlistItem,
);

router.post(
  '/characters/:id/wishlist/copy-from/:sourceId',
  checkPermission(Permission.MANAGE_WISHLIST),
  validateParams(copyFromCharacterParams),
  validateBody(copyWishlistFromCharacterSchema),
  controller.copyWishlistFromCharacter,
);

router.get(
  '/extensions/:extension/seasons/:season/items/:slot',
  validateParams(availableItemsParams),
  validateQuery(availableItemsQuery),
  controller.getAvailableItems,
);
router.get(
  '/roster/:region/:guildName',
  checkPermission(Permission.VIEW_WISHLIST),
  controller.getRosterWishlists,
);

router.get(
  '/roster/:region/:guildName/wishlist-hidden-specs',
  checkPermission(Permission.VIEW_WISHLIST),
  controller.getRosterHiddenSpecWishlists,
);

router.get(
  '/roster/:region/:guildName/wishlist-completion',
  checkPermission(Permission.VIEW_WISHLIST),
  controller.getRosterWishlistCompletion,
);

module.exports = router;
