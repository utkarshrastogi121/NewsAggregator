import "dotenv/config";

import app from "./app";
import { logger } from "./config/logger";
import { prisma } from "./utils/prisma";
import { initScheduler } from "./config/cron";

import "./queues/news.worker";
import { setupSwagger } from "./config/swagger";

const PORT = process.env.PORT || 3000;

setupSwagger(app);


async function startServer() {
  try {
    await prisma.$connect();
    logger.info("Database connected.");

    initScheduler();

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error: any) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

startServer();