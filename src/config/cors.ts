import 'dotenv/config';

const DEFAULT_CORS_ORIGINS = 'http://localhost:3000';

function getCorsOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? DEFAULT_CORS_ORIGINS).split(',');
}

export { getCorsOrigins };
