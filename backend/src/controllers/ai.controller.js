const aiService = require("../services/ai.service");
const { checkPolicy } = require("../services/policyEngine.service");

async function generateReply(req, res, next) {
  try {
    const { reviewText, businessName, keyword, location, tone } = req.body;
    const result = await aiService.generateReviewReply({
      reviewText,
      businessName,
      keyword,
      location,
      tone,
    });
    const policy = checkPolicy(result.reply);
    res.json({ ...result, policy });
  } catch (err) {
    next(err);
  }
}

module.exports = { generateReply };
