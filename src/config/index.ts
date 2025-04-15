import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Helper function to get required environment variable
export function getEnvVariable(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`Missing environment variable: ${key}`);
    process.exit(1);
  }
  return value;
}

// Configuration constants
export const PORT: number = parseInt(process.env.PORT || '3000', 10);
export const OPENAI_API_KEY = getEnvVariable('OPENAI_API_KEY');
export const QDRANT_URL = getEnvVariable('QDRANT_URL');
export const QDRANT_API_KEY = getEnvVariable('QDRANT_API_KEY');

// Sitemap source URL
export const SITEMAP_URL = 'https://www.podatki.gov.pl/mapa-serwisu-podatki-gov-pl/';

// Collection name for Qdrant
export const COLLECTION_NAME = 'tax_info';

// Cron schedule for scraping (every 4 hours)
export const SCRAPE_SCHEDULE = '0 */4 * * *';

// Timezone for cron
export const TIMEZONE = 'Europe/Warsaw';

// Flag to skip initial scrape on startup
export const SKIP_INITIAL_SCRAPE = process.env.SKIP_INITIAL_SCRAPE === 'true';

// Cache configuration
export const CACHE_CONFIG = {
  // Maximum number of questions to cache
  maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10),
  // Cache TTL in minutes
  ttlMinutes: parseInt(process.env.CACHE_TTL_MINUTES || '60', 10)
};

// Redis configuration
export const REDIS_CONFIG = {
  // Redis connection URL
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  // Redis key prefix for cache
  keyPrefix: process.env.REDIS_CACHE_PREFIX || 'tax_qa:',
  // Enable Redis caching (default: true)
  enabled: process.env.REDIS_ENABLED !== 'false'
}; 