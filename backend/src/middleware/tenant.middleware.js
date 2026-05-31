const { createError } = require("../utils/errors");

/** Resolves effective tenant_id for the request into req.tenantId */
function resolveTenant(req, _res, next) {
  const fromParams = req.params.tenantId || req.params.tenant_id;
  const fromQuery = req.query.tenant_id || req.query.tenantId;
  const fromBody = req.body?.tenant_id ?? req.body?.tenantId;

  if (req.user?.role === "admin") {
    req.tenantId = fromParams || fromQuery || fromBody || req.user.tenantId || null;
  } else {
    req.tenantId = req.user?.tenantId || null;
  }

  next();
}

/** Blocks clients from accessing another tenant's data */
function enforceTenantIsolation(req, res, next) {
  if (req.user?.role === "admin") {
    return next();
  }

  const requested =
    req.params.tenantId ||
    req.params.tenant_id ||
    req.query.tenant_id ||
    req.query.tenantId ||
    req.body?.tenant_id ||
    req.body?.tenantId;

  if (requested && requested !== req.user?.tenantId) {
    return res.status(403).json({ error: "Access denied to this tenant" });
  }

  if (!req.user?.tenantId) {
    return res.status(403).json({ error: "No tenant associated with this account" });
  }

  next();
}

/** Requires a tenant context (from resolveTenant or client JWT) */
function requireTenantContext(req, _res, next) {
  if (!req.tenantId) {
    return next(createError("tenant_id is required", 400));
  }
  next();
}

module.exports = { resolveTenant, enforceTenantIsolation, requireTenantContext };
