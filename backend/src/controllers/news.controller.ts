import { Response, NextFunction } from 'express';
import { NewsService } from '../services/news.service';
import { GetNewsInput, BookmarkArticleInput } from '../validators/news.validator';
import { AuthRequest } from '../middlewares/auth.middleware';

export class NewsController {

  static async getArticles(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const filters = req.query as unknown as GetNewsInput['query'];

      const data = await NewsService.getArticles(filters);

      res.status(200).json({
        status: 'success',
        data: data.articles,
        pagination: data.pagination,
      });

    } catch (error) {
      next(error);
    }
  }


  static async toggleBookmark(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { articleId } =
        req.params as unknown as BookmarkArticleInput['params'];

      // Get user id from JWT
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          message: "Unauthorized",
        });
        return;
      }

      const result = await NewsService.toggleBookmark(
        articleId,
        userId
      );

      res.status(200).json({
        status: 'success',
        data: result,
      });

    } catch (error) {
      next(error);
    }
  }


  static async getTrendingStories(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const trends = await NewsService.getTrendingStories();

      res.status(200).json({
        status: 'success',
        results: trends.length,
        data: trends,
      });

    } catch (error) {
      next(error);
    }
  }
}