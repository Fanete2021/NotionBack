export default () => ({
  PORT: parseInt(process.env.PORT ?? '8000', 10),
  FRONT_URL: process.env.FRONT_URL ?? 'http://localhost:3000',
  MAX_PAGE_CONTENT_BYTES: parseInt(
    process.env.MAX_PAGE_CONTENT_BYTES ?? '1048576',
    10,
  ),
});
