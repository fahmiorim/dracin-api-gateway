import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 4343,
  nodeEnv: process.env.NODE_ENV || 'development',
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX || 100
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

export const isDevelopment = config.nodeEnv === 'development';
export const isProduction = config.nodeEnv === 'production';
