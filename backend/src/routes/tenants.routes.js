const express = require("express");
const tenantsController = require("../controllers/tenants.controller");
const { authenticate, requireAdmin } = require("../middleware/auth.middleware");
const { resolveTenant, enforceTenantIsolation } = require("../middleware/tenant.middleware");

const router = express.Router();

router.use(authenticate, resolveTenant, enforceTenantIsolation);

router.get("/", tenantsController.list);
router.post("/", requireAdmin, tenantsController.create);
router.get("/:id", tenantsController.getById);
router.put("/:id", tenantsController.update);
router.delete("/:id", requireAdmin, tenantsController.remove);

module.exports = router;
