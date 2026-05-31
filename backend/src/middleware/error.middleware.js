function notFound(req, res, _next) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, _req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";

  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }

  res.status(status).json({
    error: message,
    ...(err.policyIssues ? { policyIssues: err.policyIssues } : {}),
    ...(process.env.NODE_ENV !== "production" && err.code ? { code: err.code } : {}),
  });
}

module.exports = { notFound, errorHandler };
