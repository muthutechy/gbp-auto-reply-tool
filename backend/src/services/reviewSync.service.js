const { supabase } = require("../lib/supabase");
const { fromSupabaseError } = require("../utils/errors");
const { SYSTEM_ACTOR } = require("../utils/systemActor");
const googleTokenService = require("./googleToken.service");
const googleBusinessService = require("./googleBusiness.service");
const reviewQueueService = require("./reviewQueue.service");

async function getConnectedTenantIds() {
  const { data, error } = await supabase().from("google_tokens").select("tenant_id");
  if (error) throw fromSupabaseError(error);
  return (data || []).map((row) => row.tenant_id);
}

async function getPendingReviewsForTenant(tenantId) {
  const { data, error } = await supabase()
    .from("reviews")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "pending")
    .is("ai_reply", null);

  if (error) throw fromSupabaseError(error);
  return data || [];
}

async function syncTenantAndQueue(tenantId) {
  const connected = await googleTokenService.isConnected(tenantId);
  if (!connected) {
    return { tenantId, skipped: true, reason: "google_not_connected" };
  }

  await googleBusinessService.fetchAndSyncReviews(tenantId, SYSTEM_ACTOR);

  const { data: tenant, error: tenantError } = await supabase()
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single();

  if (tenantError || !tenant) {
    return { tenantId, skipped: true, reason: "tenant_not_found" };
  }

  const pending = await getPendingReviewsForTenant(tenantId);
  const queued = await reviewQueueService.enqueuePendingReviews(pending, tenant);

  return {
    tenantId,
    pendingCount: pending.length,
    queued,
  };
}

async function runFetchAndQueueAll() {
  const tenantIds = await getConnectedTenantIds();
  const results = [];

  for (const tenantId of tenantIds) {
    try {
      const result = await syncTenantAndQueue(tenantId);
      results.push(result);
    } catch (err) {
      results.push({ tenantId, error: err.message });
      console.error(`[cron] tenant ${tenantId} failed:`, err.message);
    }
  }

  return { tenantsProcessed: tenantIds.length, results };
}

module.exports = {
  getConnectedTenantIds,
  getPendingReviewsForTenant,
  syncTenantAndQueue,
  runFetchAndQueueAll,
};
