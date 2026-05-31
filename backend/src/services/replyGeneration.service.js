const aiService = require("./ai.service");
const { checkPolicy } = require("./policyEngine.service");
const { isTooSimilar, getLastReplies } = require("./similarity.service");
const { pickKeywordForReply } = require("./keywordRotation.service");
const { detectSentiment } = require("./sentiment.service");

const MAX_GENERATION_ATTEMPTS = parseInt(process.env.REPLY_GENERATION_MAX_ATTEMPTS || "3", 10);

/**
 * Generate a reply that passes policy + similarity checks (with retries).
 */
async function generateProductionReply(review, tenant) {
  const oldReplies = await getLastReplies(tenant.id);
  const keyword = aiService.isNegativeReview(review.rating)
    ? ""
    : await pickKeywordForReply(tenant);
  const sentiment = detectSentiment({
    rating: review.rating,
    comment: review.comment,
  });

  let lastReply = "";
  let lastPolicy = { isValid: false, issues: [] };
  let feedbackParts = [];

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const policyFeedback = feedbackParts.join("; ") || undefined;

    const { reply } = await aiService.generateReviewReply({
      reviewText: review.comment || "",
      businessName: tenant.business_name,
      keyword: keyword || tenant.primary_keyword,
      location: tenant.location || "",
      tone: tenant.tone || "friendly",
      policyFeedback,
      rating: review.rating,
    });

    lastReply = reply;
    lastPolicy = checkPolicy(reply);

    if (!lastPolicy.isValid) {
      feedbackParts = [
        `Policy fixes required: ${lastPolicy.issues.join(", ")}`,
      ];
      continue;
    }

    if (isTooSimilar(reply, oldReplies)) {
      feedbackParts = [
        "Write a distinctly different reply. Do not reuse the same opening, structure, or phrases as recent replies.",
      ];
      lastPolicy = { isValid: false, issues: ["Too similar to a previous reply"] };
      continue;
    }

    return {
      reply,
      policy: lastPolicy,
      attempts: attempt + 1,
      keywordUsed: keyword || null,
      sentiment,
    };
  }

  return {
    reply: lastReply,
    policy: lastPolicy,
    attempts: MAX_GENERATION_ATTEMPTS,
    failed: true,
    keywordUsed: keyword || null,
    sentiment,
  };
}

module.exports = { generateProductionReply, MAX_GENERATION_ATTEMPTS };
