export class SignupError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'SignupError';
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when a signup is changed after the lock window has opened.
 *
 * Le message reste `signup_locked` : le client s'en sert pour afficher son
 * propre libellé.
 */
export class SignupLockedError extends SignupError {
  constructor() {
    super('signup_locked', 403, 'signup_locked');
    this.name = 'SignupLockedError';
  }
}

export class SignupCharacterNotFoundError extends SignupError {
  constructor() {
    super('Character not found', 404, 'not_found');
    this.name = 'SignupCharacterNotFoundError';
  }
}

/**
 * Thrown when the event does not exist, or belongs to another realm.
 *
 * Les deux cas partagent la même réponse, pour ne pas révéler l'existence
 * d'un événement sur un autre royaume.
 */
export class EventNotAccessibleError extends SignupError {
  constructor() {
    super('Event not found or access denied', 404, 'not_found');
    this.name = 'EventNotAccessibleError';
  }
}
