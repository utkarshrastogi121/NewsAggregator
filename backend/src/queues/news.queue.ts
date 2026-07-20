import { Queue } from 'bullmq';
import { redisConnection, defaultQueueJobOptions } from './queue.config';
import { logger } from '../config/logger';

// Define strict string literals for job names to prevent typos across producers and consumers
export const NEWS_JOBS = {
  SCRAPE_FEED: 'news:scrape-feed',
  SYNTHESIZE_TRENDS: 'news:synthesize-trends',
} as const;

export interface ScrapeJobPayload {
  publisherName: string;
  targetUrl: string;
}

export interface SynthesizeJobPayload {
  eventGroupId: string;
}

// Instantiate the primary news execution queue channel
export const newsQueue = new Queue('news-processing-queue', {
  connection: redisConnection,
  ...defaultQueueJobOptions,
});
console.log("QUEUE NAME:", newsQueue.name);

export class NewsQueueProducer {
  /**
   * Enqueues a single target publisher ingestion workflow.
   */
  static async addScrapeJob(payload: ScrapeJobPayload): Promise<void> {
    try {
      const jobName = `${NEWS_JOBS.SCRAPE_FEED}:${payload.publisherName.toLowerCase().replace(/\s+/g, '-')}`;
      
      await newsQueue.add(NEWS_JOBS.SCRAPE_FEED, payload);
      
      logger.info(`Successfully dispatched scrape job for [${payload.publisherName}] to background worker.`);
    } catch (error: any) {
      logger.error(`Failed to enqueue scraper payload for [${payload.publisherName}]: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enqueues an AI synthesis analysis cycle for a given event tracking group.
   */
  static async addSynthesisJob(payload: SynthesizeJobPayload): Promise<void> {
    try {
      await newsQueue.add(NEWS_JOBS.SYNTHESIZE_TRENDS, payload, {
        // Delay synthesis slightly to allow multi-publisher scraping streams to finish landing in the DB
        delay: 5000, 
      });
      
      logger.info(`Successfully dispatched AI synthesis job for EventGroup [${payload.eventGroupId}] to background worker.`);
    } catch (error: any) {
      logger.error(`Failed to enqueue synthesis job for EventGroup [${payload.eventGroupId}]: ${error.message}`);
      throw error;
    }
  }
}