const { ValidationError } = require('../errors/AppError');

/**
 * Clé, sur la requête, de l'ensemble des parties ('body', 'query', 'params')
 * passées par un schéma Joi. Lue par `validated()` (validated.ts) pour refuser
 * de rendre une partie qu'aucun schéma n'a contrôlée.
 */
const VALIDATED_PARTS = Symbol.for('droptimizer.validatedParts');

/**
 * @param {import('express').Request} req
 * @param {string} property - 'body', 'query' or 'params'
 */
function markValidated(req, property) {
  if (!req[VALIDATED_PARTS]) {
    Object.defineProperty(req, VALIDATED_PARTS, { value: new Set(), enumerable: false });
  }
  req[VALIDATED_PARTS].add(property);
}

/**
 * Express 5 exposes `req.query` as a getter without setter: une simple
 * affectation y est silencieusement ignorée, ce qui faisait perdre les
 * conversions de type et les valeurs par défaut de Joi. On définit donc une
 * propriété propre sur la requête, qui masque l'accesseur du prototype.
 *
 * @param {import('express').Request} req
 * @param {string} property - 'body', 'query' or 'params'
 * @param {unknown} value - validated payload
 */
function assignValidated(req, property, value) {
  Object.defineProperty(req, property, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}

/**
 * @param {import('joi').Schema} schema - Joi validation schema
 * @param {string} property - Property to validate ('body', 'query', 'params')
 * @returns {import('express').RequestHandler} Express middleware
 */
function validate(schema, property = 'body') {
  return (req, res, next) => {
    const dataToValidate = req[property];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type,
      }));

      return next(new ValidationError('Validation failed', errors));
    }

    assignValidated(req, property, value);
    markValidated(req, property);
    next();
  };
}

/**
 * @param {import('joi').Schema} schema - Joi validation schema
 */
function validateBody(schema) {
  return validate(schema, 'body');
}

/**
 * @param {import('joi').Schema} schema - Joi validation schema
 */
function validateQuery(schema) {
  return validate(schema, 'query');
}

/**
 * @param {import('joi').Schema} schema - Joi validation schema
 */
function validateParams(schema) {
  return validate(schema, 'params');
}

module.exports = {
  VALIDATED_PARTS,
  validate,
  validateBody,
  validateQuery,
  validateParams,
};
