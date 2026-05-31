const bcrypt = require("bcrypt");
const { supabase } = require("../lib/supabase");
const { createError, fromSupabaseError } = require("../utils/errors");
const { sanitizeUser } = require("../utils/user");

const USER_COLUMNS = "id, email, role, tenant_id, created_at, updated_at";

async function listUsers({ tenantId, role }) {
  let query = supabase().from("users").select(USER_COLUMNS).order("created_at", { ascending: false });

  if (tenantId) query = query.eq("tenant_id", tenantId);
  if (role) query = query.eq("role", role);

  const { data, error } = await query;
  if (error) throw fromSupabaseError(error);
  return data;
}

async function getUserById(id) {
  const { data, error } = await supabase()
    .from("users")
    .select(USER_COLUMNS)
    .eq("id", id)
    .single();

  if (error || !data) throw createError("User not found", 404);
  return data;
}

async function createUser({ email, password, role = "client", tenant_id }, actor) {
  if (actor.role !== "admin") {
    throw createError("Admin access required", 403);
  }

  if (role === "client" && !tenant_id) {
    throw createError("tenant_id is required for client users", 400);
  }

  const password_hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase()
    .from("users")
    .insert({
      email: email.toLowerCase().trim(),
      password_hash,
      role,
      tenant_id: role === "client" ? tenant_id : null,
    })
    .select(USER_COLUMNS)
    .single();

  if (error) throw fromSupabaseError(error);
  return data;
}

async function updateUser(id, payload, actor) {
  const existing = await getUserById(id);

  if (actor.role !== "admin" && actor.userId !== id) {
    throw createError("Access denied", 403);
  }

  if (actor.role !== "admin" && (payload.role || payload.tenant_id !== undefined)) {
    throw createError("Cannot change role or tenant", 403);
  }

  const updates = {};
  if (payload.email) updates.email = payload.email.toLowerCase().trim();
  if (payload.role && actor.role === "admin") updates.role = payload.role;
  if (payload.tenant_id !== undefined && actor.role === "admin") {
    updates.tenant_id = payload.tenant_id;
  }
  if (payload.password) {
    updates.password_hash = await bcrypt.hash(payload.password, 10);
  }

  if (Object.keys(updates).length === 0) {
    return existing;
  }

  if (updates.role === "client" && updates.tenant_id === null && existing.role === "client") {
    throw createError("tenant_id is required for client users", 400);
  }

  const { data, error } = await supabase()
    .from("users")
    .update(updates)
    .eq("id", id)
    .select(USER_COLUMNS)
    .single();

  if (error) throw fromSupabaseError(error);
  return data;
}

async function deleteUser(id, actor) {
  if (actor.role !== "admin") {
    throw createError("Admin access required", 403);
  }

  if (actor.userId === id) {
    throw createError("Cannot delete your own account", 400);
  }

  const { error } = await supabase().from("users").delete().eq("id", id);
  if (error) throw fromSupabaseError(error);
  return { success: true };
}

module.exports = { listUsers, getUserById, createUser, updateUser, deleteUser, sanitizeUser };
