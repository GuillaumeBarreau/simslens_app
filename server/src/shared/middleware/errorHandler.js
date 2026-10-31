function generateErrorId() {
  const now = Date.now();
  const timeHex = now.toString(16);
  function short() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return `${timeHex}-${short()}${short()}-${short()}-${short()}-${short()}${short()}${short()}`;
}

function getStatusCode(err) {
  if (!err) return 500;
  if (typeof err.statusCode === 'number') return err.statusCode;
  if (typeof err.status === 'number') return err.status;
  return 500;
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const status = getStatusCode(err) || 500;
  const errorId = generateErrorId();
  const isOperational = err.isOperational !== undefined ? err.isOperational : true;

  const payload = {
    error: err.code || 'server_error',
    message: err.message || 'Internal Server Error',
    errorId,
  };

  if (err.errors && Array.isArray(err.errors)) {
    payload.errors = err.errors;
  }

  const includeStack =
    process.env.NODE_ENV !== 'production' || process.env.INCLUDE_STACK_IN_RESPONSES === 'true';
  if (includeStack) payload.stack = err.stack;

  try {
    const logPayload = {
      errorId,
      status,
      code: err.code,
      method: req.method,
      message: err.message,
      stack: err.stack,
      path: req.originalUrl,
      isOperational,
    };

    if (err.errors && Array.isArray(err.errors)) {
      logPayload.validationErrors = err.errors;
    }

    if (err.meta) {
      logPayload.meta = err.meta;
    }

    if (isOperational) {
      console.error('[errorHandler] Operational error:', logPayload);
    } else {
      console.error('[errorHandler] ❌ PROGRAMMING ERROR DETECTED:', logPayload);
    }
  } catch (e) {
    console.error('[errorHandler] Failed to log error', e);
  }

  res.status(status).json(payload);

  if (!isOperational) {
    console.error('[errorHandler] ❌ PROGRAMMING ERROR DETECTED');
    console.error('[errorHandler] Initiating graceful shutdown...');

    const gracefulShutdown = require('../gracefulShutdown');

    setImmediate(() => {
      gracefulShutdown.initiateShutdown(1, 'Programming Error');
    });
  }
}

module.exports = errorHandler;
