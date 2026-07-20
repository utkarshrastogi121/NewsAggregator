import { Redis } from 'ioredis';
import { logger } from './logger';

export const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

redis.on('connect', () => {
  logger.info('Successfully connected to Redis server');
});

redis.on('ready', () => {
  logger.info('Redis client ready');
});

redis.on('error', (error) => {
  logger.error('Redis connection error:', error.message);
});