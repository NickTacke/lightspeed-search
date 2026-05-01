-- Bootstrap migration: extensions, RLS helpers, tsvector trigger function

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Generic updated_at trigger function (used by all tables with updatedAt)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tsvector trigger function for product_embeddings (search column auto-rebuild)
CREATE OR REPLACE FUNCTION rebuild_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple', coalesce(NEW.search_text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
