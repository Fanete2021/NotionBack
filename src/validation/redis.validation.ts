import * as Joi from 'joi';

const redisValidationSchema = {
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
};

export { redisValidationSchema };
