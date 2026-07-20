import cron from "node-cron";
import { NewsQueueProducer } from "../queues/news.queue";
import { logger } from "./logger";

// Publishers to scrape
const CRAWL_TARGETS = [
  {
    name: "TechCrunch",
    url: "https://techcrunch.com/",
  },
  {
    name: "The Verge",
    url: "https://www.theverge.com/",
  },
  {
    name: "Wired",
    url: "https://www.wired.com/",
  },
];

/**
 * Enqueues scrape jobs for all configured publishers.
 */
async function triggerScraping(): Promise<void> {
  logger.info("CRON: Triggering automated multi-publisher scraping sweep...");

  for (const target of CRAWL_TARGETS) {
    try {
      await NewsQueueProducer.addScrapeJob({
        publisherName: target.name,
        targetUrl: target.url,
      });

      logger.info(
        `Successfully dispatched scrape job for [${target.name}]`
      );
    } catch (error: any) {
      logger.error(
        `Failed to dispatch scrape job for [${target.name}]: ${error.message}`
      );
    }
  }

  logger.info("CRON: Scrape job dispatch completed.");
}

/**
 * Initializes the cron scheduler.
 */
export function initScheduler(): void {
  logger.info("Initializing background cron scheduling tasks...");

  // Trigger immediately when the server starts
  triggerScraping().catch((error) => {
    logger.error(
      `Initial scraping trigger failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  });

  // Schedule every 30 minutes
  cron.schedule("*/30 * * * *", async () => {
    await triggerScraping();
  });

  logger.info(
    "Cron Scheduler successfully initialized. Scraping scheduled every 30 minutes."
  );
}