import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3001',
      'http://localhost:3002', 
      'http://localhost:5173',
      'http://localhost:8080',
      'https://yourdomain.com',
      'https://www.yourdomain.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Client-ID']
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX || 50 // Kurangi dari 100 ke 50 untuk testing
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },
  timeout: {
    request: parseInt(process.env.REQUEST_TIMEOUT) || 30000, // 30 seconds
    external: parseInt(process.env.EXTERNAL_TIMEOUT) || 15000 // 15 seconds
  },
  api: {
    key: process.env.API_KEY || null,
    version: process.env.npm_package_version || '1.0.0'
  },
  database: {
    type: 'supabase',
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY,
    connectionString: process.env.DATABASE_URL
  }
};

export const isDevelopment = config.nodeEnv === 'development';
export const isProduction = config.nodeEnv === 'production';
export const isTest = config.nodeEnv === 'test';
