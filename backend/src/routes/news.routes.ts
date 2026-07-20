import { Router } from "express";
import { NewsController } from "../controllers/news.controller";
import { validate } from "../middlewares/validate.middleware";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  GetNewsSchema,
  BookmarkArticleSchema,
} from "../validators/news.validator";

const router = Router();

// Public routes
router.get(
  "/",
  validate(GetNewsSchema),
  NewsController.getArticles
);

router.get(
  "/trends",
  NewsController.getTrendingStories
);

// Protected route
router.post(
  "/:articleId/bookmark",
  authMiddleware,
  validate(BookmarkArticleSchema),
  NewsController.toggleBookmark
);

export const newsRouter = router;