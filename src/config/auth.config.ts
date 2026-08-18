export default () => ({
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_ACCESS_EXPIRES_IN: parseInt(
    process.env.JWT_ACCESS_EXPIRES_IN ?? '900',
    10,
  ),
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN: parseInt(
    process.env.JWT_REFRESH_EXPIRES_IN ?? '2592000',
    10,
  ),
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '10', 10),
});
