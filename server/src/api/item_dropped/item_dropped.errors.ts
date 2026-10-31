export class LootError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'LootError';
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class LootNotFoundError extends LootError {
  constructor(lootId: number) {
    super(`Loot ${lootId} not found`, 404, 'not_found');
    this.name = 'LootNotFoundError';
  }
}
