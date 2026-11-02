import { AppError } from '../../shared/errors/AppError';

/** Spé inconnue, ou que WoW Forever ne propose pas. */
export class InvalidBisSpecializationError extends AppError {
  constructor() {
    super('Unknown specialization for WoW Forever', 400, { code: 'invalid_specialization' });
  }
}

export class UnknownSeasonError extends AppError {
  constructor(season: string) {
    super(`Unknown tier: ${season}`, 400, { code: 'unknown_season' });
  }
}

export class DuplicateBisItemError extends AppError {
  constructor() {
    super('The same item is listed twice for this slot', 400, { code: 'duplicate_item' });
  }
}
