const { supabase } = require("../lib/supabase");
const { createOAuth2Client, SCOPES } = require("../lib/google");
const googleTokenService = require("./googleToken.service");
const { createError, fromSupabaseError } = require("../utils/errors");

function getAuthUrl(tenantId) {
  if (!tenantId) {
    throw createError("tenant_id is required", 400);
  }

  const oauth2Client = createOAuth2Client();
  const state = Buffer.from(JSON.stringify({ tenantId })).toString("base64url");

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

function parseState(state) {
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    if (!parsed.tenantId) throw new Error("missing tenantId");
    return parsed;
  } catch {
    throw createError("Invalid OAuth state", 400);
  }
}

async function handleCallback({ code, state }) {
  if (!code) {
    throw createError("Authorization code missing", 400);
  }

  const { tenantId } = parseState(state);
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  oauth2Client.setCredentials(tokens);
  await googleTokenService.saveTokens(tenantId, tokens);

  const { accountId, locationId } = await discoverDefaultLocation(oauth2Client);

  const { error } = await supabase()
    .from("tenants")
    .update({
      google_account_id: accountId,
      google_location_id: locationId,
    })
    .eq("id", tenantId);

  if (error) throw fromSupabaseError(error);

  return { tenantId, accountId, locationId, connected: true };
}

async function discoverDefaultLocation(auth) {
  const { google } = require("googleapis");
  const accountMgmt = google.mybusinessaccountmanagement({ version: "v1", auth });

  const accountsRes = await accountMgmt.accounts.list();
  const account = accountsRes.data.accounts?.[0];

  if (!account?.name) {
    throw createError("No Google Business accounts found for this user", 404);
  }

  const accountId = account.name.replace("accounts/", "");
  const businessInfo = google.mybusinessbusinessinformation({ version: "v1", auth });

  const locationsRes = await businessInfo.accounts.locations.list({
    parent: account.name,
    readMask: "name,title",
    pageSize: 1,
  });

  const location = locationsRes.data.locations?.[0];
  if (!location?.name) {
    throw createError("No business locations found for this account", 404);
  }

  const locationId = location.name.split("/").pop();
  return { accountId, locationId };
}

module.exports = { getAuthUrl, handleCallback, parseState };
