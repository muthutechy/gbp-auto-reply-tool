const { supabase } = require("../lib/supabase");
const { createError, fromSupabaseError } = require("../utils/errors");
const { SYSTEM_ACTOR } = require("../utils/systemActor");
const googleBusinessService = require("./googleBusiness.service");
const tenantsService = require("./tenants.service");
const decisionEngine = require("./decisionEngine.service");
const { generateProductionReply } = require("./replyGeneration.service");
const auditLogService = require("./auditLog.service");

async function saveAiReply(reviewId, reply, status) {
  const { data, error } = await supabase()
    .from("reviews")
    .update({ ai_reply: reply, status })
    .eq("id", reviewId)
    .select()
    .single();

  if (error) throw fromSupabaseError(error);
  return data;
}

/** Persist reply locally when review is not linked to Google (no external_id). */
async function saveLocalReply(reviewId, reply, status) {
  const updates = {
    ai_reply: reply,
    final_reply: reply,
    status,
  };

  if (status === "replied") {
    updates.replied_at = new Date().toISOString();
  }

  const { data, error } = await supabase()
    .from("reviews")
    .update(updates)
    .eq("id", reviewId)
    .select()
    .single();

  if (error) throw fromSupabaseError(error);
  return data;
}

function hasGoogleReview(review) {
  return Boolean(review?.external_id);
}

/** Post reply to Google and mark as replied, or save locally when not linked to Google. */
async function autoReply(reviewId, reply, review) {
  if (!hasGoogleReview(review)) {
    const updated = await saveLocalReply(reviewId, reply, "replied");
    await auditLogService.logAction({
      tenantId: review.tenant_id,
      userId: null,
      action: "auto_reply",
      reviewId,
      oldValue: { status: review.status, final_reply: review.final_reply },
      newValue: {
        status: updated.status,
        final_reply: updated.final_reply,
        ai_reply: updated.ai_reply,
      },
    });
    return {
      review: updated,
      action: "local_replied",
      decision: decisionEngine.DECISION.AUTO_REPLY,
      message: "Reply saved locally (no Google review linked)",
    };
  }

  const posted = await googleBusinessService.postReviewReply(reviewId, reply, SYSTEM_ACTOR);
  await auditLogService.logAction({
    tenantId: review.tenant_id,
    userId: null,
    action: "auto_reply",
    reviewId,
    oldValue: { status: review.status, final_reply: review.final_reply },
    newValue: {
      status: posted.status,
      final_reply: posted.final_reply,
      ai_reply: posted.ai_reply,
    },
  });
  return {
    review: posted,
    action: "auto_replied",
    decision: decisionEngine.DECISION.AUTO_REPLY,
    message: "Reply posted to Google",
  };
}

/** Save AI reply for client approval on dashboard */
async function sendToDashboard(reviewId, reply, rating, review) {
  const updated = hasGoogleReview(review)
    ? await saveAiReply(reviewId, reply, "awaiting_approval")
    : await saveLocalReply(reviewId, reply, "awaiting_approval");

  return {
    review: updated,
    action: "approval_required",
    decision: decisionEngine.DECISION.SEND_TO_DASHBOARD,
    message: `Rating ${rating} sent to dashboard for approval`,
  };
}

/**
 * Run Phase 5 decision engine after AI reply is generated.
 */
async function applyDecision(review, reply, tenant) {
  const { rating } = review;
  const autoReplyEnabled = tenant.auto_reply_enabled !== false;

  if (!autoReplyEnabled) {
    return sendToDashboard(review.id, reply, rating, review);
  }

  if (rating >= 4) {
    if (hasGoogleReview(review)) {
      await saveAiReply(review.id, reply, "approved");
    }
    return autoReply(review.id, reply, review);
  }

  if (rating === 3) {
    if (hasGoogleReview(review)) {
      await saveAiReply(review.id, reply, "approved");
    }
    return autoReply(review.id, reply, review);
  }

  return sendToDashboard(review.id, reply, rating, review);
}

async function processReview(reviewId) {
  const { data: review, error } = await supabase()
    .from("reviews")
    .select("*")
    .eq("id", reviewId)
    .single();

  if (error || !review) {
    throw createError("Review not found", 404);
  }

  if (review.status === "replied" || review.status === "rejected") {
    return { review, skipped: true, reason: "already_finalized" };
  }

  if (review.ai_reply && review.status === "awaiting_approval") {
    return { review, skipped: true, reason: "awaiting_approval" };
  }

  const tenant = await tenantsService.getTenantById(review.tenant_id);

  const { reply, policy, failed, sentiment, keywordUsed } = await generateProductionReply(
    review,
    tenant
  );

  if (sentiment || keywordUsed) {
    await supabase()
      .from("reviews")
      .update({
        ...(sentiment ? { sentiment } : {}),
        ...(keywordUsed ? { keyword_used: keywordUsed } : {}),
      })
      .eq("id", reviewId);
    if (sentiment) review.sentiment = sentiment;
    if (keywordUsed) review.keyword_used = keywordUsed;
  }

  if (failed || !policy.isValid) {
    const updated = hasGoogleReview(review)
      ? await saveAiReply(review.id, reply, "awaiting_approval")
      : await saveLocalReply(review.id, reply, "awaiting_approval");
    return {
      review: updated,
      action: "policy_blocked",
      decision: decisionEngine.DECISION.SEND_TO_DASHBOARD,
      message: "Reply failed policy check — sent to dashboard for review",
      policyIssues: policy.issues,
    };
  }

  return applyDecision(review, reply, tenant);
}

module.exports = {
  processReview,
  applyDecision,
  autoReply,
  sendToDashboard,
  shouldAutoReply: decisionEngine.shouldAutoReply,
  getDecision: decisionEngine.getDecision,
};
