const express = require("express");
const analyticsController = require("../controllers/analytics.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { resolveTenant, enforceTenantIsolation, requireTenantContext } = require("../middleware/tenant.middleware");

const router = express.Router();

router.use(authenticate, resolveTenant, enforceTenantIsolation, requireTenantContext);
router.get("/", analyticsController.getStats);

module.exports = router;
