const { supabase } = require("../lib/supabase");
const { createError, fromSupabaseError } = require("../utils/errors");
const googleBusinessService = require("./googleBusiness.service");
const { assertPolicyValid } = require("./policyEngine.service");
const { detectSentiment } = require("./sentiment.service");
const auditLogService = require("./auditLog.service");
const tenantsService = require("./tenants.service");
const { generateProductionReply } = require("./replyGeneration.service");

const REVIEW_STATUSES = ["pending", "awaiting_approval", "approved", "replied", "rejected"];

function assertTenantAccess(tenantId, actor) {
  if (actor.role === "admin") return;
  if (actor.tenantId !== tenantId) {
    throw createError("Access denied to this tenant", 403);
  }
}

function parseDateEnd(dateTo) {
  if (!dateTo) return null;
  const d = new Date(dateTo);
  if (Number.isNaN(d.getTime())) {
    throw createError("Invalid date_to", 400);
  }
  if (dateTo.length <= 10) {
    d.setUTCHours(23, 59, 59, 999);
  }
  return d.toISOString();
}

function parseDateStart(dateFrom) {
  if (!dateFrom) return null;
  const d = new Date(dateFrom);
  if (Number.isNaN(d.getTime())) {
    throw createError("Invalid date_from", 400);
  }
  if (dateFrom.length <= 10) {
    d.setUTCHours(0, 0, 0, 0);
  }
  return d.toISOString();
}

async function listReviews({ tenantId, status, rating, dateFrom, dateTo, sentiment }) {
  if (!tenantId) {
    throw createError("tenant_id is required", 400);
  }

  if (status && !REVIEW_STATUSES.includes(status)) {
    throw createError("Invalid status filter", 400);
  }

  if (rating !== undefined && rating !== null) {
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      throw createError("rating filter must be between 1 and 5", 400);
    }
  }

  let query = supabase()
    .from("reviews")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (rating !== undefined && rating !== null) query = query.eq("rating", Number(rating));
  if (sentiment) query = query.eq("sentiment", sentiment);

  const fromIso = parseDateStart(dateFrom);
  const toIso = parseDateEnd(dateTo);
  if (fromIso) query = query.gte("created_at", fromIso);
  if (toIso) query = query.lte("created_at", toIso);

  const { data, error } = await query;
  if (error) throw fromSupabaseError(error);
  return data;
}

async function getReviewById(id) {
  const { data, error } = await supabase().from("reviews").select("*").eq("id", id).single();

  if (error || !data) throw createError("Review not found", 404);
  return data;
}

async function createReview(payload, actor) {
  const tenant_id = payload.tenant_id || actor.tenantId;

  if (!tenant_id) {
    throw createError("tenant_id is required", 400);
  }

  assertTenantAccess(tenant_id, actor);

  if (!payload.rating || payload.rating < 1 || payload.rating > 5) {
    throw createError("rating must be between 1 and 5", 400);
  }

  if (payload.status && !REVIEW_STATUSES.includes(payload.status)) {
    throw createError("Invalid status", 400);
  }

  const sentiment =
    payload.sentiment ||
    detectSentiment({ rating: payload.rating, comment: payload.comment });

  const { data, error } = await supabase()
    .from("reviews")
    .insert({
      tenant_id,
      external_id: payload.external_id ?? null,
      rating: payload.rating,
      comment: payload.comment ?? null,
      reviewer_name: payload.reviewer_name ?? null,
      status: payload.status ?? "pending",
      ai_reply: payload.ai_reply ?? null,
      final_reply: payload.final_reply ?? null,
      sentiment,
    })
    .select()
    .single();

  if (error) throw fromSupabaseError(error);
  return data;
}

