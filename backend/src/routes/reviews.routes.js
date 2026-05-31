const express = require("express");
const reviewsController = require("../controllers/reviews.controller");
const { authenticate } = require("../middleware/auth.middleware");
const {
  resolveTenant,
  enforceTenantIsolation,
  requireTenantContext,
} = require("../middleware/tenant.middleware");

const router = express.Router();

router.use(authenticate, resolveTenant, enforceTenantIsolation);

router.get("/", requireTenantContext, reviewsController.list);
router.post("/bulk-approve", reviewsController.bulkApprove);
router.post("/", reviewsController.create);
router.put("/:id/reply", reviewsController.postReply);
router.post("/:id/regenerate", reviewsController.regenerate);
router.post("/:id/approve", reviewsController.approve);
router.post("/:id/reject", reviewsController.reject);
router.get("/:id", reviewsController.getById);
router.put("/:id", reviewsController.update);
router.delete("/:id", reviewsController.remove);

module.exports = router;
