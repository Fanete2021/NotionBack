export default () => ({
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_HOST: process.env.REDIS_HOST ?? 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  MAX_WORKSPACES_PER_USER: parseInt(
    process.env.MAX_WORKSPACES_PER_USER ?? '3',
    10,
  ),
});
