import logger from '../utils/logger';
import { AskResponse } from '../types';
import { CACHE_CONFIG, REDIS_CONFIG } from '../config';
import { getRedisClient, formatRedisKey } from './redis';
import { createHash } from 'crypto';

// Cache statistics for monitoring
interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

/**
 * Question cache service with Redis persistence
 */
export class QuestionCache {
  private readonly maxSize: number;
  private readonly ttl: number; // Time to live in seconds
  private stats: CacheStats;
  private readonly useRedis: boolean;

  /**
   * Create a new question cache
   * @param maxSize Maximum number of entries to store
   * @param ttlMinutes Time to live in minutes
   */
  constructor(maxSize = CACHE_CONFIG.maxSize, ttlMinutes = CACHE_CONFIG.ttlMinutes) {
    this.maxSize = maxSize;
    this.ttl = ttlMinutes * 60; // Convert to seconds for Redis
    this.useRedis = REDIS_CONFIG.enabled;
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0
    };
    
    logger.info(`Question cache initialized with size=${maxSize}, TTL=${ttlMinutes} minutes, Redis=${this.useRedis}`);
  }

  /**
   * Hash the question to use as a key
   * @param question The question to hash
   * @returns Hashed question
   */
  private hashQuestion(question: string): string {
    // Normalize question first
    const normalized = this.normalizeQuestion(question);
    // Then create an MD5 hash (suitable for Redis keys)
    return createHash('md5').update(normalized).digest('hex');
  }

  /**
   * Get an entry from the cache
   * @param question The question to look up
   * @returns The cached response or undefined if not found or expired
   */
  async get(question: string): Promise<AskResponse | undefined> {
    const key = this.hashQuestion(question);
    
    try {
      if (this.useRedis) {
        // Get from Redis
        const redis = getRedisClient();
        const data = await redis.get(formatRedisKey(key));
        
        if (data) {
          this.stats.hits++;
          const response = JSON.parse(data) as AskResponse;
          logger.debug(`Redis cache hit for question: ${question.substring(0, 50)}...`);
          return response;
        }
      }
      
      // Not found or Redis disabled
      this.stats.misses++;
      return undefined;
    } catch (error) {
      logger.error('Error getting from cache:', error);
      this.stats.misses++;
      return undefined;
    }
  }

  /**
   * Store a response in the cache
   * @param question The question being answered
   * @param response The response to cache
   */
  async set(question: string, response: AskResponse): Promise<void> {
    const key = this.hashQuestion(question);
    
    try {
      if (this.useRedis) {
        const redis = getRedisClient();
        
        // Cache in Redis with TTL
        await redis.setEx(
          formatRedisKey(key),
          this.ttl,
          JSON.stringify(response)
        );
        
        // Update size estimate by getting all keys with our prefix
        const keys = await redis.keys(`${REDIS_CONFIG.keyPrefix}*`);
        this.stats.size = keys.length;
        
        logger.debug(`Cached response in Redis for question: ${question.substring(0, 50)}...`);
      }
    } catch (error) {
      logger.error('Error setting cache:', error);
    }
  }

  /**
   * Normalize question to improve cache hit rate
   * - Converts to lowercase
   * - Trims whitespace
   * - Removes extra spaces
   * @param question The question to normalize
   * @returns The normalized question
   */
  private normalizeQuestion(question: string): string {
    return question
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * Get cache statistics
   * @returns Current cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      if (this.useRedis) {
        // Update size count from Redis
        const redis = getRedisClient();
        const keys = await redis.keys(`${REDIS_CONFIG.keyPrefix}*`);
        this.stats.size = keys.length;
      }
    } catch (error) {
      logger.error('Error getting cache stats:', error);
    }
    
    return { ...this.stats };
  }

  /**
   * Clear the entire cache
   */
  async clear(): Promise<void> {
    try {
      if (this.useRedis) {
        const redis = getRedisClient();
        // Find all keys with our prefix
        const keys = await redis.keys(`${REDIS_CONFIG.keyPrefix}*`);
        
        if (keys.length > 0) {
          // Delete all matching keys
          await redis.del(keys);
          this.stats.size = 0;
          logger.info(`Cleared ${keys.length} entries from Redis cache`);
        }
      }
    } catch (error) {
      logger.error('Error clearing cache:', error);
    }
  }
}

// Create singleton instance
export const questionCache = new QuestionCache(); 