-- Google OAuth tokens + tenant GBP location fields

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS google_account_id TEXT,
  ADD COLUMN IF NOT EXISTS google_location_id TEXT;

CREATE TABLE IF NOT EXISTS google_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expiry TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS google_tokens_updated_at ON google_tokens;
CREATE TRIGGER google_tokens_updated_at
  BEFORE UPDATE ON google_tokens
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
