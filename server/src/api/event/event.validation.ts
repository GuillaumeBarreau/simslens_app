import Joi from 'joi';

import { routeId } from '../../shared/validation/routeId';
import { isValidTimeZone, parseDateOnly, TIME_OF_DAY_PATTERN } from './eventSeries.schedule';

/** Valeurs de l'enum EventStatus (cf. schema.prisma). */
export const EVENT_STATUSES = ['SCHEDULED', 'CANCELLED', 'COMPLETED'];

export const positiveId = Joi.number().integer().positive();

export const realmIdField = positiveId.messages({
  'number.base': 'realmId must be a number',
  'any.required': 'realmId is required',
});

export const eventIdParam = Joi.object({
  id: positiveId.required().messages({
    'number.base': 'Event ID must be a number',
    'any.required': 'Event ID is required',
  }),
});

export const eventIdNamedParam = Joi.object({
  eventId: positiveId.required().messages({
    'number.base': 'Event ID must be a number',
    'any.required': 'Event ID is required',
  }),
});

export const realmScopeQuery = Joi.object({
  realmId: realmIdField.required(),
});

export const listEventsQuery = Joi.object({
  realmId: realmIdField.required(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  status: Joi.string()
    .valid(...EVENT_STATUSES)
    .optional(),
});

export const createEventSchema = Joi.object({
  realmId: realmIdField.required(),
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().allow('', null).optional(),
  startTime: Joi.date().required(),
  endTime: Joi.date().min(Joi.ref('startTime')).required().messages({
    'date.min': 'endTime must be on or after startTime',
  }),
  raidDifficultyId: positiveId.allow(null).optional(),
  status: Joi.string()
    .valid(...EVENT_STATUSES)
    .optional(),
  isOptional: Joi.boolean().optional(),
  defaultPresent: Joi.boolean().optional(),
  signupLockDisabled: Joi.boolean().optional(),
});

export const updateEventSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).optional(),
  description: Joi.string().allow('', null).optional(),
  startTime: Joi.date().optional(),
  endTime: Joi.date().optional(),
  raidDifficultyId: positiveId.allow(null).optional(),
  status: Joi.string()
    .valid(...EVENT_STATUSES)
    .optional(),
  isOptional: Joi.boolean().optional(),
  defaultPresent: Joi.boolean().optional(),
  signupLockDisabled: Joi.boolean().optional(),
}).min(1);

export const duplicateEventSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).optional(),
  copySignups: Joi.boolean().optional(),
});

/** Date "YYYY-MM-DD", convertie en minuit UTC. */
const dateOnly = Joi.string()
  .custom((value: string, helpers) => parseDateOnly(value) ?? helpers.error('any.invalid'))
  .messages({ 'any.invalid': '{{#label}} must be a date formatted YYYY-MM-DD' });

const timeOfDay = Joi.string()
  .pattern(TIME_OF_DAY_PATTERN)
  .messages({ 'string.pattern.base': '{{#label}} must be a time formatted HH:mm' });

const timeZone = Joi.string()
  .custom((value: string, helpers) =>
    isValidTimeZone(value) ? value : helpers.error('any.invalid'),
  )
  .messages({ 'any.invalid': '{{#label}} must be an IANA time zone' });

/** Nombre de semaines générées à l'avance. */
export const MAX_WEEKS_AHEAD = 12;
const weeksAhead = Joi.number().integer().min(1).max(MAX_WEEKS_AHEAD);

export const seriesIdParam = Joi.object({
  seriesId: routeId.required(),
});

export const createEventSeriesSchema = Joi.object({
  realmId: realmIdField.required(),
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().allow('', null).optional(),
  raidDifficultyId: positiveId.allow(null).optional(),
  startDate: dateOnly.required(),
  startTime: timeOfDay.required(),
  endTime: timeOfDay.required(),
  timezone: timeZone.default('Europe/Paris'),
  weeksAhead: weeksAhead.default(4),
  isOptional: Joi.boolean().optional(),
  defaultPresent: Joi.boolean().optional(),
  signupLockDisabled: Joi.boolean().optional(),
});

export const updateEventSeriesSchema = Joi.object({
  fromDate: dateOnly.required(),
  title: Joi.string().trim().min(1).max(200).optional(),
  description: Joi.string().allow('', null).optional(),
  raidDifficultyId: positiveId.allow(null).optional(),
  startTime: timeOfDay.optional(),
  endTime: timeOfDay.optional(),
  // Fuseau de saisie des horaires, converti dans celui de la série.
  timezone: timeZone.optional(),
  weeksAhead: weeksAhead.optional(),
  isOptional: Joi.boolean().optional(),
  defaultPresent: Joi.boolean().optional(),
  signupLockDisabled: Joi.boolean().optional(),
}).min(2);

export const deleteEventSeriesQuery = Joi.object({
  realmId: realmIdField.required(),
  fromDate: dateOnly.required(),
});
