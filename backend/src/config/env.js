import 'dotenv/config';

export const cfg = {
  port: process.env.PORT || 3000,
  dbUrl: process.env.DATABASE_URL,
  env: process.env.NODE_ENV || 'development'
};
