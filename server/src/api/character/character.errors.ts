export class CharacterError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'CharacterError';
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class CharacterNotFoundError extends CharacterError {
  constructor(identifier?: string | number) {
    const message = identifier
      ? `Aucun personnage trouvé avec l'identifiant ${identifier}`
      : 'Personnage non trouvé';
    super(message, 404, 'not_found');
    this.name = 'CharacterNotFoundError';
  }
}

export class CharacterAlreadyExistsError extends CharacterError {
  constructor(name: string, realm: string) {
    super(`${name} existe déjà sur le royaume ${realm}`, 409, 'conflict');
    this.name = 'CharacterAlreadyExistsError';
  }
}

export class CharacterValidationError extends CharacterError {
  errors: string[];

  constructor(message: string, errors: string[] = []) {
    super(message, 400, 'validation_error');
    this.name = 'CharacterValidationError';
    this.errors = errors;
  }
}

/**
 * Thrown when a class name, once normalized (normalizeClass), is not a known
 * class: written as is, it would break the foreign key and end in a 500.
 */
export class UnknownCharacterClassError extends CharacterError {
  constructor(className: string) {
    super(`Classe inconnue : « ${className} »`, 400, 'invalid_class');
    this.name = 'UnknownCharacterClassError';
  }
}

export class InvalidSpecializationError extends CharacterError {
  constructor(spec: string | number, className: string, reason?: string) {
    const label = typeof spec === 'number' ? `#${spec}` : `« ${spec} »`;
    super(
      reason ?? `La spécialisation ${label} n'existe pas pour la classe ${className}`,
      400,
      'invalid_specialization',
    );
    this.name = 'InvalidSpecializationError';
  }
}

/**
 * Thrown when a player adds their own character to a guild whose game does not
 * allow it (SIMS-050): only WoW Forever guilds, which have no Blizzard API. A Retail
 * guild goes through the Battle.net claim.
 */
export class GameCapabilityUnavailableError extends CharacterError {
  constructor() {
    super(
      "L'ajout manuel d'un personnage est réservé aux guildes WoW Forever : sur Retail, réclamez votre personnage via Battle.net",
      409,
      'game_capability_unavailable',
    );
    this.name = 'GameCapabilityUnavailableError';
  }
}

/**
 * Thrown when the main specialization is also listed among the off-specs
 * (SIMS-212): a spec is either main or secondary.
 */
export class OffSpecIsPrimaryError extends CharacterError {
  constructor(specializationId: number) {
    super(
      `La spécialisation #${specializationId} est la spécialisation principale : elle ne peut pas être aussi secondaire`,
      400,
      'offspec_is_primary',
    );
    this.name = 'OffSpecIsPrimaryError';
  }
}
