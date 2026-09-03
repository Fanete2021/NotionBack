import * as Joi from 'joi';

const s3ValidationSchema = {
  S3_ENDPOINT: Joi.string()
    .uri()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.string().uri().default('http://localhost:9000'),
    }),
  S3_REGION: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.string().default('us-east-1'),
  }),
  S3_BUCKET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.string().default('notion-attachments'),
  }),
  S3_ACCESS_KEY_ID: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.string().default('minioadmin'),
  }),
  S3_SECRET_ACCESS_KEY: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.string().default('minioadmin'),
  }),
  S3_PUBLIC_URL: Joi.string()
    .uri()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.string()
        .uri()
        .default('http://localhost:9000/notion-attachments'),
    }),
};

export { s3ValidationSchema };
