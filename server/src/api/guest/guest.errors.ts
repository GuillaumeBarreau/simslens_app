export class GuestError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'GuestError';
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InvalidGuestRoleError extends GuestError {
  constructor(validRoles: readonly string[]) {
    super(`Invalid role. Must be one of: ${validRoles.join(', ')}`, 400, 'invalid_role');
    this.name = 'InvalidGuestRoleError';
  }
}

export class GuestNameRequiredError extends GuestError {
  constructor() {
    super('Guest name is required', 400, 'missing_name');
    this.name = 'GuestNameRequiredError';
  }
}

export class GuestEventNotFoundError extends GuestError {
  constructor() {
    super('Event not found', 404, 'not_found');
    this.name = 'GuestEventNotFoundError';
  }
}

/**
 * Thrown when the guest does not exist on the event of the route.
 *
 * Un invité d'un autre événement est introuvable, sans révéler qu'il existe.
 */
export class GuestNotFoundError extends GuestError {
  constructor() {
    super('Guest not found', 404, 'not_found');
    this.name = 'GuestNotFoundError';
  }
}
