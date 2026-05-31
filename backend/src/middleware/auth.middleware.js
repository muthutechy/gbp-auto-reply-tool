const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { createError } = require("../utils/errors");
const { supabase } = require("../lib/supabase");

async function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = header.slice(7);

  // 1) Prefer legacy backend JWT for backwards compatibility
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId ?? null,
    };
    return next();
  } catch {
    // fallthrough
  }

  // 2) Accept Supabase Auth JWTs (for frontend Supabase login)
  try {
    const { data, error } = await supabase().auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const email = (data.user.email || "").toLowerCase().trim();
    if (!email) {
      return res.status(401).json({ error: "Invalid token user" });
    }

    // Map Supabase user -> local users table (for role + tenant_id).
    const { data: localUser, error: localErr } = await supabase()
      .from("users")
      .select("id, email, role, tenant_id")
      .eq("email", email)
      .maybeSingle();

    let ensured = localUser;
    if (localErr) {
      return res.status(500).json({ error: "Failed to load user" });
    }

    if (!ensured) {
      const password_hash = await bcrypt.hash(`${data.user.id}:${Date.now()}`, 10);
      const { data: created, error: createErr } = await supabase()
        .from("users")
        .insert({
          email,
          password_hash,
          role: "client",
          tenant_id: null,
        })
        .select("id, email, role, tenant_id")
        .single();

      if (createErr) {
        return res.status(500).json({ error: "Failed to create user" });
      }
      ensured = created;
    }

    req.user = {
      userId: ensured.id,
      email: ensured.email,
      role: ensured.role,
      tenantId: ensured.tenant_id ?? null,
    };

    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireAdmin(req, _res, next) {
  if (req.user?.role !== "admin") {
    return next(createError("Admin access required", 403));
  }
  next();
}

function requireSelfOrAdmin(getTargetUserId) {
  return (req, _res, next) => {
    const targetId = getTargetUserId(req);
    if (req.user.role === "admin" || req.user.userId === targetId) {
      return next();
    }
    return next(createError("Access denied", 403));
  };
}

module.exports = { authenticate, requireAdmin, requireSelfOrAdmin };
