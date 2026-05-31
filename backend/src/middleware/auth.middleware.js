const jwt = require("jsonwebtoken");
const { createError } = require("../utils/errors");

function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId ?? null,
    };

    next();
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
