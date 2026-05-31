const express = require("express");
const aiController = require("../controllers/ai.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/generate-reply", authenticate, aiController.generateReply);

module.exports = router;
