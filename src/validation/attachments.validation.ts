import * as Joi from 'joi';

const attachmentsValidationSchema = {
  ATTACHMENT_IMAGE_MAX_BYTES: Joi.number()
    .integer()
    .positive()
    .default(10485760),
  ATTACHMENT_VIDEO_MAX_BYTES: Joi.number()
    .integer()
    .positive()
    .default(26214400),
  ATTACHMENT_PRESIGN_EXPIRES_SECONDS: Joi.number()
    .integer()
    .positive()
    .default(300),
};

export { attachmentsValidationSchema };
