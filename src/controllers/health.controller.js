import logger from '../utils/logger.js';

/**
 * Health check endpoint
 */
export const healthCheck = (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    requestId: req.id
  };

  logger.info('Health check accessed', { requestId: req.id });
  res.status(200).json(health);
};

/**
 * API info endpoint
 */
export const apiInfo = (req, res) => {
  const info = {
    name: 'Dramabox API Gateway',
    version: '1.0.0',
    description: 'API Gateway untuk Dramabox content',
    status: 'running',
    endpoints: {
      base: '/api',
      latest: '/api/latest',
      trending: '/api/trending',
      search: '/api/search',
      detail: '/api/detail',
      dubbed: '/api/dubbed',
      health: '/health'
    },
    documentation: {
      swagger: 'swagger.yaml (for Postman import)',
      postman: 'Import swagger.yaml to Postman'
    },
    requestId: req.id
  };

  logger.info('API info accessed', { requestId: req.id });
  res.json(info);
};
