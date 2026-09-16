import * as Joi from 'joi';

const sentryValidationSchema = {
  SENTRY_DSN: Joi.string().uri().allow('').optional(),
  SENTRY_ENVIRONMENT: Joi.string().optional(),
  SENTRY_RELEASE: Joi.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: Joi.number().min(0).max(1).default(0),
  SENTRY_PROFILES_SAMPLE_RATE: Joi.number().min(0).max(1).default(0),
};

export { sentryValidationSchema };
