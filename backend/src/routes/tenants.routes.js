const express = require("express");
const tenantsController = require("../controllers/tenants.controller");
const { authenticate, requireAdmin } = require("../middleware/auth.middleware");
const { resolveTenant, enforceTenantIsolation } = require("../middleware/tenant.middleware");

const router = express.Router();

router.use(authenticate, resolveTenant);

// Allow tenant creation before user has tenant_id (Supabase onboarding)
router.post("/", tenantsController.create);

router.use(enforceTenantIsolation);

router.get("/", tenantsController.list);
router.get("/:id", tenantsController.getById);
router.put("/:id", tenantsController.update);
router.delete("/:id", requireAdmin, tenantsController.remove);

module.exports = router;
