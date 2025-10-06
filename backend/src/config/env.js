import 'dotenv/config';

export const cfg = {
  port: process.env.PORT || 3000,
  dbUrl: process.env.DATABASE_URL,
  env: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h'
};
