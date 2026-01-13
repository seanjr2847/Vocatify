-- =====================================================
-- 03-populate-pvs.sql
-- Phase 3: Populate pvs table from existing YouTube data
-- =====================================================
-- Purpose: Extract YouTube video info from songs table into pvs table
-- Critical: pvs.id (auto-generated) will be used for daily_view_counts remapping
-- Safety: Read-only on songs, only inserts into pvs
-- Rollback: DELETE FROM pvs; DELETE FROM _migration_song_to_pv_mapping;

BEGIN;

-- =====================================================
-- 1. Insert YouTube PVs from songs table
-- =====================================================
INSERT INTO pvs (
  song_id,
  pv_id,
  service,
  pv_type,
  name,
  url,
  thumb_url,
  disabled,
  view_count,
  view_count_updated_at
)
SELECT
  vocadb_id as song_id,
  youtube_id as pv_id,
  'Youtube' as service,
  'Original' as pv_type,  -- Assume Original for existing data
  title as name,  -- Use song title as PV name
  youtube_url as url,
  thumb_url,
  false as disabled,  -- Assume not disabled
  view_count,
  view_count_updated_at
FROM songs
WHERE youtube_id IS NOT NULL
  AND length(trim(youtube_id)) > 0
  AND youtube_url IS NOT NULL
ON CONFLICT (song_id, service, pv_id) DO UPDATE
SET
  view_count = EXCLUDED.view_count,
  view_count_updated_at = EXCLUDED.view_count_updated_at,
  thumb_url = COALESCE(EXCLUDED.thumb_url, pvs.thumb_url);

-- =====================================================
-- 2. Populate song_id -> pv_id mapping table
-- =====================================================
-- CRITICAL: This mapping will be used in script 06 to remap daily_view_counts
INSERT INTO _migration_song_to_pv_mapping (song_id, pv_id, youtube_id)
SELECT
  s.vocadb_id as song_id,
  p.id as pv_id,
  s.youtube_id
FROM songs s
INNER JOIN pvs p ON p.song_id = s.vocadb_id
  AND p.service = 'Youtube'
  AND p.pv_id = s.youtube_id
WHERE s.youtube_id IS NOT NULL
ON CONFLICT (song_id) DO UPDATE
SET
  pv_id = EXCLUDED.pv_id,
  youtube_id = EXCLUDED.youtube_id;

-- =====================================================
-- Verification
-- =====================================================
DO $$
DECLARE
  total_songs_with_youtube INTEGER;
  total_pvs INTEGER;
  total_mappings INTEGER;
  unmapped_songs INTEGER;
BEGIN
  -- Count songs with YouTube IDs
  SELECT COUNT(*) INTO total_songs_with_youtube
  FROM songs
  WHERE youtube_id IS NOT NULL
    AND length(trim(youtube_id)) > 0;

  -- Count PVs created
  SELECT COUNT(*) INTO total_pvs
  FROM pvs;

  -- Count mappings created
  SELECT COUNT(*) INTO total_mappings
  FROM _migration_song_to_pv_mapping;

  -- Count songs with YouTube but no mapping (ERROR condition)
  SELECT COUNT(*) INTO unmapped_songs
  FROM songs s
  WHERE s.youtube_id IS NOT NULL
    AND length(trim(s.youtube_id)) > 0
    AND NOT EXISTS (
      SELECT 1 FROM _migration_song_to_pv_mapping m
      WHERE m.song_id = s.vocadb_id
    );

  RAISE NOTICE 'Songs with YouTube IDs: %', total_songs_with_youtube;
  RAISE NOTICE 'PVs created: %', total_pvs;
  RAISE NOTICE 'Mappings created: %', total_mappings;
  RAISE NOTICE 'Unmapped songs: %', unmapped_songs;

  -- Critical check: All songs with YouTube must have mapping
  IF unmapped_songs > 0 THEN
    RAISE EXCEPTION 'CRITICAL: % songs with YouTube have no pv_id mapping!', unmapped_songs;
  END IF;

  -- Check PV count matches
  IF total_pvs != total_songs_with_youtube THEN
    RAISE WARNING 'PV count (%) does not match songs with YouTube (%)',
      total_pvs, total_songs_with_youtube;
  END IF;

  -- Check mapping count matches
  IF total_mappings != total_songs_with_youtube THEN
    RAISE EXCEPTION 'CRITICAL: Mapping count (%) does not match songs with YouTube (%)!',
      total_mappings, total_songs_with_youtube;
  END IF;

  RAISE NOTICE 'SUCCESS: All YouTube songs have pv_id mappings';
END $$;

-- Sample mapping report (first 10)
SELECT
  m.song_id,
  m.pv_id,
  m.youtube_id,
  s.title as song_title,
  p.view_count
FROM _migration_song_to_pv_mapping m
JOIN songs s ON s.vocadb_id = m.song_id
JOIN pvs p ON p.id = m.pv_id
ORDER BY m.song_id
LIMIT 10;

COMMIT;

-- =====================================================
-- Migration Script 03: COMPLETED
-- =====================================================
-- Next: Run 04-populate-artists.sql
