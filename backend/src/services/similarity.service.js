const { supabase } = require("../lib/supabase");
const { fromSupabaseError } = require("../utils/errors");

const SIMILARITY_THRESHOLD = parseFloat(process.env.REPLY_SIMILARITY_THRESHOLD || "0.7");
const LAST_REPLIES_LIMIT = parseInt(process.env.LAST_REPLIES_COMPARE_COUNT || "15", 10);

function similarity(a, b) {
  if (!a || !b) return 0;

  const aWords = new Set(
    a
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
  const bWords = new Set(
    b
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );

  if (aWords.size === 0 || bWords.size === 0) return 0;

  const intersection = new Set([...aWords].filter((x) => bWords.has(x)));
  return intersection.size / Math.max(aWords.size, bWords.size);
}

function isTooSimilar(newReply, oldReplies, threshold = SIMILARITY_THRESHOLD) {
  for (const old of oldReplies) {
    if (similarity(newReply, old) > threshold) {
      return true;
    }
  }
  return false;
}

async function getLastReplies(tenantId, limit = LAST_REPLIES_LIMIT) {
  const { data, error } = await supabase()
    .from("reviews")
    .select("ai_reply, final_reply")
    .eq("tenant_id", tenantId)
    .in("status", ["replied", "awaiting_approval", "approved"])
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw fromSupabaseError(error);

  return (data || []).map((r) => r.final_reply || r.ai_reply).filter(Boolean);
}

module.exports = {
  similarity,
  isTooSimilar,
  getLastReplies,
  SIMILARITY_THRESHOLD,
};
