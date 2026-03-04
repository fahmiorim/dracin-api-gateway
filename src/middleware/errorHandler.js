import logger from '../utils/logger.js';
import { isDevelopment } from '../config/index.js';

export const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Don't leak error details in production
  const response = {
    success: false,
    error: 'Internal Server Error',
    timestamp: new Date().toISOString(),
    requestId: req.id || 'unknown'
  };

  if (isDevelopment) {
    response.message = err.message;
    response.stack = err.stack;
  }

  res.status(err.status || 500).json(response);
};

export const notFoundHandler = (req, res) => {
  logger.warn('Route not found:', {
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`,
    timestamp: new Date().toISOString()
  });
};
