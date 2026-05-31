ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  ADD COLUMN IF NOT EXISTS keyword_used TEXT;

CREATE INDEX IF NOT EXISTS idx_reviews_tenant_sentiment ON reviews(tenant_id, sentiment);
