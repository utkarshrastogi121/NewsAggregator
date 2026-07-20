import { Redis } from 'ioredis';
import { logger } from './logger.js';

export const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  retryStrategy(times: number) {
    return Math.min(times * 50, 2000);
  },
});

redis.on('connect', () => {
  logger.info('Successfully connected to Redis server');
});

redis.on('error', (error) => {
  logger.error('Redis connection error:', error);
});