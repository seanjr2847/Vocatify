-- =====================================================
-- 05-populate-tags.sql
-- Phase 5: Parse and populate tags from comma-separated strings
-- =====================================================
-- Purpose: Extract tags from songs.tags column into normalized tags table
-- Challenge: tags stored as "tag1,tag2,tag3" strings (no spaces)
-- Safety: Read-only on songs, inserts into tags and song_tags
-- Rollback: DELETE FROM song_tags; DELETE FROM tags;

BEGIN;

-- =====================================================
-- 1. Create temporary table for parsed tags
-- =====================================================
CREATE TEMP TABLE _parsed_tags AS
SELECT DISTINCT
  lower(trim(unnest(string_to_array(tags, ',')))) as tag_name
FROM songs
WHERE tags IS NOT NULL
  AND length(trim(tags)) > 0;

-- Clean up empty tags
DELETE FROM _parsed_tags
WHERE length(trim(tag_name)) = 0;

-- =====================================================
-- 2. Generate vocadb_id for tags (use hash as ID)
-- =====================================================
CREATE TEMP TABLE _tags_with_ids AS
SELECT
  ('x' || md5(tag_name))::bit(32)::int as vocadb_id,
  tag_name as name,
  NULL as category_name  -- Category not available in old schema
FROM _parsed_tags;

-- =====================================================
-- 3. Insert into tags table
-- =====================================================
INSERT INTO tags (vocadb_id, name, category_name)
SELECT
  vocadb_id,
  name,
  category_name
FROM _tags_with_ids
ON CONFLICT (name) DO UPDATE
SET
  vocadb_id = EXCLUDED.vocadb_id,
  category_name = COALESCE(EXCLUDED.category_name, tags.category_name);

-- =====================================================
-- 4. Create song-tag relationships
-- =====================================================
-- Parse each song's tags string and link to tag records
INSERT INTO song_tags (song_id, tag_id, count)
SELECT DISTINCT
  s.vocadb_id as song_id,
  t.vocadb_id as tag_id,
  1 as count  -- Default count since we don't have vote data
FROM songs s
CROSS JOIN LATERAL unnest(string_to_array(s.tags, ',')) as tag_name_raw
INNER JOIN tags t ON lower(trim(tag_name_raw)) = t.name
WHERE s.tags IS NOT NULL
  AND length(trim(s.tags)) > 0
ON CONFLICT (song_id, tag_id) DO NOTHING;

-- =====================================================
-- Verification
-- =====================================================
DO $$
DECLARE
  total_tags INTEGER;
  total_relationships INTEGER;
  songs_with_tags INTEGER;
  songs_without_tags INTEGER;
  avg_tags_per_song NUMERIC;
BEGIN
  SELECT COUNT(*) INTO total_tags FROM tags;
  SELECT COUNT(*) INTO total_relationships FROM song_tags;
  SELECT COUNT(DISTINCT song_id) INTO songs_with_tags FROM song_tags;

  SELECT COUNT(*) INTO songs_without_tags
  FROM songs
  WHERE tags IS NOT NULL
    AND length(trim(tags)) > 0
    AND vocadb_id NOT IN (SELECT song_id FROM song_tags);

  IF songs_with_tags > 0 THEN
    avg_tags_per_song := ROUND(
      total_relationships::NUMERIC / songs_with_tags,
      2
    );
  ELSE
    avg_tags_per_song := 0;
  END IF;

  RAISE NOTICE 'Total unique tags: %', total_tags;
  RAISE NOTICE 'Total song-tag relationships: %', total_relationships;
  RAISE NOTICE 'Songs with tags: %', songs_with_tags;
  RAISE NOTICE 'Songs without tags: %', songs_without_tags;
  RAISE NOTICE 'Average tags per song: %', avg_tags_per_song;

  IF songs_without_tags > 0 THEN
    RAISE WARNING '% songs have tag data but no relationships created', songs_without_tags;
  END IF;

  IF total_tags = 0 THEN
    RAISE WARNING 'No tags were created (this may be normal if songs have no tags)';
  END IF;

  RAISE NOTICE 'SUCCESS: Tags and relationships populated';
END $$;

-- Top 30 tags by usage
SELECT
  t.name,
  COUNT(st.song_id) as song_count,
  ROUND(COUNT(st.song_id) * 100.0 / (SELECT COUNT(DISTINCT song_id) FROM song_tags), 2) as usage_percentage
FROM tags t
LEFT JOIN song_tags st ON st.tag_id = t.vocadb_id
GROUP BY t.vocadb_id, t.name
ORDER BY song_count DESC
LIMIT 30;

-- Songs with most tags (sample)
SELECT
  s.vocadb_id,
  s.title,
  COUNT(st.tag_id) as tag_count,
  string_agg(t.name, ', ' ORDER BY t.name) as tags
FROM songs s
JOIN song_tags st ON st.song_id = s.vocadb_id
JOIN tags t ON t.vocadb_id = st.tag_id
GROUP BY s.vocadb_id, s.title
ORDER BY tag_count DESC
LIMIT 10;

-- Tag distribution histogram
SELECT
  tag_count_bucket,
  COUNT(*) as songs
FROM (
  SELECT
    song_id,
    COUNT(*) as tag_count,
    CASE
      WHEN COUNT(*) = 0 THEN '0 tags'
      WHEN COUNT(*) BETWEEN 1 AND 3 THEN '1-3 tags'
      WHEN COUNT(*) BETWEEN 4 AND 6 THEN '4-6 tags'
      WHEN COUNT(*) BETWEEN 7 AND 10 THEN '7-10 tags'
      ELSE '11+ tags'
    END as tag_count_bucket
  FROM song_tags
  GROUP BY song_id
) tag_counts
GROUP BY tag_count_bucket
ORDER BY
  CASE tag_count_bucket
    WHEN '0 tags' THEN 1
    WHEN '1-3 tags' THEN 2
    WHEN '4-6 tags' THEN 3
    WHEN '7-10 tags' THEN 4
    ELSE 5
  END;

-- Clean up temp tables
DROP TABLE _parsed_tags;
DROP TABLE _tags_with_ids;

COMMIT;

-- =====================================================
-- Migration Script 05: COMPLETED
-- =====================================================
-- Next: Run 06-remap-daily-counts.sql (MOST CRITICAL!)
