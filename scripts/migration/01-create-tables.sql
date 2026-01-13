-- =====================================================
-- 01-create-tables.sql
-- Phase 1: Create New Normalized Tables (Backward Compatible)
-- =====================================================
-- Purpose: Create all new normalized tables alongside existing structure
-- Safety: Uses IF NOT EXISTS, transactions, keeps old columns intact
-- Rollback: Simply drop new tables if needed

BEGIN;

-- =====================================================
-- 1. song_names - Multi-language song titles
-- =====================================================
CREATE TABLE IF NOT EXISTS song_names (
  id SERIAL PRIMARY KEY,
  song_id INTEGER NOT NULL,
  language TEXT NOT NULL,
  value TEXT NOT NULL,

  CONSTRAINT fk_song_names_song
    FOREIGN KEY (song_id)
    REFERENCES songs(vocadb_id)
    ON DELETE CASCADE,

  CONSTRAINT uq_song_names_song_language
    UNIQUE(song_id, language)
);

CREATE INDEX IF NOT EXISTS idx_song_names_song_id
  ON song_names(song_id);

CREATE INDEX IF NOT EXISTS idx_song_names_language
  ON song_names(language);

CREATE INDEX IF NOT EXISTS idx_song_names_value
  ON song_names(value);

-- =====================================================
-- 2. artists - Artist master table
-- =====================================================
CREATE TABLE IF NOT EXISTS artists (
  vocadb_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  artist_type TEXT NOT NULL,
  thumb_url TEXT,

  CONSTRAINT chk_artists_name_not_empty
    CHECK (length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_artists_name
  ON artists(name);

CREATE INDEX IF NOT EXISTS idx_artists_type
  ON artists(artist_type);

-- =====================================================
-- 3. song_artists - Song-Artist relationship table
-- =====================================================
CREATE TABLE IF NOT EXISTS song_artists (
  id SERIAL PRIMARY KEY,
  song_id INTEGER NOT NULL,
  artist_id INTEGER NOT NULL,
  categories TEXT NOT NULL,
  roles TEXT,
  is_support BOOLEAN DEFAULT false,

  CONSTRAINT fk_song_artists_song
    FOREIGN KEY (song_id)
    REFERENCES songs(vocadb_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_song_artists_artist
    FOREIGN KEY (artist_id)
    REFERENCES artists(vocadb_id)
    ON DELETE CASCADE,

  CONSTRAINT uq_song_artists_song_artist
    UNIQUE(song_id, artist_id)
);

CREATE INDEX IF NOT EXISTS idx_song_artists_song_id
  ON song_artists(song_id);

CREATE INDEX IF NOT EXISTS idx_song_artists_artist_id
  ON song_artists(artist_id);

CREATE INDEX IF NOT EXISTS idx_song_artists_categories
  ON song_artists(categories);

-- =====================================================
-- 4. pvs - Platform Videos (YouTube, NicoNico, Bilibili)
-- =====================================================
CREATE TABLE IF NOT EXISTS pvs (
  id SERIAL PRIMARY KEY,
  song_id INTEGER NOT NULL,
  pv_id TEXT NOT NULL,
  service TEXT NOT NULL,
  pv_type TEXT NOT NULL,
  name TEXT,
  url TEXT NOT NULL,
  thumb_url TEXT,
  disabled BOOLEAN DEFAULT false,

  -- View count data (moved from songs table)
  view_count BIGINT,
  view_count_updated_at TIMESTAMP,

  CONSTRAINT fk_pvs_song
    FOREIGN KEY (song_id)
    REFERENCES songs(vocadb_id)
    ON DELETE CASCADE,

  CONSTRAINT uq_pvs_song_service_pvid
    UNIQUE(song_id, service, pv_id),

  CONSTRAINT chk_pvs_service
    CHECK (service IN ('Youtube', 'NicoNicoDouga', 'Bilibili', 'Vimeo', 'Piapro', 'SoundCloud', 'File', 'LocalFile', 'Creofuga', 'Bandcamp'))
);

CREATE INDEX IF NOT EXISTS idx_pvs_song_id
  ON pvs(song_id);

CREATE INDEX IF NOT EXISTS idx_pvs_service
  ON pvs(service);

CREATE INDEX IF NOT EXISTS idx_pvs_pv_id
  ON pvs(pv_id);

CREATE INDEX IF NOT EXISTS idx_pvs_view_count
  ON pvs(view_count DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_pvs_disabled
  ON pvs(disabled);

-- =====================================================
-- 5. tags - Tag master table
-- =====================================================
CREATE TABLE IF NOT EXISTS tags (
  vocadb_id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category_name TEXT,

  CONSTRAINT chk_tags_name_not_empty
    CHECK (length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_tags_name
  ON tags(name);

CREATE INDEX IF NOT EXISTS idx_tags_category
  ON tags(category_name);

-- =====================================================
-- 6. song_tags - Song-Tag relationship table
-- =====================================================
CREATE TABLE IF NOT EXISTS song_tags (
  id SERIAL PRIMARY KEY,
  song_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  count INTEGER DEFAULT 0,

  CONSTRAINT fk_song_tags_song
    FOREIGN KEY (song_id)
    REFERENCES songs(vocadb_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_song_tags_tag
    FOREIGN KEY (tag_id)
    REFERENCES tags(vocadb_id)
    ON DELETE CASCADE,

  CONSTRAINT uq_song_tags_song_tag
    UNIQUE(song_id, tag_id),

  CONSTRAINT chk_song_tags_count_positive
    CHECK (count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_song_tags_song_id
  ON song_tags(song_id);

CREATE INDEX IF NOT EXISTS idx_song_tags_tag_id
  ON song_tags(tag_id);

CREATE INDEX IF NOT EXISTS idx_song_tags_count
  ON song_tags(count DESC);

-- =====================================================
-- 7. lyrics - Song lyrics table
-- =====================================================
CREATE TABLE IF NOT EXISTS lyrics (
  id SERIAL PRIMARY KEY,
  song_id INTEGER NOT NULL,
  translation_type TEXT NOT NULL,
  culture_code TEXT,
  source TEXT,
  url TEXT,
  value TEXT,

  CONSTRAINT fk_lyrics_song
    FOREIGN KEY (song_id)
    REFERENCES songs(vocadb_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lyrics_song_id
  ON lyrics(song_id);

CREATE INDEX IF NOT EXISTS idx_lyrics_translation_type
  ON lyrics(translation_type);

CREATE INDEX IF NOT EXISTS idx_lyrics_culture_code
  ON lyrics(culture_code);

-- =====================================================
-- 8. Add new columns to songs table (keep old columns!)
-- =====================================================
-- Add default_name (will be populated from title)
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS default_name TEXT;

-- Add length_seconds
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS length_seconds INTEGER;

-- Add create_date (VocaDB creation date)
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS create_date TIMESTAMP;

-- Add thumb_url_small (small thumbnail)
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS thumb_url_small TEXT;

-- Create index on new default_name column
CREATE INDEX IF NOT EXISTS idx_songs_default_name
  ON songs(default_name);

-- =====================================================
-- 9. Create temporary mapping table for daily_view_counts migration
-- =====================================================
-- This table will store song_id -> pv_id mappings for the critical migration step
CREATE TABLE IF NOT EXISTS _migration_song_to_pv_mapping (
  song_id INTEGER PRIMARY KEY,
  pv_id INTEGER NOT NULL,
  youtube_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_mapping_song
    FOREIGN KEY (song_id)
    REFERENCES songs(vocadb_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_mapping_pv
    FOREIGN KEY (pv_id)
    REFERENCES pvs(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mapping_pv_id
  ON _migration_song_to_pv_mapping(pv_id);

-- =====================================================
-- 10. Create new daily_view_counts_v2 table (pv_id based)
-- =====================================================
-- This will be populated in script 06, then swapped with old table
CREATE TABLE IF NOT EXISTS daily_view_counts_v2 (
  pv_id INTEGER NOT NULL,
  recorded_date DATE NOT NULL,
  total_views BIGINT NOT NULL,

  PRIMARY KEY (pv_id, recorded_date),

  CONSTRAINT fk_daily_view_counts_v2_pv
    FOREIGN KEY (pv_id)
    REFERENCES pvs(id)
    ON DELETE CASCADE,

  CONSTRAINT chk_daily_view_counts_v2_views_positive
    CHECK (total_views >= 0)
);

CREATE INDEX IF NOT EXISTS idx_daily_view_counts_v2_pv_id
  ON daily_view_counts_v2(pv_id);

CREATE INDEX IF NOT EXISTS idx_daily_view_counts_v2_recorded_date
  ON daily_view_counts_v2(recorded_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_view_counts_v2_total_views
  ON daily_view_counts_v2(total_views DESC);

-- =====================================================
-- Verification Queries
-- =====================================================
-- Check that all tables were created successfully
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'song_names', 'artists', 'song_artists', 'pvs',
      'tags', 'song_tags', 'lyrics',
      '_migration_song_to_pv_mapping', 'daily_view_counts_v2'
    );

  IF table_count < 9 THEN
    RAISE EXCEPTION 'Not all tables were created. Expected 9, got %', table_count;
  END IF;

  RAISE NOTICE 'SUCCESS: All 9 new tables created successfully';
END $$;

-- Check that new columns were added to songs
DO $$
DECLARE
  column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'songs'
    AND column_name IN ('default_name', 'length_seconds', 'create_date', 'thumb_url_small');

  IF column_count < 4 THEN
    RAISE EXCEPTION 'Not all columns were added to songs. Expected 4, got %', column_count;
  END IF;

  RAISE NOTICE 'SUCCESS: All 4 new columns added to songs table';
END $$;

-- Summary report
SELECT
  'song_names' as table_name,
  COUNT(*) as row_count,
  pg_size_pretty(pg_total_relation_size('song_names')) as total_size
FROM song_names
UNION ALL
SELECT 'artists', COUNT(*), pg_size_pretty(pg_total_relation_size('artists')) FROM artists
UNION ALL
SELECT 'song_artists', COUNT(*), pg_size_pretty(pg_total_relation_size('song_artists')) FROM song_artists
UNION ALL
SELECT 'pvs', COUNT(*), pg_size_pretty(pg_total_relation_size('pvs')) FROM pvs
UNION ALL
SELECT 'tags', COUNT(*), pg_size_pretty(pg_total_relation_size('tags')) FROM tags
UNION ALL
SELECT 'song_tags', COUNT(*), pg_size_pretty(pg_total_relation_size('song_tags')) FROM song_tags
UNION ALL
SELECT 'lyrics', COUNT(*), pg_size_pretty(pg_total_relation_size('lyrics')) FROM lyrics
UNION ALL
SELECT 'daily_view_counts_v2', COUNT(*), pg_size_pretty(pg_total_relation_size('daily_view_counts_v2')) FROM daily_view_counts_v2;

COMMIT;

-- =====================================================
-- Migration Script 01: COMPLETED
-- =====================================================
-- Next: Run 02-populate-song-names.sql
