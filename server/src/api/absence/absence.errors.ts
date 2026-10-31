export class AbsenceError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'AbsenceError';
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when an absence does not exist, or lies outside the caller's realm.
 *
 * Les deux cas partagent volontairement la même réponse : révéler qu'une
 * absence existe sur un autre royaume serait une fuite d'information.
 */
export class AbsenceNotFoundError extends AbsenceError {
  constructor() {
    super('Absence not found', 404, 'not_found');
    this.name = 'AbsenceNotFoundError';
  }
}
