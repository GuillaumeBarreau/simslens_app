export class BossNoteError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'BossNoteError';
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when the event does not exist, or belongs to another realm.
 *
 * Un événement d'une autre guilde est introuvable, sans révéler qu'il existe.
 */
export class BossNoteEventNotFoundError extends BossNoteError {
  constructor() {
    super('Event not found or not accessible', 404, 'not_found');
    this.name = 'BossNoteEventNotFoundError';
  }
}

/**
 * Thrown when the boss does not exist, or is not a boss of the event's raid.
 */
export class InvalidBossError extends BossNoteError {
  constructor() {
    super('Boss is not part of this event', 400, 'invalid_boss');
    this.name = 'InvalidBossError';
  }
}

/**
 * Thrown when an assignment targets a character who is not on the roster of
 * the boss for this event.
 */
export class AssigneeNotHolderError extends BossNoteError {
  characterIds: number[];

  constructor(characterIds: number[]) {
    super(
      `Characters not on the roster of this boss: ${characterIds.join(', ')}`,
      400,
      'assignee_not_holder',
    );
    this.name = 'AssigneeNotHolderError';
    this.characterIds = characterIds;
  }
}
