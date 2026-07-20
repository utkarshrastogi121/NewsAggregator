import "dotenv/config";

import app from "./app";
import { logger } from "./config/logger";
import { prisma } from "./utils/prisma";
import { initScheduler } from "./config/cron";
import { newsQueue } from "./queues/news.queue";


import "./queues/news.worker";
import { setupSwagger } from "./config/swagger";

const PORT = process.env.PORT || 3000;

setupSwagger(app);

setTimeout(async () => {
  console.log(await newsQueue.getJobCounts());

  const jobs = await newsQueue.getJobs([
    "waiting",
    "active",
    "completed",
    "failed",
  ]);

  console.log(
    jobs.map((j) => ({
      id: j.id,
      name: j.name,
      state: j.finishedOn ? "done" : "pending",
    }))
  );
}, 5000);

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