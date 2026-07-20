import { Worker, Job } from 'bullmq';
import { redisConnectionOptions } from './queue.config';
import { ScraperService, RawScrapedArticle } from '../services/scraper.service';
import { ClusteringService } from '../services/clustering.service';
import { AIService } from '../services/ai.service';
import { NEWS_JOBS, ScrapeJobPayload, SynthesizeJobPayload, NewsQueueProducer } from './news.queue';
import { prisma } from '../utils/prisma';
import { logger } from '../config/logger';

export const newsWorker = new Worker(
  'news-processing-queue',
  async (job: Job) => {
    logger.info(`Worker picked up job [${job.id}] - Action type: [${job.name}]`);

    switch (job.name) {
      case NEWS_JOBS.SCRAPE_FEED: {
        const { publisherName, targetUrl } = job.data as ScrapeJobPayload;
        const scrapedItems: RawScrapedArticle[] = await ScraperService.scrapeFeed(publisherName, targetUrl);

        for (const item of scrapedItems) {
          try {
            // Check if the URL already exists before creating a new article record
            const existing = await prisma.article.findUnique({
              where: { url: item.url }
            });

            if (existing) continue;

            const savedArticle = await prisma.article.create({
              data: {
                title: item.title,
                content: item.content,
                url: item.url,
                publisher: item.publisher,
                publishedAt: item.publishedAt || new Date()
              }
            });

            // Immediately pipe the newly saved article record into the grouping pipeline
            await ClusteringService.clusterArticle(savedArticle);

            // Re-fetch the article to locate its assigned EventGroup context identifier
            const updatedArticle = await prisma.article.findUnique({
              where: { id: savedArticle.id },
              select: { eventGroupId: true }
            });

            if (updatedArticle?.eventGroupId) {
              // Trigger a synthesis job to update the group metrics
              await NewsQueueProducer.addSynthesisJob({
                eventGroupId: updatedArticle.eventGroupId
              });
            }
          } catch (innerError: any) {
            logger.error(`Failed to process crawled article node [${item.url}]: ${innerError.message}`);
          }
        }
        break;
      }

      case NEWS_JOBS.SYNTHESIZE_TRENDS: {
        const { eventGroupId } = job.data as SynthesizeJobPayload;
        await AIService.synthesizeEventGroup(eventGroupId);
        break;
      }

      default:
        logger.warn(`Worker received unhandled job action classification signature: [${job.name}]`);
    }
  },
  {
    connection: redisConnectionOptions,
    concurrency: 2 // Limits local Chromium browser allocations to protect server resources
  }
);

// Global operational lifecycle telemetry hooks
newsWorker.on('completed', (job) => {
  logger.info(`Job [${job.id}] completed successfully.`);
});

newsWorker.on('failed', (job, err) => {
  logger.error(`Job [${job?.id}] collapsed during processing lifecycle: ${err.message}`);
});