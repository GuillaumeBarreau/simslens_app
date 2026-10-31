export class RosterError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'RosterError';
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when the event does not exist, or belongs to another realm.
 */
export class EventNotAccessibleError extends RosterError {
  constructor() {
    super('Event not found or not accessible', 404, 'not_found');
    this.name = 'EventNotAccessibleError';
  }
}
