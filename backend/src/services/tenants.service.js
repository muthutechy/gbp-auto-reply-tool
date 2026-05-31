const { supabase } = require("../lib/supabase");
const { createError, fromSupabaseError } = require("../utils/errors");

async function listTenants(tenantId) {
  let query = supabase().from("tenants").select("*").order("created_at", { ascending: false });

  if (tenantId) {
    query = query.eq("id", tenantId);
  }

  const { data, error } = await query;
  if (error) throw fromSupabaseError(error);
  return data;
}

async function getTenantById(id) {
  const { data, error } = await supabase().from("tenants").select("*").eq("id", id).single();

  if (error || !data) throw createError("Tenant not found", 404);
  return data;
}

async function createTenant(payload, actor) {
  if (actor.role !== "admin") {
    throw createError("Admin access required", 403);
  }

  const { data, error } = await supabase()
    .from("tenants")
    .insert({
      business_name: payload.business_name,
      primary_keyword: payload.primary_keyword,
      secondary_keywords: payload.secondary_keywords ?? [],
      location: payload.location ?? null,
      tone: payload.tone ?? "friendly",
      auto_reply_enabled: payload.auto_reply_enabled ?? true,
    })
    .select()
    .single();

  if (error) throw fromSupabaseError(error);
  return data;
}

async function updateTenant(id, payload, actor) {
  await getTenantById(id);

  if (actor.role !== "admin" && actor.tenantId !== id) {
    throw createError("Access denied", 403);
  }

  const allowed = [
    "business_name",
    "primary_keyword",
    "secondary_keywords",
    "location",
    "tone",
    "auto_reply_enabled",
  ];

  const updates = {};
  for (const key of allowed) {
    if (payload[key] !== undefined) updates[key] = payload[key];
  }

  if (Object.keys(updates).length === 0) {
    return getTenantById(id);
  }

  const { data, error } = await supabase()
    .from("tenants")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw fromSupabaseError(error);
  return data;
}

async function deleteTenant(id, actor) {
  if (actor.role !== "admin") {
    throw createError("Admin access required", 403);
  }

  const { error } = await supabase().from("tenants").delete().eq("id", id);
  if (error) throw fromSupabaseError(error);
  return { success: true };
}

module.exports = { listTenants, getTenantById, createTenant, updateTenant, deleteTenant };
