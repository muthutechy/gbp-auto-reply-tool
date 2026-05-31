const analyticsService = require("../services/analytics.service");

async function getStats(req, res, next) {
  try {
    const tenantId = req.tenantId || req.user.tenantId;
    const stats = await analyticsService.getAnalytics(tenantId);
    res.json({ analytics: stats });
  } catch (err) {
    next(err);
  }
}

module.exports = { getStats };
