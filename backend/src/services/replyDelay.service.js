const MIN_MINUTES = parseInt(process.env.REPLY_DELAY_MIN_MINUTES || "2", 10);
const MAX_MINUTES = parseInt(process.env.REPLY_DELAY_MAX_MINUTES || "15", 10);
const BUSINESS_HOURS_START = parseInt(process.env.BUSINESS_HOURS_START || "9", 10);
const BUSINESS_HOURS_END = parseInt(process.env.BUSINESS_HOURS_END || "18", 10);
const BUSINESS_HOURS_ONLY = process.env.REPLY_BUSINESS_HOURS_ONLY === "true";

function randomDelayMinutes() {
  return Math.floor(Math.random() * (MAX_MINUTES - MIN_MINUTES + 1) + MIN_MINUTES);
}

function isWithinBusinessHours(date = new Date()) {
  const hour = date.getHours();
  return hour >= BUSINESS_HOURS_START && hour < BUSINESS_HOURS_END;
}

function msUntilBusinessHoursOpen(date = new Date()) {
  const next = new Date(date);
  next.setMinutes(0, 0, 0);

  if (date.getHours() >= BUSINESS_HOURS_END) {
    next.setDate(next.getDate() + 1);
  }
  next.setHours(BUSINESS_HOURS_START, 0, 0, 0);

  return Math.max(0, next.getTime() - date.getTime());
}

/**
 * Human-like delay: random 2–15 minutes, optionally deferred to business hours.
 */
function getReplyDelayMs({ useBusinessHours = BUSINESS_HOURS_ONLY } = {}) {
  const randomMs = randomDelayMinutes() * 60 * 1000;

  if (!useBusinessHours || isWithinBusinessHours()) {
    return randomMs;
  }

  return msUntilBusinessHoursOpen() + randomMs;
}

module.exports = {
  getReplyDelayMs,
  randomDelayMinutes,
  isWithinBusinessHours,
  msUntilBusinessHoursOpen,
};
