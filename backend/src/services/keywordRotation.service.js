const { supabase } = require("../lib/supabase");
const { fromSupabaseError } = require("../utils/errors");

function collectKeywords(tenant) {
  const primary = tenant.primary_keyword?.trim();
  const secondary = (tenant.secondary_keywords || [])
    .map((k) => (typeof k === "string" ? k.trim() : ""))
    .filter(Boolean);

  const all = [];
  if (primary) all.push(primary);
  for (const kw of secondary) {
    if (!all.includes(kw)) all.push(kw);
  }
  return all;
}

/**
 * Pick the next SEO keyword, rotating away from recently used ones.
 */
async function pickKeywordForReply(tenant) {
  const keywords = collectKeywords(tenant);
  if (keywords.length === 0) {
    return tenant.primary_keyword || "";
  }
  if (keywords.length === 1) {
    return keywords[0];
  }

  const { data, error } = await supabase()
    .from("reviews")
    .select("keyword_used")
    .eq("tenant_id", tenant.id)
    .not("keyword_used", "is", null)
    .order("created_at", { ascending: false })
    .limit(keywords.length * 2);

  if (error) throw fromSupabaseError(error);

  const recentlyUsed = new Set((data || []).map((row) => row.keyword_used).filter(Boolean));
  const unused = keywords.filter((kw) => !recentlyUsed.has(kw));
  if (unused.length > 0) {
    return unused[0];
  }

  const index = Math.floor(Math.random() * keywords.length);
  return keywords[index];
}

module.exports = { pickKeywordForReply, collectKeywords };
