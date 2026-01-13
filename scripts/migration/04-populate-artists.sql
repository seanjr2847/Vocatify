-- =====================================================
-- 04-populate-artists.sql
-- Phase 4: Parse and populate artists from comma-separated strings
-- =====================================================
-- Purpose: Extract artist names from songs.artist column into normalized artists table
-- Challenge: artists stored as "Artist1, Artist2, Artist3" strings
-- Safety: Read-only on songs, inserts into artists and song_artists
-- Rollback: DELETE FROM song_artists; DELETE FROM artists;

BEGIN;

-- =====================================================
-- 1. Create temporary table for parsed artists
-- =====================================================
CREATE TEMP TABLE _parsed_artists AS
SELECT DISTINCT
  trim(unnest(string_to_array(artist, ','))) as artist_name,
  artist_type
FROM songs
WHERE artist IS NOT NULL
  AND length(trim(artist)) > 0;

-- Clean up empty names
DELETE FROM _parsed_artists
WHERE length(trim(artist_name)) = 0;

-- =====================================================
-- 2. Generate vocadb_id for artists (use hash as ID)
-- =====================================================
-- Since we don't have real VocaDB artist IDs, we'll generate them
-- using a hash of the artist name for consistency
CREATE TEMP TABLE _artists_with_ids AS
SELECT
  ('x' || md5(artist_name))::bit(32)::int as vocadb_id,  -- Generate consistent ID from name
  artist_name as name,
  COALESCE(artist_type, 'Vocaloid') as artist_type
FROM _parsed_artists;

-- =====================================================
-- 3. Insert into artists table
-- =====================================================
INSERT INTO artists (vocadb_id, name, artist_type, thumb_url)
SELECT DISTINCT
  vocadb_id,
  name,
  artist_type,
  NULL as thumb_url  -- No thumbnail data in old schema
FROM _artists_with_ids
ON CONFLICT (vocadb_id) DO UPDATE
SET
  name = EXCLUDED.name,
  artist_type = EXCLUDED.artist_type;

-- =====================================================
-- 4. Create song-artist relationships
-- =====================================================
-- Parse each song's artist string and link to artist records
INSERT INTO song_artists (song_id, artist_id, categories, roles, is_support)
SELECT DISTINCT
  s.vocadb_id as song_id,
  a.vocadb_id as artist_id,
  'Vocalist' as categories,  -- Default category since we don't have this data
  NULL as roles,
  false as is_support
FROM songs s
CROSS JOIN LATERAL unnest(string_to_array(s.artist, ',')) as artist_name_raw
INNER JOIN artists a ON trim(artist_name_raw) = a.name
WHERE s.artist IS NOT NULL
  AND length(trim(s.artist)) > 0
ON CONFLICT (song_id, artist_id) DO NOTHING;

-- =====================================================
-- Verification
-- =====================================================
DO $$
DECLARE
  total_artists INTEGER;
  total_relationships INTEGER;
  songs_with_artists INTEGER;
  songs_without_artists INTEGER;
  avg_artists_per_song NUMERIC;
BEGIN
  SELECT COUNT(*) INTO total_artists FROM artists;
  SELECT COUNT(*) INTO total_relationships FROM song_artists;
  SELECT COUNT(DISTINCT song_id) INTO songs_with_artists FROM song_artists;

  SELECT COUNT(*) INTO songs_without_artists
  FROM songs
  WHERE artist IS NOT NULL
    AND length(trim(artist)) > 0
    AND vocadb_id NOT IN (SELECT song_id FROM song_artists);

  IF songs_with_artists > 0 THEN
    avg_artists_per_song := ROUND(
      total_relationships::NUMERIC / songs_with_artists,
      2
    );
  ELSE
    avg_artists_per_song := 0;
  END IF;

  RAISE NOTICE 'Total unique artists: %', total_artists;
  RAISE NOTICE 'Total song-artist relationships: %', total_relationships;
  RAISE NOTICE 'Songs with artists: %', songs_with_artists;
  RAISE NOTICE 'Songs without artists: %', songs_without_artists;
  RAISE NOTICE 'Average artists per song: %', avg_artists_per_song;

  IF songs_without_artists > 0 THEN
    RAISE WARNING '% songs have artist data but no relationships created', songs_without_artists;
  END IF;

  IF total_artists = 0 THEN
    RAISE EXCEPTION 'CRITICAL: No artists were created!';
  END IF;

  IF total_relationships = 0 THEN
    RAISE EXCEPTION 'CRITICAL: No song-artist relationships were created!';
  END IF;

  RAISE NOTICE 'SUCCESS: Artists and relationships populated';
END $$;

-- Top 20 artists by song count
SELECT
  a.name,
  a.artist_type,
  COUNT(sa.song_id) as song_count
FROM artists a
LEFT JOIN song_artists sa ON sa.artist_id = a.vocadb_id
GROUP BY a.vocadb_id, a.name, a.artist_type
ORDER BY song_count DESC
LIMIT 20;

-- Songs with multiple artists (sample)
SELECT
  s.vocadb_id,
  s.title,
  COUNT(sa.artist_id) as artist_count,
  string_agg(a.name, ', ' ORDER BY a.name) as artists
FROM songs s
JOIN song_artists sa ON sa.song_id = s.vocadb_id
JOIN artists a ON a.vocadb_id = sa.artist_id
GROUP BY s.vocadb_id, s.title
HAVING COUNT(sa.artist_id) > 1
ORDER BY artist_count DESC
LIMIT 10;

-- Clean up temp tables
DROP TABLE _parsed_artists;
DROP TABLE _artists_with_ids;

COMMIT;

-- =====================================================
-- Migration Script 04: COMPLETED
-- =====================================================
-- Next: Run 05-populate-tags.sql
