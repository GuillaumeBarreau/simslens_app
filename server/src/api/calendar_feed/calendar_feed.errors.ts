export class CalendarFeedError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'CalendarFeedError';
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Jeton inconnu, régénéré ou révoqué : même réponse dans tous les cas, sans
 * indiquer si un flux a existé.
 */
export class CalendarFeedNotFoundError extends CalendarFeedError {
  constructor() {
    super('Calendar feed not found', 404, 'not_found');
    this.name = 'CalendarFeedNotFoundError';
  }
}
