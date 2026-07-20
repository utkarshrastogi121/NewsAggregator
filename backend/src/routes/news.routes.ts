import { Router } from "express";
import { NewsController } from "../controllers/news.controller";
import { validate } from "../middlewares/validate.middleware";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  GetNewsSchema,
  BookmarkArticleSchema,
} from "../validators/news.validator";

const router = Router();


/**
 * @swagger
 * /api/news:
 *   get:
 *     summary: Get all news articles
 *     tags:
 *       - News
 *     responses:
 *       200:
 *         description: Successfully fetched articles
 */
router.get(
  "/",
  validate(GetNewsSchema),
  NewsController.getArticles
);


/**
 * @swagger
 * /api/news/trends:
 *   get:
 *     summary: Get trending news stories
 *     tags:
 *       - News
 *     responses:
 *       200:
 *         description: Trending stories fetched
 */
router.get(
  "/trends",
  NewsController.getTrendingStories
);


/**
 * @swagger
 * /api/news/{articleId}/bookmark:
 *   post:
 *     summary: Bookmark an article
 *     tags:
 *       - News
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: articleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bookmark toggled
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/:articleId/bookmark",
  authMiddleware,
  validate(BookmarkArticleSchema),
  NewsController.toggleBookmark
);


export const newsRouter = router;