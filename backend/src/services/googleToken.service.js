const { supabase } = require("../lib/supabase");
const { encrypt, decrypt } = require("../lib/encrypt");
const { createOAuth2Client } = require("../lib/google");
const { createError, fromSupabaseError } = require("../utils/errors");

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

async function saveTokens(tenantId, { access_token, refresh_token, expiry_date }) {
  if (!refresh_token) {
    throw createError("Google did not return a refresh token. Re-connect with prompt=consent.", 400);
  }

  const expiry = new Date(expiry_date || Date.now() + 3600 * 1000);

  const row = {
    tenant_id: tenantId,
    access_token: encrypt(access_token),
    refresh_token: encrypt(refresh_token),
    expiry: expiry.toISOString(),
  };

  const { data, error } = await supabase()
    .from("google_tokens")
    .upsert(row, { onConflict: "tenant_id" })
    .select("tenant_id, expiry, updated_at")
    .single();

  if (error) throw fromSupabaseError(error);
  return data;
}

async function getTokenRow(tenantId) {
  const { data, error } = await supabase()
    .from("google_tokens")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) throw fromSupabaseError(error);
  return data;
}

async function getAuthenticatedClient(tenantId) {
  const row = await getTokenRow(tenantId);
  if (!row) {
    throw createError("Google Business Profile is not connected for this tenant", 400);
  }

  const oauth2Client = createOAuth2Client();
  const accessToken = decrypt(row.access_token);
  const refreshToken = decrypt(row.refresh_token);
  const expiryMs = new Date(row.expiry).getTime();

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: expiryMs,
  });

  const needsRefresh = Date.now() >= expiryMs - REFRESH_BUFFER_MS;

  if (needsRefresh) {
    const { credentials } = await oauth2Client.refreshAccessToken();

    await saveTokens(tenantId, {
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token || refreshToken,
      expiry_date: credentials.expiry_date,
    });

    oauth2Client.setCredentials(credentials);
  }

  return oauth2Client;
}

async function isConnected(tenantId) {
  const row = await getTokenRow(tenantId);
  return Boolean(row);
}

async function disconnect(tenantId) {
  const { error } = await supabase().from("google_tokens").delete().eq("tenant_id", tenantId);
  if (error) throw fromSupabaseError(error);
  return { success: true };
}

module.exports = {
  saveTokens,
  getTokenRow,
  getAuthenticatedClient,
  isConnected,
  disconnect,
};
