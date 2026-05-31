const express = require("express");
const usersController = require("../controllers/users.controller");
const { authenticate, requireAdmin } = require("../middleware/auth.middleware");
const { resolveTenant, enforceTenantIsolation } = require("../middleware/tenant.middleware");

const router = express.Router();

router.use(authenticate, resolveTenant, enforceTenantIsolation);

router.get("/", requireAdmin, usersController.list);
router.post("/", requireAdmin, usersController.create);
router.get("/:id", usersController.getById);
router.put("/:id", usersController.update);
router.delete("/:id", requireAdmin, usersController.remove);

module.exports = router;
