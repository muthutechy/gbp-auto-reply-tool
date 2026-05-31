const NEGATIVE_WORDS = [
  "terrible",
  "awful",
  "worst",
  "bad",
  "horrible",
  "disappointed",
  "never again",
  "rude",
  "unprofessional",
  "waste",
];

const POSITIVE_WORDS = [
  "great",
  "excellent",
  "amazing",
  "love",
  "wonderful",
  "fantastic",
  "outstanding",
  "perfect",
  "recommend",
];

/**
 * @param {{ rating: number, comment?: string | null }} review
 * @returns {"positive" | "neutral" | "negative"}
 */
function detectSentiment({ rating, comment }) {
  const text = (comment || "").toLowerCase();
  let score = 0;

  if (rating >= 4) score += 2;
  else if (rating === 3) score += 0;
  else score -= 2;

  for (const word of NEGATIVE_WORDS) {
    if (text.includes(word)) score -= 1;
  }
  for (const word of POSITIVE_WORDS) {
    if (text.includes(word)) score += 1;
  }

  if (score > 0) return "positive";
  if (score < 0) return "negative";
  return "neutral";
}

module.exports = { detectSentiment };
