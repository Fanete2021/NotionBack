import * as Joi from 'joi';

const appValidationSchema = {
  PORT: Joi.number().default(8000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
  FRONT_URL: Joi.string().uri().default('http://localhost:3000'),
};

export { appValidationSchema };
