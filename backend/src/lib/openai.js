const OpenAI = require("openai");
const { createError } = require("../utils/errors");

let client;

function openai() {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw createError("OPENAI_API_KEY is not configured", 500);
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

module.exports = { openai };
