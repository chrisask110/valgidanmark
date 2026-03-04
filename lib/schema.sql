-- Run this once against your Vercel Postgres database.
-- In the Vercel dashboard: Storage → your DB → Query tab.

CREATE TABLE IF NOT EXISTS polls (
  id         SERIAL PRIMARY KEY,
  date       DATE         NOT NULL,
  pollster   VARCHAR(100) NOT NULL,
  n          INTEGER      NOT NULL DEFAULT 0,
  -- Party percentages stored as JSON: {"A":21.6,"F":13.5,"V":10.8,...}
  parties    TEXT         NOT NULL DEFAULT '{}',
  source_url TEXT,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (date, pollster)
);

CREATE INDEX IF NOT EXISTS polls_date_idx ON polls (date DESC);
