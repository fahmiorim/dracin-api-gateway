-- Migration: Create contents table for metadata caching
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS contents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform        TEXT NOT NULL CHECK (platform IN ('dramabox', 'reelshort', 'melolo', 'dramabite')),
  external_id     TEXT NOT NULL,
  title           TEXT,
  description     TEXT,
  cover_url       TEXT,
  episode_count   INTEGER DEFAULT 0,
  genres          TEXT[] DEFAULT '{}',
  metadata        JSONB DEFAULT '{}',
  last_synced_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, external_id)
);

-- Indexes for fast query
CREATE INDEX IF NOT EXISTS idx_contents_platform ON contents(platform);
CREATE INDEX IF NOT EXISTS idx_contents_title ON contents USING gin(to_tsvector('simple', title));
CREATE INDEX IF NOT EXISTS idx_contents_last_synced ON contents(last_synced_at DESC);

-- sync_logs table to track sync history
CREATE TABLE IF NOT EXISTS sync_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform      TEXT,
  status        TEXT CHECK (status IN ('running', 'success', 'failed')),
  items_synced  INTEGER DEFAULT 0,
  error_message TEXT,
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  finished_at   TIMESTAMPTZ
);
