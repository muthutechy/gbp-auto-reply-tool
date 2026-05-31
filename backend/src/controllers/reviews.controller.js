const reviewsService = require("../services/reviews.service");
const googleBusinessService = require("../services/googleBusiness.service");
const googleTokenService = require("../services/googleToken.service");
const { assertPolicyValid } = require("../services/policyEngine.service");
const { getReviewQueue } = require("../lib/queue");

async function list(req, res, next) {
  try {
    const tenantId = req.tenantId || req.user.tenantId;
    const localOnly = req.query.local === "true";

    if (!localOnly) {
      const connected = await googleTokenService.isConnected(tenantId);
      if (connected) {
        const reviews = await googleBusinessService.fetchAndSyncReviews(tenantId, req.user);
        return res.json({ reviews, source: "google" });
      }
    }

    const reviews = await reviewsService.listReviews({
      tenantId,
      status: req.query.status,
      rating: req.query.rating,
      dateFrom: req.query.date_from,
      dateTo: req.query.date_to,
      sentiment: req.query.sentiment,
    });
    res.json({ reviews, source: "database" });
  } catch (err) {
    next(err);
  }
}

async function postReply(req, res, next) {
  try {
    const reply = req.body.reply ?? req.body.final_reply;
    assertPolicyValid(reply);
    const review = await googleBusinessService.postReviewReply(req.params.id, reply, req.user);
    res.json({ review });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const review = await reviewsService.getReviewById(req.params.id);

    if (req.user.role !== "admin" && review.tenant_id !== req.user.tenantId) {
      const err = new Error("Access denied");
      err.status = 403;
      throw err;
    }

    res.json({ review });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const review = await reviewsService.createReview(req.body, req.user);

    const reviewQueue = getReviewQueue();
    await reviewQueue.add(
      "process-review",
      {
        reviewId: review.id,
        tenantId: review.tenant_id,
      },
      { jobId: `review-${review.id}` }
    );

    res.status(201).json({ review });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const review = await reviewsService.updateReview(req.params.id, req.body, req.user);
    res.json({ review });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await reviewsService.deleteReview(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function reject(req, res, next) {
  try {
    const review = await reviewsService.rejectReview(req.params.id, req.user);
    res.json({ review });
  } catch (err) {
    next(err);
  }
}

async function regenerate(req, res, next) {
  try {
    const review = await reviewsService.regenerateReview(req.params.id, req.user);
    res.json({ review });
  } catch (err) {
    next(err);
  }
}

async function approve(req, res, next) {
  try {
    const reply = req.body.reply ?? req.body.final_reply;
    const review = await reviewsService.approveReview(req.params.id, reply, req.user);
    res.json({ review });
  } catch (err) {
    next(err);
  }
}

async function bulkApprove(req, res, next) {
  try {
    const items = req.body.items ?? req.body.reviews;
    const result = await reviewsService.bulkApproveReviews(items, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  postReply,
  reject,
  approve,
  bulkApprove,
  regenerate,
};
