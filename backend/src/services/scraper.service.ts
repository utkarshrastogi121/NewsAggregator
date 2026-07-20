import puppeteer, { Browser } from 'puppeteer';
import { logger } from '../config/logger.js';

export interface RawScrapedArticle {
  title: string;
  content: string;
  url: string;
  publisher: string;
  imageUrl?: string;
  publishedAt?: Date;
}

export class ScraperService {
  /**
   * Orchestrates the extraction workflow for a target publisher profile.
   */
  static async scrapeFeed(publisherName: string, targetUrl: string): Promise<RawScrapedArticle[]> {
    let browser: Browser | null = null;
    const articles: RawScrapedArticle[] = [];

    try {
      logger.info(`Starting target ingestion for publisher: [${publisherName}] at ${targetUrl}`);

      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      
      await page.setDefaultNavigationTimeout(30000);
      await page.setRequestInterception(true);
      
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (resourceType === 'image' || resourceType === 'stylesheet' || resourceType === 'font') {
          req.abort();
        } else {
          req.continue();
        }
      });

      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      );

      await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

      // Semantic extraction logic matching standard architectural layout feeds
      const elements = await page.evaluate((pubName) => {
        const items: Array<{ title: string; url: string; content: string }> = [];
        // Generic selector framework looking for common article components
        const blocks = document.querySelectorAll('article, .story, .post-item, h2 a');
        
        blocks.forEach((el) => {
          const anchor = el.tagName === 'A' ? (el as HTMLAnchorElement) : el.querySelector('a');
          const titleText = el.textContent?.trim() || '';
          
          if (anchor && anchor.href && titleText.length > 10) {
            items.push({
              title: titleText.split('\n')[0].trim(),
              url: anchor.href,
              content: 'Pending deep background text extraction layer synthesis.'
            });
          }
        });

        return items.slice(0, 10); // Throttle ingestion batches to 10 nodes per cycle
      }, publisherName);

      for (const item of elements) {
        articles.push({
          title: item.title,
          content: item.content,
          url: item.url,
          publisher: publisherName,
          publishedAt: new Date()
        });
      }

      logger.info(`Successfully completed ingestion profile for [${publisherName}]. Extracted ${articles.length} candidates.`);
    } catch (error: any) {
      logger.error(`Scraper execution cycle collapsed on target [${publisherName}]: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    return articles;
  }
}