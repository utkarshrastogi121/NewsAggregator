import { ConnectionOptions } from 'bullmq';
import { Redis } from 'ioredis';

export const redisConnection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  tls: {},
});

redisConnection.on('connect', () => {
  console.log('BullMQ Redis connected');
});

redisConnection.on('error', (err) => {
  console.log('BullMQ Redis error:', err);
});

export const redisConnectionOptions: ConnectionOptions = {
  connectionName: 'bullmq',
  maxRetriesPerRequest: null,
};

export const defaultQueueJobOptions = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 5000,
    },
    removeOnComplete: {
      age: 3600,
      count: 100,
    },
    removeOnFail: {
      age: 86400,
      count: 500,
    },
  },
};