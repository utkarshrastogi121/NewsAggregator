import { prisma } from '../utils/prisma';
import { redis } from '../config/redis';
import { logger } from '../config/logger';
import { GetNewsInput, BookmarkArticleInput } from '../validators/news.validator';

export class NewsService {
  /**
   * Retrieves paginated articles using complex multi-dimensional filtering,
   * searching titles and content, sorting dynamically, and including category payloads.
   */
  static async getArticles(filters: GetNewsInput['query']) {
    const { page, limit, search, category, sortBy, order } = filters;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (category) {
      whereClause.category = {
        name: { equals: category, mode: 'insensitive' }
      };
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Run matching and absolute counts concurrently to optimize response time
    const [articles, totalItems] = await Promise.all([
      prisma.article.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
        include: {
          category: { select: { id: true, name: true } },
          eventGroup: { select: { id: true, title: true } }
        }
      }),
      prisma.article.count({ where: whereClause })
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
        hasPreviousPage: page > 1
      }
    };
  }

  /**
   * Toggles bookmarking state for a given article under a mocked user context.
   */
  static async toggleBookmark(articleId: string, userId: string = '00000000-0000-0000-0000-000000000000') {
    const article = await prisma.article.findUnique({
      where: { id: articleId }
    });

    if (!article) {
      const error: any = new Error('Article not found.');
      error.statusCode = 404;
      throw error;
    }

    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        userId_articleId: { userId, articleId }
      }
    });

    if (existingBookmark) {
      await prisma.bookmark.delete({
        where: {
          userId_articleId: { userId, articleId }
        }
      });
      return { bookmarked: false, message: 'Bookmark removed successfully.' };
    }

    await prisma.bookmark.create({
      data: { userId, articleId }
    });
    return { bookmarked: true, message: 'Bookmark added successfully.' };
  }

  /**
   * Fetches clustered story trends along with their cross-publisher structural summaries.
   */
  static async getTrendingStories() {
    const cacheKey = 'news:trends:summary';
    
    // Quick performance check against the active Redis cache layer
    try {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
    } catch (err) {
      logger.warn('Failed to fetch trending stories from Redis cache layer.', err);
    }

    const trends = await prisma.eventGroup.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: {
        articles: {
          take: 5,
          orderBy: { publishedAt: 'desc' },
          select: {
            id: true,
            title: true,
            url: true,
            source: true,
            publishedAt: true
          }
        },
        comparisonSummary: true
      }
    });

    // Populate data into the engine cache for a fast 5-minute time-to-live window
    try {
      await redis.set(cacheKey, JSON.stringify(trends), 'EX', 300);
    } catch (err) {
      logger.error('Failed to commit generated trending stories layout to Redis cache.', err);
    }

    return trends;
  }
}