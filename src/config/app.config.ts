export default () => ({
  PORT: parseInt(process.env.PORT ?? '8000', 10),
  FRONT_URL: process.env.FRONT_URL ?? 'http://localhost:3000',
});
