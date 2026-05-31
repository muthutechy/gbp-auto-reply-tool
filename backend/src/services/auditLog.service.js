const { supabase } = require("../lib/supabase");
const { fromSupabaseError } = require("../utils/errors");

/**
 * @param {{ tenantId: string, userId?: string | null, action: string, reviewId?: string | null, oldValue?: object, newValue?: object }} params
 */
async function logAction({ tenantId, userId, action, reviewId, oldValue, newValue }) {
  try {
    const { error } = await supabase().from("audit_logs").insert({
      tenant_id: tenantId,
      user_id: userId || null,
      action,
      review_id: reviewId || null,
      old_value: oldValue ?? null,
      new_value: newValue ?? null,
    });

    if (error) {
      console.error("[auditLog] Failed to write log:", error.message);
    }
  } catch (err) {
    console.error("[auditLog] Unexpected error:", err.message);
  }
}

async function getLogsByTenant(tenantId, { limit = 100 } = {}) {
  const { data, error } = await supabase()
    .from("audit_logs")
    .select(
      `
      id,
      tenant_id,
      user_id,
      action,
      review_id,
      old_value,
      new_value,
      created_at,
      users ( email ),
      reviews ( comment, rating, reviewer_name )
    `
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw fromSupabaseError(error);

  return (data || []).map((row) => ({
    id: row.id,
    tenant_id: row.tenant_id,
    user_id: row.user_id,
    user_email: row.users?.email || null,
    action: row.action,
    review_id: row.review_id,
    review_snippet: row.reviews
      ? {
          comment: row.reviews.comment,
          rating: row.reviews.rating,
          reviewer_name: row.reviews.reviewer_name,
        }
      : null,
    old_value: row.old_value,
    new_value: row.new_value,
    created_at: row.created_at,
  }));
}

module.exports = { logAction, getLogsByTenant };
