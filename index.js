import app from './src/app.js';
import { config } from './src/config/index.js';
import logger from './src/utils/logger.js';

// Start server
const server = app.listen(config.port, () => {
  logger.info('🚀 Dracin API Gateway started', {
    port: config.port,
    environment: config.nodeEnv,
    pid: process.pid
  });
  
  console.log(`🚀 Dracin API Gateway running on http://localhost:${config.port}`);
  console.log(`📡 API Base: http://localhost:${config.port}/api`);
  console.log(`🏥 Health Check: http://localhost:${config.port}/health`);
  console.log(`📋 Swagger: Import swagger.yaml to Postman`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Handle signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;
