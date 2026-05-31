const { google } = require("googleapis");
const { createError } = require("../utils/errors");

const SCOPES = ["https://www.googleapis.com/auth/business.manage"];

function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret) {
    throw createError("Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)", 500);
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function createMyBusinessClient(auth) {
  return google.mybusiness({ version: "v4", auth });
}

function starRatingToNumber(starRating) {
  const map = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
  return map[starRating] ?? null;
}

function parseReviewId(reviewName) {
  if (!reviewName) return null;
  const parts = reviewName.split("/");
  return parts[parts.length - 1];
}

module.exports = {
  SCOPES,
  createOAuth2Client,
  createMyBusinessClient,
  starRatingToNumber,
  parseReviewId,
};
