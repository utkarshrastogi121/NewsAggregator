import { Redis } from 'ioredis';
import { logger } from './logger.js';

export const redisConnection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null, // Required for BullMQ
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redisConnection.on('connect', () => {
  logger.info('Successfully connected to Redis server');
});

redisConnection.on('error', (error) => {
  logger.error('Redis connection error:', error);
});