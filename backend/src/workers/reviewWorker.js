require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });

const { Worker } = require("bullmq");
const { createRedisConnection } = require("../lib/redis");
const { REVIEW_QUEUE_NAME } = require("../lib/queue");
const reviewProcessorService = require("../services/reviewProcessor.service");

const concurrency = parseInt(process.env.WORKER_CONCURRENCY || "3", 10);

function startWorker() {
  const worker = new Worker(
    REVIEW_QUEUE_NAME,
    async (job) => {
      const { reviewId, tenantId } = job.data;
      console.log(`[worker] Processing review ${reviewId} (tenant ${tenantId})`);

      const result = await reviewProcessorService.processReview(reviewId);

      console.log(`[worker] Review ${reviewId}: ${result.action || result.reason}`);
      return result;
    },
    {
      connection: createRedisConnection(),
      concurrency,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[worker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[worker] Job ${job?.id} failed:`, err.message);
  });

  console.log(`[worker] Listening on queue "${REVIEW_QUEUE_NAME}" (concurrency: ${concurrency})`);
  return worker;
}

if (require.main === module) {
  startWorker();
}

module.exports = { startWorker };
