import cron from 'node-cron';
import { NewsQueueProducer } from '../queues/news.queue';
import { logger } from './logger';

// Structured seeding matrix containing production target feeds
const CRAWL_TARGETS = [
  { name: 'TechCrunch', url: 'https://techcrunch.com/' },
  { name: 'The Verge', url: 'https://www.theverge.com/' },
  { name: 'Wired', url: 'https://www.wired.com/' }
];

/**
 * Initializes and registers recurring scheduling jobs.
 */
export function initScheduler(): void {
  logger.info('Initializing background cron scheduling tasks...');

  // Dispatches ingestion pipelines every 30 minutes (* = minutes, hours, day of month, month, day of week)
  cron.schedule('*/30 * * * *', async () => {
    logger.info('CRON: Triggering automated multi-publisher scraping sweep...');
    
    for (const target of CRAWL_TARGETS) {
      try {
        await NewsQueueProducer.addScrapeJob({
          publisherName: target.name,
          targetUrl: target.url
        });
      } catch (error: any) {
        logger.error(`CRON: Failed to enqueue target execution block for [${target.name}]: ${error.message}`);
      }
    }
  });

  logger.info('Cron Scheduler successfully bound to execution loop.');
}