import { Router } from 'express';
import { NewsController } from '../controllers/news.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { GetNewsSchema, BookmarkArticleSchema } from '../validators/news.validator.js';

const router = Router();

router.get('/', validate(GetNewsSchema), NewsController.getArticles);
router.get('/trends', NewsController.getTrendingStories);
router.post('/:articleId/bookmark', validate(BookmarkArticleSchema), NewsController.toggleBookmark);

export const newsRouter = router;