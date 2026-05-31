const express = require("express");
const auditLogController = require("../controllers/auditLog.controller");
const { authenticate } = require("../middleware/auth.middleware");
const {
  resolveTenant,
  enforceTenantIsolation,
  requireTenantContext,
} = require("../middleware/tenant.middleware");

const router = express.Router();

router.use(authenticate, resolveTenant, enforceTenantIsolation);
router.get("/", requireTenantContext, auditLogController.list);

module.exports = router;
