import logger from './utils/logger';
import { startServer } from './server';

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', { error: error.message, stack: error.stack });
  // Consider more graceful shutdown here if possible
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled promise rejection:', { reason: reason?.message || reason, promise });
  // Depending on the reason, you might want to exit or log differently
});

// Start the server
startServer().catch(error => {
  logger.error('Failed to start server:', { error });
  process.exit(1);
}); 