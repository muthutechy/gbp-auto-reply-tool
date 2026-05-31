const DECISION = {
  AUTO_REPLY: "auto_reply",
  SEND_TO_DASHBOARD: "send_to_dashboard",
};

/**
 * Phase 5 decision engine — rating-based routing.
 */
function getDecision(rating) {
  if (rating >= 4) {
    return DECISION.AUTO_REPLY;
  }
  if (rating === 3) {
    return DECISION.AUTO_REPLY;
  }
  return DECISION.SEND_TO_DASHBOARD;
}

function shouldAutoReply(rating, autoReplyEnabled = true) {
  if (!autoReplyEnabled) {
    return false;
  }
  return getDecision(rating) === DECISION.AUTO_REPLY;
}

function usesReplyDelay(rating, autoReplyEnabled = true) {
  return shouldAutoReply(rating, autoReplyEnabled);
}

module.exports = {
  DECISION,
  getDecision,
  shouldAutoReply,
  usesReplyDelay,
};
