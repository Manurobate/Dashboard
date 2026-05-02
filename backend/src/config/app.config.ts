import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(3306),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRY: Joi.string().pattern(/^\d+[smhd]$/).default('15m'),
  REFRESH_TOKEN_EXPIRY_DAYS: Joi.number().min(1).default(30),
  ADMIN_USERNAME: Joi.string().trim().min(1).required(),
  ADMIN_INITIAL_PASSWORD: Joi.string().trim().min(8).required(),
  THROTTLER_TTL: Joi.number().default(60000),
  THROTTLER_LIMIT: Joi.number().default(5),
  CORS_ORIGIN: Joi.string().optional(),
});
