const bcrypt = require("bcrypt");
const { supabase } = require("../lib/supabase");
const { signToken } = require("../lib/jwt");
const { createError, fromSupabaseError } = require("../utils/errors");
const { sanitizeUser } = require("../utils/user");

async function register({ email, password, role = "client", tenant_id }) {
  if (!email || !password) {
    throw createError("Email and password are required", 400);
  }

  if (!["admin", "client"].includes(role)) {
    throw createError("Invalid role", 400);
  }

  if (role === "client" && !tenant_id) {
    throw createError("tenant_id is required for client accounts", 400);
  }

  if (tenant_id) {
    const { data: tenant, error: tenantError } = await supabase()
      .from("tenants")
      .select("id")
      .eq("id", tenant_id)
      .single();

    if (tenantError || !tenant) {
      throw createError("Tenant not found", 404);
    }
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
    .select()
    .single();

  if (error) {
    throw fromSupabaseError(error, "Failed to register user");
  }

  const user = sanitizeUser(data);
  const token = signToken(data);
  return { user, token };
}

async function login({ email, password }) {
  if (!email || !password) {
    throw createError("Email and password are required", 400);
  }

  const { data, error } = await supabase()
    .from("users")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (error || !data) {
    throw createError("Invalid email or password", 401);
  }

  const valid = await bcrypt.compare(password, data.password_hash);
  if (!valid) {
    throw createError("Invalid email or password", 401);
  }

  const user = sanitizeUser(data);
  const token = signToken(data);
  return { user, token };
}

async function getMe(userId) {
  const { data, error } = await supabase()
    .from("users")
    .select("id, email, role, tenant_id, created_at, updated_at")
    .eq("id", userId)
    .single();

  if (error || !data) {
    throw createError("User not found", 404);
  }

  return data;
}

module.exports = { register, login, getMe };
