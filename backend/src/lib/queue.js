const { Queue } = require("bullmq");
const { createRedisConnection } = require("./redis");

const REVIEW_QUEUE_NAME = "review-processing";

let reviewQueue;

function getReviewQueue() {
  if (!reviewQueue) {
    reviewQueue = new Queue(REVIEW_QUEUE_NAME, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return reviewQueue;
}

module.exports = { getReviewQueue, REVIEW_QUEUE_NAME };
