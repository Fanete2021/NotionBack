import * as Joi from 'joi';
import { appValidationSchema } from './app.validation';
import { attachmentsValidationSchema } from './attachments.validation';
import { authValidationSchema } from './auth.validation';
import { databaseValidationSchema } from './database.validation';
import { redisValidationSchema } from './redis.validation';
import { s3ValidationSchema } from './s3.validation';
import { workspaceValidationSchema } from './workspace.validation';

export const validationSchema = Joi.object({
  ...appValidationSchema,
  ...databaseValidationSchema,
  ...authValidationSchema,
  ...redisValidationSchema,
  ...s3ValidationSchema,
  ...attachmentsValidationSchema,
  ...workspaceValidationSchema,
});
