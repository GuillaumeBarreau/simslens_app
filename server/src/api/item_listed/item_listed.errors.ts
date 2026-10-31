export class ItemListedError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'ItemListedError';
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ItemNotFoundError extends ItemListedError {
  constructor(itemId: number) {
    super(`Item ${itemId} not found`, 404, 'not_found');
    this.name = 'ItemNotFoundError';
  }
}
