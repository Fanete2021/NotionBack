import * as Joi from 'joi';

const authValidationSchema = {
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRES_IN: Joi.number().default(900),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.number().default(2592000),
  BCRYPT_SALT_ROUNDS: Joi.number().default(10),
};

export { authValidationSchema };
