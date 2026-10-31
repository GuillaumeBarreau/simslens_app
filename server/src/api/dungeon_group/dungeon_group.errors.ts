export class DungeonGroupError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'DungeonGroupError';
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InvalidDungeonRoleError extends DungeonGroupError {
  constructor(validRoles: readonly string[]) {
    super(`Invalid role. Must be one of: ${validRoles.join(', ')}`, 400, 'invalid_role');
    this.name = 'InvalidDungeonRoleError';
  }
}

export class GroupGuestNameRequiredError extends DungeonGroupError {
  constructor() {
    super('Guest name is required', 400, 'missing_name');
    this.name = 'GroupGuestNameRequiredError';
  }
}

/**
 * Thrown when the group does not exist, or belongs to another realm.
 *
 * Les deux cas partagent la même réponse, pour ne pas révéler l'existence
 * d'un groupe sur un autre royaume.
 */
export class GroupNotFoundError extends DungeonGroupError {
  constructor() {
    super('Group not found', 404, 'not_found');
    this.name = 'GroupNotFoundError';
  }
}

/**
 * Thrown when the user to add has no role on the realm of the group
 * (neither owner, member nor guest).
 *
 * 404 plutôt que 400 : un identifiant inventé et le joueur d'une autre guilde
 * reçoivent la même réponse, pour ne pas révéler l'existence d'un compte
 * hors du royaume — même règle que GroupNotFoundError.
 */
export class GroupMemberNotInRealmError extends DungeonGroupError {
  constructor() {
    super('User not found on this realm', 404, 'not_found');
    this.name = 'GroupMemberNotInRealmError';
  }
}

/** Thrown when the user is not a member of the group of the route. */
export class GroupMemberNotFoundError extends DungeonGroupError {
  constructor() {
    super('Member not found', 404, 'not_found');
    this.name = 'GroupMemberNotFoundError';
  }
}

/** Thrown when the guest does not exist in the group of the route. */
export class GroupGuestNotFoundError extends DungeonGroupError {
  constructor() {
    super('Guest not found', 404, 'not_found');
    this.name = 'GroupGuestNotFoundError';
  }
}
