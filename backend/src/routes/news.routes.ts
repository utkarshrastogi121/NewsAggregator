import { Router } from 'express';
import { NewsController } from '../controllers/news.controller';
import { validate } from '../middlewares/validate.middleware';
import { GetNewsSchema, BookmarkArticleSchema } from '../validators/news.validator';

const router = Router();

router.get('/', validate(GetNewsSchema), NewsController.getArticles);
router.get('/trends', NewsController.getTrendingStories);
router.post('/:articleId/bookmark', validate(BookmarkArticleSchema), NewsController.toggleBookmark);

export const newsRouter = router;