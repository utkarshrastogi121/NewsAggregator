import { Request, Response, NextFunction } from 'express';
import { NewsService } from '../services/news.service';
import { GetNewsInput, BookmarkArticleInput } from '../validators/news.validator';

export class NewsController {
  static async getArticles(req: Request, res: Response, next: NextFunction): Promise<void> {
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

  static async toggleBookmark(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { articleId } = req.params as unknown as BookmarkArticleInput['params'];
      
      const mockUserId = '00000000-0000-0000-0000-000000000000';
      const result = await NewsService.toggleBookmark(articleId, mockUserId);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTrendingStories(req: Request, res: Response, next: NextFunction): Promise<void> {
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