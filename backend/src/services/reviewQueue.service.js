const { getReviewQueue } = require("../lib/queue");
const { usesReplyDelay } = require("./decisionEngine.service");
const { getReplyDelayMs } = require("./replyDelay.service");

/**
 * @param {{ reviewId: string, tenantId: string, rating: number, autoReply: boolean }} job
 */
async function enqueueReview(job) {
  const queue = getReviewQueue();
  const useDelay = usesReplyDelay(job.rating, job.autoReply);
  const delay = useDelay ? getReplyDelayMs() : 0;

  return queue.add(
    "process-review",
    {
      reviewId: job.reviewId,
      tenantId: job.tenantId,
    },
    {
      jobId: `review-${job.reviewId}`,
      delay,
    }
  );
}

async function enqueuePendingReviews(reviews, tenant) {
  const results = [];

  for (const review of reviews) {
    const autoReply = tenant.auto_reply_enabled !== false;
    try {
      const job = await enqueueReview({
        reviewId: review.id,
        tenantId: review.tenant_id,
        rating: review.rating,
        autoReply,
      });
      results.push({ reviewId: review.id, jobId: job.id, queued: true });
    } catch (err) {
      if (err.message?.includes("Job already exists")) {
        results.push({ reviewId: review.id, queued: false, reason: "already_queued" });
      } else {
        results.push({ reviewId: review.id, queued: false, error: err.message });
      }
    }
  }

  return results;
}

module.exports = { enqueueReview, enqueuePendingReviews, getReplyDelayMs };
