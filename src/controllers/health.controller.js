import logger from '../utils/logger.js';
import { config } from '../config/index.js';

/**
 * Health check endpoint
 */
export const healthCheck = (req, res) => {
  const memoryUsage = process.memoryUsage();
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
    },
    version: process.env.npm_package_version || '1.0.0',
    environment: config.nodeEnv,
    port: config.port,
    requestId: req.id,
    services: {
      database: 'N/A (API Gateway)',
      external_apis: 'Active'
    }
  };

  // Check if memory usage is too high (> 500MB)
  if (memoryUsage.heapUsed > 500 * 1024 * 1024) {
    health.status = 'warning';
    health.warning = 'High memory usage detected';
  }

  logger.info('Health check accessed', { 
    requestId: req.id,
    status: health.status,
    memoryUsage: health.memory.heapUsed
  });

  const statusCode = health.status === 'healthy' ? 200 : 200; // Still return 200 for warnings
  res.status(statusCode).json(health);
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
