const bannedPhrases = [
  "best service",
  "number 1",
  "top service",
  "cheap and best",
];

function checkPolicy(reply) {
  const issues = [];

  if (!reply || typeof reply !== "string") {
    return { isValid: false, issues: ["Empty reply"] };
  }

  if (reply.length > 300) {
    issues.push("Too long");
  }

  const words = reply.toLowerCase().split(" ");
  const duplicates = words.filter((word, i) => words.indexOf(word) !== i);
  if (duplicates.length > 5) {
    issues.push("Too repetitive");
  }

  bannedPhrases.forEach((p) => {
    if (reply.toLowerCase().includes(p)) {
      issues.push(`Contains banned phrase: ${p}`);
    }
  });

  if (/https?:\/\/|www\./i.test(reply)) {
    issues.push("Contains URL");
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

function assertPolicyValid(reply) {
  const result = checkPolicy(reply);
  if (!result.isValid) {
    const err = new Error(`Policy violation: ${result.issues.join(", ")}`);
    err.status = 400;
    err.policyIssues = result.issues;
    throw err;
  }
  return result;
}

module.exports = { checkPolicy, assertPolicyValid, bannedPhrases };
