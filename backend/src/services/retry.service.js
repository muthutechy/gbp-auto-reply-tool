function isRetryableError(err) {
  const status = err?.code || err?.status || err?.response?.status;
  if (status === 429 || status === 503 || status === 500 || status === 502) return true;
  if (err?.message?.includes("rate limit")) return true;
  if (err?.message?.includes("ECONNRESET")) return true;
  if (err?.message?.includes("ETIMEDOUT")) return true;
  return false;
}

async function retryWithBackoff(fn, retries = 5, initialDelayMs = 1000) {
  let delay = initialDelayMs;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const lastAttempt = i === retries - 1;
      if (lastAttempt || !isRetryableError(err)) {
        throw err;
      }
      await new Promise((res) => setTimeout(res, delay));
      delay *= 2;
    }
  }
}

module.exports = { retryWithBackoff, isRetryableError };
