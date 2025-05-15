import express from 'express';
import { CronJob } from 'cron';
import logger from './utils/logger';
import { configureMiddleware } from './middlewares';
import routes from './routes';
import { PORT, SKIP_INITIAL_SCRAPE, SCRAPE_SCHEDULE, TIMEZONE, REDIS_CONFIG } from './config';
import { initializeQdrant } from './services/qdrant';
import { scrapeSitemap } from './services/scraper';
import { initRedis, shutdownRedis } from './services/redis';

// Create Express app
export const app = express();

// Configure middleware
configureMiddleware(app);

// Register routes
app.use(routes);

// Initialize and start the server
export async function startServer(): Promise<void> {
  try {
    // Initialize services
    await initializeQdrant();
    
    // Initialize Redis if enabled
    if (REDIS_CONFIG.enabled) {
      await initRedis();
    } else {
      logger.info('Redis caching is disabled');
    }

    // Start cron job to run every 4 hours
    // const job = new CronJob(
    //   SCRAPE_SCHEDULE, 
    //   scrapeSitemap, 
    //   null, 
    //   true, 
    //   TIMEZONE
    // );

    // Run initial scrape on startup if not disabled
    if (!SKIP_INITIAL_SCRAPE) {
      logger.info('Running initial scrape on startup');
      // Don't await here, let it run in the background
      scrapeSitemap().catch(err => logger.error('Initial scrape failed:', err));
    } else {
      logger.info('Skipping initial scrape on startup');
    }

    // Start the server
    const server = app.listen(PORT, () => {
      logger.info(`Server running at http://localhost:${PORT}`);
      try {
      //  logger.info(`Next scheduled scraping: ${job.nextDate().toJSDate().toISOString()}`);
      } catch (e) {
        logger.warn('Could not determine next cron job date.');
      }
    });

    // Graceful shutdown setup
    // const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
    // signals.forEach(signal => {
    //   process.on(signal, async () => {
    //     logger.info(`Received ${signal}. Shutting down gracefully...`);
    //     job.stop();
        
    //     // Close Redis connection
    //     if (REDIS_CONFIG.enabled) {
    //       await shutdownRedis();
    //     }
        
    //     server.close(() => {
    //       logger.info('Server closed.');
    //       process.exit(0);
    //     });

    //     // Force shutdown after timeout
    //     setTimeout(() => {
    //       logger.error('Could not close connections in time, forcing shutdown');
    //       process.exit(1);
    //     }, 10000); // 10 seconds timeout
    //   });
    // });

  } catch (error: any) {
    logger.error('Failed to start server:', { error: error.message, stack: error.stack });
    process.exit(1);
  }
} 