import { AppError } from '../../shared/errors/AppError';

/** Personnage absent, ou d'une autre guilde : introuvable sans révéler qu'il existe. */
export class AttunementCharacterNotFoundError extends AppError {
  constructor() {
    super('Character not found or not accessible', 404, { code: 'not_found' });
  }
}

export class UnknownAttunementError extends AppError {
  constructor() {
    super('Unknown attunement', 404, { code: 'unknown_attunement' });
  }
}

/** Plus d'étapes que la chaîne de la faction n'en compte. */
export class InvalidAttunementStepError extends AppError {
  constructor(totalSteps: number) {
    super(`completedSteps must be between 0 and ${totalSteps}`, 400, {
      code: 'invalid_step',
    });
  }
}
