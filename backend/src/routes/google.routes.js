const express = require("express");
const googleController = require("../controllers/google.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { resolveTenant, enforceTenantIsolation, requireTenantContext } = require("../middleware/tenant.middleware");

const router = express.Router();

router.get("/callback", googleController.callback);

// TEMP: no auth — direct browser testing (pass ?tenant_id=...)
router.get("/auth", googleController.startAuth);

router.use(authenticate, resolveTenant, enforceTenantIsolation);

router.get("/status", requireTenantContext, googleController.status);
router.delete("/disconnect", requireTenantContext, googleController.disconnect);

module.exports = router;
