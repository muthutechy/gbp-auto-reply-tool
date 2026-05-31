function createError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function fromSupabaseError(error, fallback = "Database error") {
  if (!error) return createError(fallback, 500);

  if (error.code === "23505") {
    return createError("Record already exists", 409);
  }
  if (error.code === "23503") {
    return createError("Related record not found", 404);
  }

  return createError(error.message || fallback, 500);
}

module.exports = { createError, fromSupabaseError };