async function updateReview(id, payload, actor) {
  const existing = await getReviewById(id);
  assertTenantAccess(existing.tenant_id, actor);

  const allowed = [
    "rating",
    "comment",
    "reviewer_name",
    "status",
    "ai_reply",
    "final_reply",
    "external_id",
    "sentiment",
  ];
  const updates = {};

  for (const key of allowed) {
    if (payload[key] !== undefined) updates[key] = payload[key];
  }

  if (updates.status && !REVIEW_STATUSES.includes(updates.status)) {
    throw createError("Invalid status", 400);
  }

  if (updates.rating && (updates.rating < 1 || updates.rating > 5)) {
    throw createError("rating must be between 1 and 5", 400);
  }

  if (Object.keys(updates).length === 0) {
    return existing;
  }

  const { data, error } = await supabase()
    .from("reviews")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw fromSupabaseError(error);

  const replyEdited =
    updates.ai_reply !== undefined || updates.final_reply !== undefined;
  if (replyEdited) {
    await auditLogService.logAction({
      tenantId: existing.tenant_id,
      userId: actor.userId,
      action: "edit_reply",
      reviewId: id,
      oldValue: {
        ai_reply: existing.ai_reply,
        final_reply: existing.final_reply,
      },
      newValue: {
        ai_reply: data.ai_reply,
        final_reply: data.final_reply,
      },
    });
  }

  return data;
}

async function deleteReview(id, actor) {
  const existing = await getReviewById(id);
  assertTenantAccess(existing.tenant_id, actor);

  const { error } = await supabase().from("reviews").delete().eq("id", id);
  if (error) throw fromSupabaseError(error);
  return { success: true };
}

async function approveReview(id, replyText, actor) {
  if (!replyText?.trim()) {
    throw createError("reply is required", 400);
  }

  assertPolicyValid(replyText.trim());

  const existing = await getReviewById(id);
  assertTenantAccess(existing.tenant_id, actor);

  if (!["awaiting_approval", "approved", "pending"].includes(existing.status)) {
    throw createError("Review cannot be approved in its current status", 400);
  }

  let data;
  if (existing.external_id) {
    data = await googleBusinessService.postReviewReply(id, replyText.trim(), actor);
  } else {
    const { data: updated, error } = await supabase()
      .from("reviews")
      .update({
        final_reply: replyText.trim(),
        status: "replied",
        replied_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw fromSupabaseError(error);
    data = updated;
  }

  await auditLogService.logAction({
    tenantId: existing.tenant_id,
    userId: actor.userId,
    action: "approve_review",
    reviewId: id,
    oldValue: {
      status: existing.status,
      ai_reply: existing.ai_reply,
      final_reply: existing.final_reply,
    },
    newValue: {
      status: data.status,
      ai_reply: data.ai_reply,
      final_reply: data.final_reply,
    },
  });

  return data;
}

async function rejectReview(id, actor) {
  const existing = await getReviewById(id);
  assertTenantAccess(existing.tenant_id, actor);

  const review = await updateReview(id, { status: "rejected" }, actor);

  await auditLogService.logAction({
    tenantId: existing.tenant_id,
    userId: actor.userId,
    action: "reject_review",
    reviewId: id,
    oldValue: { status: existing.status },
    newValue: { status: review.status },
  });

  return review;
}

async function regenerateReview(id, actor) {
  const existing = await getReviewById(id);
  assertTenantAccess(existing.tenant_id, actor);

  const tenant = await tenantsService.getTenantById(existing.tenant_id);
  const { reply, failed } = await generateProductionReply(existing, tenant);

  const status =
    existing.status === "replied" || existing.status === "rejected"
      ? existing.status
      : "awaiting_approval";

  const { data, error } = await supabase()
    .from("reviews")
    .update({
      ai_reply: reply,
      status: failed ? "awaiting_approval" : status,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw fromSupabaseError(error);

  await auditLogService.logAction({
    tenantId: existing.tenant_id,
    userId: actor.userId,
    action: "regenerate_reply",
    reviewId: id,
    oldValue: { ai_reply: existing.ai_reply },
    newValue: { ai_reply: data.ai_reply },
  });

  return data;
}

async function bulkApproveReviews(items, actor) {
  if (!Array.isArray(items) || items.length === 0) {
    throw createError("items array is required", 400);
  }

  const results = [];
  for (const item of items) {
    if (!item?.id || !item?.reply?.trim()) {
      results.push({
        id: item?.id || null,
        success: false,
        error: "Each item requires id and reply",
      });
      continue;
    }

    try {
      const review = await approveReview(item.id, item.reply, actor);
      results.push({ id: item.id, success: true, review });
    } catch (err) {
      results.push({
        id: item.id,
        success: false,
        error: err.message || "Approval failed",
      });
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  return { results, succeeded, failed: results.length - succeeded };
}

module.exports = {
  listReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
  approveReview,
  bulkApproveReviews,
  rejectReview,
  regenerateReview,
};
