import { AppError, ForbiddenError, UnauthorizedError } from '../../shared/errors/AppError';

export class NoBnetSessionError extends UnauthorizedError {
  constructor() {
    super('Unauthorized: No Battle.net session found', { code: 'no_bnet_session' });
  }
}

/** Le personnage revendiqué n'est pas sur le compte Battle.net de l'utilisateur. */
export class CharacterNotOwnedError extends ForbiddenError {
  constructor() {
    super('Character not found in your Battle.net account', { code: 'character_not_owned' });
  }
}

/** Le personnage n'appartient à aucune guilde enregistrée, ni comme invité. */
export class CharacterWithoutRealmError extends AppError {
  constructor() {
    super(
      'Character does not belong to any registered guild/realm and is not in the roster.',
      400,
      { code: 'character_without_realm' },
    );
  }
}
