import { prisma } from '../utils/prisma.js';
import { calculateSimilarity } from '../utils/textSimilarity.js';
import { logger } from '../config/logger.js';
import { Article } from '@prisma/client';

export class ClusteringService {
  private static readonly SIMILARITY_THRESHOLD = 0.35;

  /**
   * Processes a newly ingested article by evaluating it against active story groups
   * or generating a fresh tracking cluster if no match is found.
   */
  static async clusterArticle(article: Article): Promise<void> {
    try {
      // Fetch event groups that received updates within the last 24 hours
      const aDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const activeGroups = await prisma.eventGroup.findMany({
        where: {
          updatedAt: { gte: aDayAgo }
        },
        include: {
          articles: {
            take: 1,
            orderBy: { publishedAt: 'desc' }
          }
        }
      });

      let matchedGroupId: string | null = null;
      let highestScore = 0;

      for (const group of activeGroups) {
        const primaryArticle = group.articles[0];
        if (!primaryArticle) continue;

        // Run comparison matrices against titles
        const score = calculateSimilarity(article.title, primaryArticle.title);

        if (score > this.SIMILARITY_THRESHOLD && score > highestScore) {
          highestScore = score;
          matchedGroupId = group.id;
        }
      }

      if (matchedGroupId) {
        // Link article to the identified group and bump the modification timestamp
        await prisma.article.update({
          where: { id: article.id },
          data: { eventGroupId: matchedGroupId }
        });

        await prisma.eventGroup.update({
          where: { id: matchedGroupId },
          data: { updatedAt: new Date() }
        });

        logger.info(`Article [${article.id}] clustered into existing group [${matchedGroupId}] (Score: ${highestScore.toFixed(2)})`);
      } else {
        // Build a fresh event tracking group seeded with the current article title
        const newGroup = await prisma.eventGroup.create({
          data: {
            title: article.title,
            updatedAt: new Date()
          }
        });

        await prisma.article.update({
          where: { id: article.id },
          data: { eventGroupId: newGroup.id }
        });

        logger.info(`No matching trend context found. Created new EventGroup [${newGroup.id}] for article [${article.id}].`);
      }
    } catch (error: any) {
      logger.error(`Clustering service tracking failed for article [${article.id}]: ${error.message}`);
      throw error;
    }
  }
}