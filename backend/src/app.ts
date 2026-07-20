import express from 'express';
import cors from 'cors';
import { prisma } from './utils/prisma';
import { logger } from './config/logger';
import { newsRouter } from './routes/news.routes';
import { errorHandler } from './middlewares/errorHandler.middleware';
import dotenv from "dotenv";
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: 'UP',
      timestamp: new Date(),
    });
  } catch (error: any) {
    logger.error(`Health check failed: ${error.message}`);

    res.status(500).json({
      status: 'DOWN',
      error: 'Database context unreachable',
    });
  }
});

// Routes
app.use('/api/news', newsRouter);

// Error Handler (must be last)
app.use(errorHandler);

export default app;