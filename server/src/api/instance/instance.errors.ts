export class InstanceError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'InstanceError';
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class RaidDifficultyRequiredError extends InstanceError {
  constructor() {
    super('Raid difficulty ID is required', 400, 'missing_raid_difficulty');
    this.name = 'RaidDifficultyRequiredError';
  }
}

export class InstanceIdRequiredError extends InstanceError {
  constructor() {
    super('Instance ID is required', 400, 'missing_instance_id');
    this.name = 'InstanceIdRequiredError';
  }
}

export class EmptyInstanceUpdateError extends InstanceError {
  constructor() {
    super('At least one field must be provided for update', 400, 'empty_update');
    this.name = 'EmptyInstanceUpdateError';
  }
}

/**
 * Thrown when the instance does not exist, or belongs to another realm.
 *
 * Les deux cas partagent la même réponse, pour ne pas révéler l'existence
 * d'une instance sur un autre royaume.
 */
export class InstanceNotFoundError extends InstanceError {
  constructor() {
    super('Instance not found', 404, 'not_found');
    this.name = 'InstanceNotFoundError';
  }
}
