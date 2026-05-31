const { openai } = require("../lib/openai");
const { createError } = require("../utils/errors");
const { getRandomOpening } = require("./replyVariation.service");

const MAX_LINES = 3;
const MAX_CHARS = 300;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function isNegativeReview(rating) {
  return Number(rating) <= 2;
}

function buildNegativePrompt({ reviewText, businessName, location, tone, policyFeedback, opening }) {
  const openingLine = opening || "We're truly sorry to hear about your experience.";

  return `You write empathetic, professional replies to low-star (1–2) Google Business Profile reviews.

Your reply must:
- Start with a sincere apology and acknowledge the customer's concern.
- Offer a clear path to resolution (e.g. ask them to contact you so you can make it right).
- Sound human, calm, and accountable — never defensive or dismissive.
- Mention the business name ("${businessName}") exactly once, naturally.
- ${location ? `Mention the location ("${location}") only if it fits naturally.` : "Do not invent a location."}
- Do NOT include SEO keywords, promotional language, or keyword stuffing.
- Stay under 300 characters and use no more than 3 short lines.
- No URLs, phone numbers, emails, hashtags, emojis, or hype words ("best", "#1", etc.).

Tone: ${tone}.

Start with: "${openingLine}"

Customer review:
"""
${reviewText || "(No review text — respond graciously to the low rating.)"}
"""

Write ONLY the reply text.${policyFeedback ? `\n\nFix these issues from the previous draft: ${policyFeedback}` : ""}`;
}

function buildPrompt({
  reviewText,
  businessName,
  keyword,
  location,
  tone,
  policyFeedback,
  opening,
  rating,
}) {
  if (isNegativeReview(rating)) {
    return buildNegativePrompt({
      reviewText,
      businessName,
      location,
      tone,
      policyFeedback,
      opening,
    });
  }

  const openingLine = opening || getRandomOpening();

  return `You write warm, natural-sounding replies to Google Business Profile reviews for local businesses.

Your reply must:
- Sound genuinely human, friendly, and slightly varied in tone (not robotic).
- Thank the reviewer and respond to their specific feedback if possible.
- Naturally mention the business name ("${businessName}") exactly once.
- Seamlessly include the primary keyword ("${keyword}") once (use a natural synonym if it flows better; do not keyword-stuff).
- Smoothly mention the location ("${location || "no location provided"}") only if it fits naturally in the reply. Never invent a location.
- Stay strictly under 300 characters.
- Use no more than 3 short lines (prefer 1–2 sentences, avoid excessive line breaks).
- Avoid repeating words or phrases (for example, do not say "thank you" twice).
- Absolutely do NOT use URLs, phone numbers, emails, hashtags, emojis, or spammy phrases like "best", "number 1", "top", or "cheap and best".
- Make each reply feel unique and tailored—not generic or formulaic.

Vary the tone as appropriate (use this guidance: ${tone}).

Start the reply with: "${openingLine}"

Customer review:
"""
${reviewText || "(No review text — respond graciously to the rating.)"}
"""

Write ONLY the reply text. Do not include extra explanations, formatting, or closing remarks.${
    policyFeedback
      ? `

Your previous draft failed policy checks. Please fix these issues: ${policyFeedback}
Again, do NOT use promotional phrases like "best service", "number 1", "top service", or "cheap and best".`
      : ""
  }`;
}

function normalizeReply(text) {
  let reply = text.trim().replace(/^["']|["']$/g, "");

  const lines = reply
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > MAX_LINES) {
    reply = lines.slice(0, MAX_LINES).join("\n");
  } else {
    reply = lines.join("\n");
  }

  if (reply.length > MAX_CHARS) {
    reply = reply.slice(0, MAX_CHARS).trim();
    const lastSpace = reply.lastIndexOf(" ");
    if (lastSpace > MAX_CHARS * 0.7) {
      reply = reply.slice(0, lastSpace).trim();
    }
  }

  return reply;
}

function validateInput({ reviewText, businessName, keyword, tone }) {
  if (!businessName?.trim()) {
    throw createError("businessName is required", 400);
  }
  if (!keyword?.trim()) {
    throw createError("keyword is required", 400);
  }
  if (!tone?.trim()) {
    throw createError("tone is required", 400);
  }
  if (reviewText !== undefined && reviewText !== null && typeof reviewText !== "string") {
    throw createError("reviewText must be a string", 400);
  }
}

/**
 * Generate an SEO-optimized review reply.
 *
 * @param {Object} params
 * @param {string} [params.reviewText]
 * @param {string} params.businessName
 * @param {string} params.keyword
 * @param {string} [params.location]
 * @param {string} params.tone - e.g. friendly, professional, formal
 * @returns {Promise<{ reply: string }>}
 */
async function generateReviewReply({
  reviewText = "",
  businessName,
  keyword,
  location = "",
  tone = "friendly",
  policyFeedback,
  rating,
}) {
  const negative = isNegativeReview(rating);
  if (!negative) {
    validateInput({ reviewText, businessName, keyword, tone });
  } else if (!businessName?.trim() || !tone?.trim()) {
    throw createError("businessName and tone are required", 400);
  }

  const prompt = buildPrompt({
    reviewText: reviewText.trim(),
    businessName: businessName.trim(),
    keyword: (keyword || "").trim(),
    location: location?.trim() || "",
    tone: tone.trim().toLowerCase(),
    policyFeedback,
    rating,
  });

  const completion = await openai().chat.completions.create({
    model: MODEL,
    temperature: 0.8,
    max_tokens: 150,
    messages: [
      {
        role: "system",
        content:
          "You are an expert at writing concise, authentic Google review replies for local businesses. Follow every constraint exactly.",
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) {
    throw createError("AI returned an empty reply", 502);
  }

  const reply = normalizeReply(raw);
  if (!reply) {
    throw createError("AI returned an invalid reply", 502);
  }

  return { reply };
}

module.exports = {
  generateReviewReply,
  buildPrompt,
  buildNegativePrompt,
  isNegativeReview,
  normalizeReply,
  MAX_CHARS,
};
