import * as Joi from 'joi';

const databaseValidationSchema = {
  DATABASE_URL: Joi.string().required(),
};

export { databaseValidationSchema };
