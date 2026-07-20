import { prisma } from "../utils/prisma";
import { redis } from "../config/redis";
import { logger } from "../config/logger";
import { geminiModel } from "../config/gemini";
import { GetNewsInput } from "../validators/news.validator";

export class NewsService {
  /**
   * Retrieves paginated articles with filtering, searching and sorting.
   */
  static async getArticles(filters: GetNewsInput["query"]) {
    const { page, limit, search, category, sortBy, order } = filters;

    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (category) {
      whereClause.category = {
        name: {
          equals: category,
          mode: "insensitive",
        },
      };
    }

    if (search) {
      whereClause.OR = [
        {
          title: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          content: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    const [articles, totalItems] = await Promise.all([
      prisma.article.findMany({
        where: whereClause,
        skip,
        take: limit,

        orderBy: {
          [sortBy]: order,
        },

        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },

          eventGroup: {
            select: {
              id: true,
              commonTopic: true,
            },
          },
        },
      }),

      prisma.article.count({
        where: whereClause,
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      articles,

      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Toggle bookmark for authenticated user.
   */
  static async toggleBookmark(articleId: string, userId: string) {
    const article = await prisma.article.findUnique({
      where: {
        id: articleId,
      },
    });

    if (!article) {
      const error: any = new Error("Article not found.");

      error.statusCode = 404;

      throw error;
    }

    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        userId_articleId: {
          userId,
          articleId,
        },
      },
    });

    // Remove bookmark
    if (existingBookmark) {
      await prisma.bookmark.delete({
        where: {
          userId_articleId: {
            userId,
            articleId,
          },
        },
      });

      return {
        bookmarked: false,

        message: "Bookmark removed successfully.",
      };
    }

    // Create bookmark
    await prisma.bookmark.create({
      data: {
        userId,

        articleId,
      },
    });

    return {
      bookmarked: true,

      message: "Bookmark added successfully.",
    };
  }

  /**
   * Fetch trending clustered stories with Redis caching.
   */
  static async getTrendingStories() {
    const cacheKey = "news:trends:summary";

    // Check Redis cache
    try {
      const cachedData = await redis.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData);
      }
    } catch (err) {
      logger.warn(
        "Failed to fetch trending stories from Redis cache layer.",
        err,
      );
    }

    const trends = await prisma.eventGroup.findMany({
      orderBy: {
        updatedAt: "desc",
      },

      take: 10,

      include: {
        articles: {
          take: 5,

          orderBy: {
            publishedAt: "desc",
          },

          select: {
            id: true,

            title: true,

            url: true,

            source: true,

            publishedAt: true,
          },
        },

        comparisonSummary: true,
      },
    });

    // Save to Redis cache
    try {
      await redis.set(cacheKey, JSON.stringify(trends), "EX", 300);
    } catch (err) {
      logger.error(
        "Failed to commit generated trending stories layout to Redis cache.",
        err,
      );
    }

    return trends;
  }

  static async getArticleSummary(articleId: string): Promise<string> {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      const error: any = new Error("Article not found.");
      error.statusCode = 404;
      throw error;
    }

    // Return the summary if it has already been generated and saved
    if (article.summary) {
      return article.summary;
    }

    logger.info(`Generating AI summary for article ID: ${articleId}`);

    const response = await geminiModel.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Summarize the following news article in 3-4 clear bullet points focusing purely on key facts:\n\n${article.content}`,
    });

    const generatedSummary = response.text || "Summary generation failed.";

    // Save the summary directly to the database record
    await prisma.article.update({
      where: { id: articleId },
      data: { summary: generatedSummary },
    });

    return generatedSummary;
  }

  /**
   * Fetch or generate a structural cross-site comparison of articles within an EventGroup.
   */
  static async getEventGroupComparison(eventGroupId: string) {
    // 1. Check if comparison summary already exists in DB
    const existingSummary = await prisma.comparisonSummary.findUnique({
      where: { eventGroupId },
    });

    if (existingSummary) {
      return existingSummary;
    }

    // 2. Fetch the cluster group along with all its scraped articles
    const eventGroup = await prisma.eventGroup.findUnique({
      where: { id: eventGroupId },
      include: { articles: true },
    });

    if (!eventGroup) {
      const error: any = new Error("Event group cluster not found.");
      error.statusCode = 404;
      throw error;
    }

    if (eventGroup.articles.length < 2) {
      const error: any = new Error(
        "Not enough sources scraped in this cluster to build a comparison.",
      );
      error.statusCode = 400;
      throw error;
    }

    logger.info(
      `Generating AI cluster comparison for event group ID: ${eventGroupId}`,
    );

    // Format scraped text entries for the system prompt context window
    const articlesText = eventGroup.articles
      .map((art, index) => {
        return `--- Article ${index + 1} ---\nSource: ${art.source}\nTitle: ${art.title}\nContent: ${art.content}\n`;
      })
      .join("\n");

    const prompt = `
      You are an expert media analyst. Analyze the following articles covering the same news event from different sources.
      
      Respond STRICTLY with a valid JSON object matching this structural layout. Do not include markdown wraps like \`\`\`json.
      
      {
        "commonFacts": "A comprehensive summary paragraph listing facts all sources agree upon.",
        "differences": "Bullet points contrasting details that one source added while another omitted.",
        "sourceHighlights": "A breakdown of tone, bias, or unique framing present in individual publishers."
      }

      Articles data:
      ${articlesText}
    `;

    const response = await geminiModel.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const resultJSON = JSON.parse(response.text || "{}");

    // 3. Write structured records back to the ComparisonSummary layout
    const savedSummary = await prisma.comparisonSummary.create({
      data: {
        eventGroupId,
        commonFacts: resultJSON.commonFacts || "N/A",
        differences: resultJSON.differences || "N/A",
        sourceHighlights: resultJSON.sourceHighlights || "N/A",
      },
    });

    // Clear the main trends cache to force it to pick up the newly generated comparison data
    try {
      await redis.del("news:trends:summary");
    } catch (err) {
      logger.warn(
        "Failed to invalidate trending stories cache after creating comparison.",
        err,
      );
    }

    return savedSummary;
  }
}
