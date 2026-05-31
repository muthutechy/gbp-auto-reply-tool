const jwt = require("jsonwebtoken");

if (!process.env.JWT_SECRET) {
  console.warn("[startup] JWT_SECRET is not set — legacy JWT auth will fail at runtime");
}

function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id ?? null,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

module.exports = { signToken };
