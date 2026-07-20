import { Worker, Job } from 'bullmq';
import { redisConnection } from './queue.config';
import { ScraperService, RawScrapedArticle } from '../services/scraper.service';
import { ClusteringService } from '../services/clustering.service';
import { AIService } from '../services/ai.service';
import {
  NEWS_JOBS,
  ScrapeJobPayload,
  SynthesizeJobPayload,
  NewsQueueProducer
} from './news.queue';
import { prisma } from '../utils/prisma';
import { logger } from '../config/logger';

export const newsWorker = new Worker(
  'news-processing-queue',
  async (job: Job) => {
    logger.info(`Worker picked up job [${job.id}] - Action type: [${job.name}]`);

    switch (job.name) {
      case NEWS_JOBS.SCRAPE_FEED: {
        const { publisherName, targetUrl } = job.data as ScrapeJobPayload;

        const scrapedItems: RawScrapedArticle[] =
          await ScraperService.scrapeFeed(publisherName, targetUrl);

        for (const item of scrapedItems) {
          try {
            // Check if article already exists
            const existing = await prisma.article.findUnique({
              where: { url: item.url }
            });

            if (existing) continue;

            // Create or reuse default category
            const category = await prisma.category.upsert({
              where: {
                slug: 'general'
              },
              update: {},
              create: {
                name: 'General',
                slug: 'general'
              }
            });

            // Create article with required category relation
            const savedArticle = await prisma.article.create({
              data: {
                title: item.title,
                content: item.content,
                url: item.url,
                source: item.publisher,
                publishedAt: item.publishedAt || new Date(),

                category: {
                  connect: {
                    id: category.id
                  }
                }
              }
            });

            logger.info(
              `Article created successfully: ${savedArticle.id}`
            );

            // Cluster article into an existing/new event group
            await ClusteringService.clusterArticle(savedArticle);

            // Fetch assigned event group
            const updatedArticle = await prisma.article.findUnique({
              where: {
                id: savedArticle.id
              },
              select: {
                eventGroupId: true
              }
            });

            // Trigger AI synthesis
            if (updatedArticle?.eventGroupId) {
              await NewsQueueProducer.addSynthesisJob({
                eventGroupId: updatedArticle.eventGroupId
              });
            }

          } catch (innerError: any) {
            logger.error(
              `Failed to process crawled article node [${item.url}]: ${innerError.message}`
            );
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
        logger.warn(
          `Worker received unhandled job action classification signature: [${job.name}]`
        );
    }
  },
  {
    connection: redisConnection,
    concurrency: 2
  }
);


// Worker lifecycle logs
newsWorker.on('completed', (job) => {
  logger.info(`Job [${job.id}] completed successfully.`);
});


newsWorker.on('failed', (job, err) => {
  logger.error(
    `Job [${job?.id}] failed during processing: ${err.message}`
  );
});