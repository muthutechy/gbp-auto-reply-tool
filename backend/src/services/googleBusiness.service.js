const { supabase } = require("../lib/supabase");
const { createMyBusinessClient, starRatingToNumber, parseReviewId } = require("../lib/google");
const googleTokenService = require("./googleToken.service");
const tenantsService = require("./tenants.service");
const { createError, fromSupabaseError } = require("../utils/errors");
const { retryWithBackoff } = require("./retry.service");

function getLocationParent(tenant) {
  if (!tenant.google_account_id || !tenant.google_location_id) {
    throw createError(
      "Google account/location not configured. Complete OAuth connect or set google_account_id and google_location_id.",
      400
    );
  }

  return `accounts/${tenant.google_account_id}/locations/${tenant.google_location_id}`;
}

function mapGoogleReview(review, tenantId) {
  const externalId = review.reviewId || parseReviewId(review.name);
  const rating = starRatingToNumber(review.starRating);

  return {
    tenant_id: tenantId,
    external_id: externalId,
    rating: rating ?? 3,
    comment: review.comment || null,
    reviewer_name: review.reviewer?.displayName || null,
    status: review.reviewReply?.comment ? "replied" : "pending",
    final_reply: review.reviewReply?.comment || null,
  };
}

async function fetchAndSyncReviews(tenantId, actor) {
  const tenant = await tenantsService.getTenantById(tenantId);

  if (actor.role !== "admin" && actor.tenantId !== tenantId) {
    throw createError("Access denied", 403);
  }

  const auth = await googleTokenService.getAuthenticatedClient(tenantId);
  const mybusiness = createMyBusinessClient(auth);
  const parent = getLocationParent(tenant);

  const allGoogleReviews = [];
  let pageToken;

  do {
    const page = pageToken;
    const response = await retryWithBackoff(() =>
      mybusiness.accounts.locations.reviews.list({
        parent,
        pageSize: 50,
        pageToken: page,
      })
    );

    const batch = response.data.reviews || [];
    allGoogleReviews.push(...batch);
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  const synced = [];

  for (const googleReview of allGoogleReviews) {
    const mapped = mapGoogleReview(googleReview, tenantId);

    const { data, error } = await supabase()
      .from("reviews")
      .upsert(mapped, { onConflict: "tenant_id,external_id" })
      .select()
      .single();

    if (error) throw fromSupabaseError(error);
    synced.push(data);
  }

  synced.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return synced;
}

async function postReviewReply(reviewId, replyText, actor) {
  if (!replyText?.trim()) {
    throw createError("reply is required", 400);
  }

  const { data: review, error: reviewError } = await supabase()
    .from("reviews")
    .select("*")
    .eq("id", reviewId)
    .single();

  if (reviewError || !review) {
    throw createError("Review not found", 404);
  }

  if (actor.role !== "admin" && actor.tenantId !== review.tenant_id) {
    throw createError("Access denied", 403);
  }

  if (!review.external_id) {
    throw createError("Review has no Google external_id — sync reviews first", 400);
  }

  const tenant = await tenantsService.getTenantById(review.tenant_id);
  const auth = await googleTokenService.getAuthenticatedClient(review.tenant_id);
  const mybusiness = createMyBusinessClient(auth);

  const reviewName = `${getLocationParent(tenant)}/reviews/${review.external_id}`;

  await retryWithBackoff(() =>
    mybusiness.accounts.locations.reviews.updateReply({
      name: reviewName,
      requestBody: { comment: replyText.trim() },
    })
  );

  const { data: updated, error: updateError } = await supabase()
    .from("reviews")
    .update({
      final_reply: replyText.trim(),
      status: "replied",
      replied_at: new Date().toISOString(),
    })
    .eq("id", reviewId)
    .select()
    .single();

  if (updateError) throw fromSupabaseError(updateError);
  return updated;
}

module.exports = { fetchAndSyncReviews, postReviewReply };
