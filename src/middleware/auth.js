import logger from '../utils/logger.js';
import { config, isDevelopment } from '../config/index.js';

/**
 * API Key Authentication Middleware
 * Optional in development, required in production if API_KEY is set
 */
export const apiKeyAuth = (req, res, next) => {
  // Skip authentication in development if no API key is set
  if (isDevelopment && !config.api.key) {
    return next();
  }

  // Skip if API key is not configured at all
  if (!config.api.key) {
    return next();
  }

  const providedKey = req.headers['x-api-key'] || req.query.api_key;

  if (!providedKey) {
    logger.warn('Missing API key', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.id
    });

    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'API key is required',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }

  if (providedKey !== config.api.key) {
    logger.warn('Invalid API key provided', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.id
    });

    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid API key',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }

  logger.debug('API key authentication successful', {
    requestId: req.id
  });

  next();
};

/**
 * Request Timeout Middleware
 */
export const requestTimeout = (req, res, next) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      logger.warn('Request timeout', {
        url: req.url,
        method: req.method,
        timeout: config.timeout.request,
        requestId: req.id
      });

      res.status(408).json({
        success: false,
        error: 'Request Timeout',
        message: 'Request took too long to process',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
  }, config.timeout.request);

  // Clear timeout when response is sent
  res.on('finish', () => clearTimeout(timeout));
  res.on('close', () => clearTimeout(timeout));

  next();
};
