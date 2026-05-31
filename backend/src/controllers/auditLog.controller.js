const auditLogService = require("../services/auditLog.service");

async function list(req, res, next) {
  try {
    const tenantId = req.tenantId || req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: "tenant_id is required" });
    }

    const limit = Math.min(parseInt(req.query.limit || "100", 10), 500);
    const logs = await auditLogService.getLogsByTenant(tenantId, { limit });
    res.json({ logs });
  } catch (err) {
    next(err);
  }
}

module.exports = { list };
