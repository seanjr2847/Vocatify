-- =====================================================
-- 02-populate-song-names.sql
-- Phase 2: Populate song_names from existing title columns
-- =====================================================
-- Purpose: Extract multi-language titles from songs table into normalized song_names table
-- Safety: Read-only on songs table, only inserts into song_names
-- Rollback: DELETE FROM song_names;

BEGIN;

-- =====================================================
-- 1. Populate default_name in songs table first
-- =====================================================
UPDATE songs
SET default_name = COALESCE(
  title,  -- Use the main title as default
  title_english,
  title_japanese,
  title_romaji
)
WHERE default_name IS NULL;

-- =====================================================
-- 2. Insert Korean titles (title_korean)
-- =====================================================
INSERT INTO song_names (song_id, language, value)
SELECT
  vocadb_id,
  'Korean' as language,
  title_korean as value
FROM songs
WHERE title_korean IS NOT NULL
  AND length(trim(title_korean)) > 0
ON CONFLICT (song_id, language) DO NOTHING;

-- =====================================================
-- 3. Insert English titles (title_english)
-- =====================================================
INSERT INTO song_names (song_id, language, value)
SELECT
  vocadb_id,
  'English' as language,
  title_english as value
FROM songs
WHERE title_english IS NOT NULL
  AND length(trim(title_english)) > 0
ON CONFLICT (song_id, language) DO NOTHING;

-- =====================================================
-- 4. Insert Japanese titles (title_japanese)
-- =====================================================
INSERT INTO song_names (song_id, language, value)
SELECT
  vocadb_id,
  'Japanese' as language,
  title_japanese as value
FROM songs
WHERE title_japanese IS NOT NULL
  AND length(trim(title_japanese)) > 0
ON CONFLICT (song_id, language) DO NOTHING;

-- =====================================================
-- 5. Insert Romaji titles (title_romaji)
-- =====================================================
INSERT INTO song_names (song_id, language, value)
SELECT
  vocadb_id,
  'Romaji' as language,
  title_romaji as value
FROM songs
WHERE title_romaji IS NOT NULL
  AND length(trim(title_romaji)) > 0
ON CONFLICT (song_id, language) DO NOTHING;

-- =====================================================
-- 6. Insert Original titles (title_original)
-- =====================================================
INSERT INTO song_names (song_id, language, value)
SELECT
  vocadb_id,
  'Original' as language,
  title_original as value
FROM songs
WHERE title_original IS NOT NULL
  AND length(trim(title_original)) > 0
ON CONFLICT (song_id, language) DO NOTHING;

-- =====================================================
-- 7. Insert main title if not already covered
-- =====================================================
-- This handles cases where title != any of the specific language titles
INSERT INTO song_names (song_id, language, value)
SELECT
  vocadb_id,
  'Unspecified' as language,
  title as value
FROM songs
WHERE title IS NOT NULL
  AND length(trim(title)) > 0
  -- Only insert if this title isn't already in song_names for this song
  AND NOT EXISTS (
    SELECT 1 FROM song_names sn
    WHERE sn.song_id = songs.vocadb_id
      AND sn.value = songs.title
  )
ON CONFLICT (song_id, language) DO NOTHING;

-- =====================================================
-- Verification
-- =====================================================
DO $$
DECLARE
  total_songs INTEGER;
  songs_with_names INTEGER;
  total_names INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_songs FROM songs;
  SELECT COUNT(DISTINCT song_id) INTO songs_with_names FROM song_names;
  SELECT COUNT(*) INTO total_names FROM song_names;

  RAISE NOTICE 'Total songs: %', total_songs;
  RAISE NOTICE 'Songs with names: %', songs_with_names;
  RAISE NOTICE 'Total song names: %', total_names;
  RAISE NOTICE 'Average names per song: %', ROUND(total_names::NUMERIC / NULLIF(songs_with_names, 0), 2);

  -- Warning if coverage is low
  IF songs_with_names < (total_songs * 0.9) THEN
    RAISE WARNING 'Less than 90%% of songs have name entries. Expected %, got %',
      total_songs, songs_with_names;
  END IF;

  -- Check default_name population
  SELECT COUNT(*) INTO total_songs
  FROM songs
  WHERE default_name IS NULL;

  IF total_songs > 0 THEN
    RAISE WARNING '% songs still have NULL default_name', total_songs;
  ELSE
    RAISE NOTICE 'SUCCESS: All songs have default_name populated';
  END IF;
END $$;

-- Language distribution report
SELECT
  language,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM song_names
GROUP BY language
ORDER BY count DESC;

COMMIT;

-- =====================================================
-- Migration Script 02: COMPLETED
-- =====================================================
-- Next: Run 03-populate-pvs.sql
