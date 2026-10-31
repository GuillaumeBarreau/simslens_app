import { AppError, NotFoundError, UnauthorizedError } from '../../shared/errors/AppError';

export class ItemBnetSessionRequiredError extends UnauthorizedError {
  constructor() {
    super('Battle.net authentication required', { code: 'no_bnet_session' });
  }
}

/** L'API Blizzard ne connaît pas cet objet. */
export class ItemNotFoundError extends NotFoundError {
  constructor(itemId: number) {
    super(`Item ${itemId}`, { code: 'item_not_found' });
  }
}

/** L'API Blizzard refuse les identifiants de l'application. */
export class BlizzardCredentialsError extends AppError {
  constructor() {
    super('Invalid Battle.net credentials', 403, { code: 'blizzard_forbidden' });
  }
}
