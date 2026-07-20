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
 * tags:
 *   name: News
 *   description: News aggregation APIs
 */


/**
 * @swagger
 * /api/news:
 *   get:
 *     summary: Get all news articles
 *     tags:
 *       - News
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
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
 *         description: Trending stories fetched successfully
 */
router.get(
  "/trends",
  NewsController.getTrendingStories
);


/**
 * @swagger
 * /api/news/compare/{eventGroupId}:
 *   get:
 *     summary: Compare coverage of an event across different sources
 *     tags:
 *       - News
 *     parameters:
 *       - in: path
 *         name: eventGroupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coverage comparison fetched successfully
 *       404:
 *         description: Event group not found
 */
router.get(
  "/compare/:eventGroupId",
  NewsController.getCoverageComparison
);


/**
 * @swagger
 * /api/news/{articleId}/summary:
 *   get:
 *     summary: Get AI generated article summary
 *     tags:
 *       - News
 *     parameters:
 *       - in: path
 *         name: articleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Article summary fetched successfully
 *       404:
 *         description: Article not found
 */
router.get(
  "/:articleId/summary",
  NewsController.getArticleSummary
);


/**
 * @swagger
 * /api/news/{articleId}/bookmark:
 *   post:
 *     summary: Toggle bookmark for an article
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
 *         description: Bookmark toggled successfully
 *       401:
 *         description: Unauthorized - JWT required
 *       404:
 *         description: Article not found
 */
router.post(
  "/:articleId/bookmark",
  authMiddleware,
  validate(BookmarkArticleSchema),
  NewsController.toggleBookmark
);


export const newsRouter = router;