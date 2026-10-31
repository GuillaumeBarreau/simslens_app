class AppError extends Error {
  constructor(message, statusCode = 500, options = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = options.code || null;
    this.meta = options.meta || null;
    this.isOperational = options.isOperational !== undefined ? options.isOperational : true;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      meta: this.meta,
    };
  }
}

class ValidationError extends AppError {
  constructor(message, errors = [], options = {}) {
    super(message, 400, { ...options, code: options.code || 'validation_error' });
    this.errors = errors;
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource', options = {}) {
    super(`${resource} not found`, 404, { ...options, code: options.code || 'not_found' });
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', options = {}) {
    super(message, 401, { ...options, code: options.code || 'unauthorized' });
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', options = {}) {
    super(message, 403, { ...options, code: options.code || 'forbidden' });
  }
}

class ConflictError extends AppError {
  constructor(message, options = {}) {
    super(message, 409, { ...options, code: options.code || 'conflict' });
  }
}

class TooManyRequestsError extends AppError {
  constructor(retryAfter = 60, options = {}) {
    super('Too many requests', 429, { ...options, code: options.code || 'too_many_requests' });
    this.retryAfter = retryAfter;
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  TooManyRequestsError,
};
