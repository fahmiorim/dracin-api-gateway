import app from './src/app.js';
import { config } from './src/config/index.js';
import logger from './src/utils/logger.js';
import { startExpiryNotificationJob } from './src/jobs/expiryNotifications.js';
import { runSync, startCronSync, stopCronSync } from './src/services/syncService.js';

// Start server
const server = app.listen(config.port, () => {
  startExpiryNotificationJob();

  // Initial metadata sync (delayed 5s to let server fully start)
  // Skip in dev mode to avoid repeated syncs on nodemon restarts
  if (process.env.NODE_ENV !== 'development') {
    setTimeout(() => {
      runSync().catch(err => logger.error('Initial sync error:', err.message));
    }, 5000);
  }

  // Schedule cron sync every 6 hours
  startCronSync();
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
