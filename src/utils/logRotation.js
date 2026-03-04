import winston from 'winston';
import { config } from '../config/index.js';

// Custom format untuk mengurangi noise
const customFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format((info) => {
    // Skip logging untuk health check di production
    if (config.nodeEnv === 'production' && info.url === '/health') {
      return false;
    }
    
    // Skip request logging untuk static assets
    if (info.url && info.url.includes('/docs')) {
      return false;
    }
    
    return info;
  })()
);

export const createLogger = () => {
  return winston.createLogger({
    level: config.logging.level,
    format: customFormat,
    defaultMeta: { service: 'dramabox-api-gateway' },
    transports: [
      new winston.transports.File({ 
        filename: 'logs/error.log', 
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 3
      }),
      new winston.transports.File({ 
        filename: 'logs/combined.log',
        maxsize: 10485760, // 10MB
        maxFiles: 5
      })
    ]
  });
};
