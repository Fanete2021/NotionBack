import * as Joi from 'joi';

const telegramValidationSchema = {
  TELEGRAM_BOT_TOKEN: Joi.string()
    .allow('')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().required(),
      otherwise: Joi.string().allow('').default(''),
    }),
  TELEGRAM_BOT_USERNAME: Joi.string().allow('').default(''),
  TELEGRAM_WEBHOOK_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  TELEGRAM_CONNECT_CODE_TTL_SECONDS: Joi.number()
    .integer()
    .positive()
    .default(900),
};

export { telegramValidationSchema };
