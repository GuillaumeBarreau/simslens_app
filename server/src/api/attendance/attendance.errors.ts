export class AttendanceError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'AttendanceError';
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InvalidDateError extends AttendanceError {
  constructor() {
    super('Invalid date', 400, 'invalid_date');
    this.name = 'InvalidDateError';
  }
}

export class InvalidDateOrderError extends AttendanceError {
  constructor() {
    super('startDate must be before endDate', 400, 'invalid_date_order');
    this.name = 'InvalidDateOrderError';
  }
}

export class DateRangeTooLargeError extends AttendanceError {
  constructor(maxDays: number) {
    super(`Date range too large (max ${maxDays} days)`, 400, 'range_too_large');
    this.name = 'DateRangeTooLargeError';
  }
}

export class MissingIdentifierError extends AttendanceError {
  constructor(field: 'realmId' | 'characterId') {
    super(`${field} is required`, 400, 'missing_identifier');
    this.name = 'MissingIdentifierError';
  }
}
