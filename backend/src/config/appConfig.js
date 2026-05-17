import path from 'path';
import dotenv from 'dotenv';

const envPath = path.resolve(process.cwd(), '.env');
const envModePath = path.resolve(process.cwd(), `.env.${process.env.NODE_ENV || 'development'}`);

dotenv.config({ path: envPath });
dotenv.config({ path: envModePath, override: true });

export function initConfig() {
  return {
    PORT: process.env.PORT || 4000,
    JWT_SECRET: process.env.JWT_SECRET || 'change-me',
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
    EMAIL_HOST: process.env.EMAIL_HOST || '',
    EMAIL_PORT: Number(process.env.EMAIL_PORT) || 587,
    EMAIL_USER: process.env.EMAIL_USER || '',
    EMAIL_PASS: process.env.EMAIL_PASS || '',
    APP_URL: process.env.APP_URL || 'http://localhost:5173',
  };
}
