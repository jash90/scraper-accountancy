import { createClient, RedisClientType, RedisClientOptions } from 'redis';
import logger from '../utils/logger';

// Default Redis config
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_CACHE_PREFIX = process.env.REDIS_CACHE_PREFIX || 'tax_qa:';

// Redis client - use 'any' for the modules type to avoid complex generic issues
let redisClient: RedisClientType<any> | null = null;

/**
 * Initialize Redis client
 */
export async function initRedis(): Promise<RedisClientType<any>> {
  if (redisClient !== null) {
    return redisClient;
  }

  const client = createClient({ 
    url: REDIS_URL 
  });

  // Handle connection events
  client.on('error', (err) => {
    logger.error('Redis error:', err);
  });

  client.on('connect', () => {
    logger.info('Redis connected');
  });

  client.on('reconnecting', () => {
    logger.info('Redis reconnecting');
  });

  client.on('ready', () => {
    logger.info('Redis ready');
  });

  // Connect to Redis
  try {
    await client.connect();
    // Store the client with explicit type casting
    redisClient = client as RedisClientType<any>;
    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

/**
 * Get Redis client
 * @returns Connected Redis client or throws if not initialized
 */
export function getRedisClient(): RedisClientType<any> {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initRedis() first.');
  }
  return redisClient;
}

/**
 * Shutdown Redis client
 */
export async function shutdownRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}

/**
 * Format Redis key with prefix
 * @param key Base key
 * @returns Prefixed key
 */
export function formatRedisKey(key: string): string {
  return `${REDIS_CACHE_PREFIX}${key}`;
} 