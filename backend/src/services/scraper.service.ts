import puppeteer, { Browser } from "puppeteer";
import { logger } from "../config/logger";

export interface RawScrapedArticle {
  title: string;
  content: string;
  url: string;
  publisher: string;
  imageUrl?: string;
  publishedAt?: Date;
}

export class ScraperService {
  static async scrapeFeed(
    publisherName: string,
    targetUrl: string
  ): Promise<RawScrapedArticle[]> {
    let browser: Browser | null = null;

    try {
      logger.info(`Starting scraping: ${publisherName}`);

      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
        ],
      });

      const page = await browser.newPage();

      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
      );

      await page.goto(targetUrl, {
        waitUntil: "networkidle2",
        timeout: 60000,
      });

      await page.waitForSelector("body");

      const articles = await page.evaluate(() => {
        const results: any[] = [];

        const selectors = [
          "article a",
          "article h2 a",
          "article h3 a",
          ".post-block a",
          ".story a",
          ".river a",
          "main a",
        ];

        const visited = new Set<string>();

        selectors.forEach((selector) => {
          document.querySelectorAll(selector).forEach((element) => {
            const anchor = element as HTMLAnchorElement;

            const title =
              anchor.textContent?.trim() ||
              anchor.getAttribute("title") ||
              "";

            const url = anchor.href;

            if (
              title.length > 20 &&
              url &&
              url.startsWith("http") &&
              !visited.has(url)
            ) {
              visited.add(url);

              results.push({
                title,
                url,
              });
            }
          });
        });

        // fallback if nothing found
        if (results.length === 0) {
          document.querySelectorAll("a").forEach((element) => {
            const anchor = element as HTMLAnchorElement;

            const title = anchor.textContent?.trim() || "";
            const url = anchor.href;

            if (
              title.length > 30 &&
              url.startsWith("http") &&
              !visited.has(url)
            ) {
              visited.add(url);

              results.push({
                title,
                url,
              });
            }
          });
        }

        return results.slice(0, 10);
      });

      logger.info(
        `${publisherName}: Found ${articles.length} candidate articles`
      );

      return articles.map((article) => ({
        title: article.title,
        url: article.url,
        publisher: publisherName,
        content: article.title,
        publishedAt: new Date(),
      }));
    } catch (err: any) {
      logger.error(`${publisherName} scraping failed: ${err.message}`);
      return [];
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}