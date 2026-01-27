-- Phase 2: Add songs_enhanced denormalized table
-- Expected improvement: 70-80% on ranking queries
-- Replaces 5-7 CTEs + 4 JOINs with single table scan

-- Create songs_enhanced table
CREATE TABLE IF NOT EXISTS "songs_enhanced" (
  "song_id" INTEGER PRIMARY KEY,

  -- Basic song info
  "default_name" VARCHAR NOT NULL,
  "song_type" VARCHAR,
  "publish_date" DATE,
  "favorited_times" INTEGER DEFAULT 0 NOT NULL,
  "rating_score" INTEGER DEFAULT 0 NOT NULL,
  "length_seconds" INTEGER,
  "thumb_url" VARCHAR,

  -- Denormalized titles
  "title_korean" VARCHAR,
  "title_english" VARCHAR,
  "title_japanese" VARCHAR,
  "title_romaji" VARCHAR,

  -- Denormalized artist info
  "artist_string" VARCHAR,
  "artist_type_primary" VARCHAR,
  "is_vocaloid_song" BOOLEAN DEFAULT false NOT NULL,

  -- Denormalized YouTube info
  "youtube_pv_id" INTEGER,
  "youtube_id" VARCHAR,
  "youtube_url" VARCHAR,
  "view_count" BIGINT,
  "view_count_updated_at" TIMESTAMPTZ,

  -- Cached statistics
  "daily_increase" BIGINT,
  "daily_increase_date" DATE,
  "weekly_increase" BIGINT,
  "weekly_increase_date" DATE,

  -- Metadata
  "last_synced_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Basic indexes (Prisma-generated)
CREATE INDEX IF NOT EXISTS "songs_enhanced_view_count_idx"
ON "songs_enhanced" ("view_count" DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS "songs_enhanced_daily_increase_daily_increase_date_idx"
ON "songs_enhanced" ("daily_increase" DESC NULLS LAST, "daily_increase_date" DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS "songs_enhanced_weekly_increase_weekly_increase_date_idx"
ON "songs_enhanced" ("weekly_increase" DESC NULLS LAST, "weekly_increase_date" DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS "songs_enhanced_view_count_publish_date_idx"
ON "songs_enhanced" ("view_count" DESC NULLS LAST, "publish_date" DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS "songs_enhanced_is_vocaloid_song_idx"
ON "songs_enhanced" ("is_vocaloid_song");

-- Optimized partial indexes for ranking queries
-- These provide significant performance boost by filtering at index level

-- Total ranking index (Vocaloid songs only)
CREATE INDEX IF NOT EXISTS "idx_enhanced_total_rank"
ON "songs_enhanced" ("view_count" DESC NULLS LAST)
WHERE "is_vocaloid_song" = true;

-- Daily ranking index (Vocaloid songs with positive daily increase)
CREATE INDEX IF NOT EXISTS "idx_enhanced_daily_rank"
ON "songs_enhanced" ("daily_increase" DESC NULLS LAST, "daily_increase_date" DESC NULLS LAST)
WHERE "is_vocaloid_song" = true AND "daily_increase" > 0;

-- Weekly ranking index (Vocaloid songs with positive weekly increase)
CREATE INDEX IF NOT EXISTS "idx_enhanced_weekly_rank"
ON "songs_enhanced" ("weekly_increase" DESC NULLS LAST, "weekly_increase_date" DESC NULLS LAST)
WHERE "is_vocaloid_song" = true AND "weekly_increase" > 0;

-- New songs ranking index (Vocaloid songs, recent, under 5M views)
-- Note: Cannot use CURRENT_DATE in WHERE (not IMMUTABLE), so this is a basic index
-- Query optimizer will still benefit from the index
CREATE INDEX IF NOT EXISTS "idx_enhanced_new_rank"
ON "songs_enhanced" ("view_count" DESC NULLS LAST, "publish_date" DESC NULLS LAST)
WHERE "is_vocaloid_song" = true;

-- Comments for documentation
COMMENT ON TABLE "songs_enhanced" IS 'Denormalized table for optimized ranking queries. Updated by sync scripts. Expected 70-80% performance gain vs CTE approach.';
COMMENT ON COLUMN "songs_enhanced"."song_id" IS 'Primary key, references songs(vocadb_id)';
COMMENT ON COLUMN "songs_enhanced"."is_vocaloid_song" IS 'True if primary artist is a Vocaloid/UTAU/etc voice synthesizer';
COMMENT ON COLUMN "songs_enhanced"."daily_increase" IS 'Cached daily view count increase (updated daily)';
COMMENT ON COLUMN "songs_enhanced"."weekly_increase" IS 'Cached weekly view count increase (updated daily)';
COMMENT ON COLUMN "songs_enhanced"."last_synced_at" IS 'Last sync timestamp for monitoring data freshness';
