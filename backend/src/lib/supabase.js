const { createClient } = require("@supabase/supabase-js");

if (!process.env.SUPABASE_URL) {
  console.warn("[startup] SUPABASE_URL is not set — database routes will fail at runtime");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[startup] SUPABASE_SERVICE_ROLE_KEY is not set — database routes will fail at runtime"
  );
}

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let client;

function supabase() {
  if (!client) {
    client = getSupabase();
  }
  return client;
}

module.exports = { supabase, getSupabase };
