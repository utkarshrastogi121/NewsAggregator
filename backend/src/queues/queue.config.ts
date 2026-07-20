import { ConnectionOptions } from 'bullmq';

export const redisConnectionOptions: ConnectionOptions = {
  url: process.env.REDIS_URL,
  maxRetriesPerRequest: null, // Required by BullMQ
  connectTimeout: 10000,
  disconnectTimeout: 2000,
};

export const defaultQueueJobOptions = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 5000, // Initiates retry logic starting at a 5-second interval
    },
    removeOnComplete: {
      age: 3600,  // Retains successful records for 1 hour to aid tracking
      count: 100,
    },
    removeOnFail: {
      age: 86400,  // Retains failed telemetry traces for 24 hours to support inspection
      count: 500,
    },
  },
};