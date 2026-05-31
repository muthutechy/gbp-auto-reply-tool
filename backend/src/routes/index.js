const express = require("express");
const authRoutes = require("./auth.routes");
const usersRoutes = require("./users.routes");
const tenantsRoutes = require("./tenants.routes");
const reviewsRoutes = require("./reviews.routes");
const aiRoutes = require("./ai.routes");
const googleRoutes = require("./google.routes");
const analyticsRoutes = require("./analytics.routes");
const auditLogRoutes = require("./auditLog.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/tenants", tenantsRoutes);
router.use("/reviews", reviewsRoutes);
router.use("/ai", aiRoutes);
router.use("/google", googleRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/audit-logs", auditLogRoutes);

module.exports = router;
