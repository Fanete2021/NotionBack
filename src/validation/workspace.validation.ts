import * as Joi from 'joi';

const workspaceValidationSchema = {
  MAX_WORKSPACES_PER_USER: Joi.number().default(3),
  MAX_PAGE_CONTENT_BYTES: Joi.number().default(1048576),
  INVITE_TTL_SECONDS: Joi.number().integer().positive().default(86400),
  MAX_INVITES_PER_WORKSPACE: Joi.number().integer().positive().default(10),
};

export { workspaceValidationSchema };
