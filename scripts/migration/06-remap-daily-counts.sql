-- =====================================================
-- 06-remap-daily-counts.sql
-- Phase 6: Remap daily_view_counts from song_id to pv_id
-- =====================================================
-- ⚠️  MOST CRITICAL SCRIPT - Transforms historical view count data
-- Purpose: Convert daily_view_counts(song_id) → daily_view_counts_v2(pv_id)
-- Uses: _migration_song_to_pv_mapping table created in script 03
-- Safety: Creates new table, preserves original until verification passes
-- Rollback: DROP TABLE daily_view_counts_v2; (original table untouched)

BEGIN;

-- =====================================================
-- 1. Verify mapping table is populated
-- =====================================================
DO $$
DECLARE
  mapping_count INTEGER;
  old_dvc_song_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mapping_count FROM _migration_song_to_pv_mapping;
  SELECT COUNT(DISTINCT song_id) INTO old_dvc_song_count FROM daily_view_counts;

  RAISE NOTICE 'Mapping entries: %', mapping_count;
  RAISE NOTICE 'Unique songs in daily_view_counts: %', old_dvc_song_count;

  IF mapping_count = 0 THEN
    RAISE EXCEPTION 'CRITICAL: Mapping table is empty! Run 03-populate-pvs.sql first.';
  END IF;

  -- Check for unmapped songs in daily_view_counts
  DECLARE
    unmapped_count INTEGER;
  BEGIN
    SELECT COUNT(DISTINCT dvc.song_id) INTO unmapped_count
    FROM daily_view_counts dvc
    WHERE NOT EXISTS (
      SELECT 1 FROM _migration_song_to_pv_mapping m
      WHERE m.song_id = dvc.song_id
    );

    IF unmapped_count > 0 THEN
      RAISE WARNING '⚠️  % songs in daily_view_counts have no pv_id mapping! These records will be LOST!', unmapped_count;

      -- Show sample unmapped songs
      RAISE NOTICE 'Sample unmapped songs (first 10):';
      FOR rec IN (
        SELECT DISTINCT dvc.song_id, s.title
        FROM daily_view_counts dvc
        LEFT JOIN songs s ON s.vocadb_id = dvc.song_id
        WHERE NOT EXISTS (
          SELECT 1 FROM _migration_song_to_pv_mapping m
          WHERE m.song_id = dvc.song_id
        )
        LIMIT 10
      )
      LOOP
        RAISE NOTICE '  song_id: %, title: %', rec.song_id, rec.title;
      END LOOP;

      -- Decide whether to continue or abort
      -- Comment out next line to allow lossy migration if acceptable
      RAISE EXCEPTION 'Aborting due to unmapped songs. Review and fix mappings, or comment out this check to proceed with data loss.';
    END IF;
  END;

  RAISE NOTICE '✅ All songs in daily_view_counts have pv_id mappings';
END $$;

-- =====================================================
-- 2. Copy data from old table to new table with pv_id mapping
-- =====================================================
-- This is the critical transformation: song_id → pv_id
INSERT INTO daily_view_counts_v2 (pv_id, recorded_date, total_views)
SELECT
  m.pv_id,
  dvc.recorded_date,
  dvc.total_views
FROM daily_view_counts dvc
INNER JOIN _migration_song_to_pv_mapping m ON m.song_id = dvc.song_id
ON CONFLICT (pv_id, recorded_date) DO UPDATE
SET
  total_views = GREATEST(EXCLUDED.total_views, daily_view_counts_v2.total_views);  -- Keep highest value on conflict

-- =====================================================
-- 3. Comprehensive Verification (CRITICAL!)
-- =====================================================
DO $$
DECLARE
  old_record_count BIGINT;
  new_record_count BIGINT;
  old_sum_views BIGINT;
  new_sum_views BIGINT;
  old_date_range RECORD;
  new_date_range RECORD;
  sample_mismatch_count INTEGER;
BEGIN
  -- Count verification
  SELECT COUNT(*) INTO old_record_count FROM daily_view_counts;
  SELECT COUNT(*) INTO new_record_count FROM daily_view_counts_v2;

  RAISE NOTICE '====================================';
  RAISE NOTICE 'VERIFICATION RESULTS';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Old table records: %', old_record_count;
  RAISE NOTICE 'New table records: %', new_record_count;

  IF old_record_count != new_record_count THEN
    RAISE WARNING '⚠️  Record count mismatch! Old: %, New: %', old_record_count, new_record_count;
    RAISE WARNING 'Difference: % records', ABS(old_record_count - new_record_count);
  ELSE
    RAISE NOTICE '✅ Record counts match perfectly';
  END IF;

  -- Sum verification (most important check!)
  SELECT COALESCE(SUM(total_views), 0) INTO old_sum_views FROM daily_view_counts;
  SELECT COALESCE(SUM(total_views), 0) INTO new_sum_views FROM daily_view_counts_v2;

  RAISE NOTICE '';
  RAISE NOTICE 'Old table total views: %', old_sum_views;
  RAISE NOTICE 'New table total views: %', new_sum_views;

  IF old_sum_views != new_sum_views THEN
    RAISE WARNING '⚠️  Total views mismatch! Old: %, New: %', old_sum_views, new_sum_views;
    RAISE WARNING 'Difference: % views', ABS(old_sum_views - new_sum_views);
  ELSE
    RAISE NOTICE '✅ Total views match perfectly';
  END IF;

  -- Date range verification
  SELECT MIN(recorded_date), MAX(recorded_date) INTO old_date_range
  FROM daily_view_counts;

  SELECT MIN(recorded_date), MAX(recorded_date) INTO new_date_range
  FROM daily_view_counts_v2;

  RAISE NOTICE '';
  RAISE NOTICE 'Old table date range: % to %', old_date_range.min, old_date_range.max;
  RAISE NOTICE 'New table date range: % to %', new_date_range.min, new_date_range.max;

  IF old_date_range.min != new_date_range.min OR old_date_range.max != new_date_range.max THEN
    RAISE WARNING '⚠️  Date range mismatch!';
  ELSE
    RAISE NOTICE '✅ Date ranges match';
  END IF;

  -- Sample data verification (100 random songs)
  SELECT COUNT(*) INTO sample_mismatch_count
  FROM (
    SELECT
      dvc.song_id,
      dvc.recorded_date,
      dvc.total_views as old_views,
      dvc2.total_views as new_views
    FROM daily_view_counts dvc
    INNER JOIN _migration_song_to_pv_mapping m ON m.song_id = dvc.song_id
    INNER JOIN daily_view_counts_v2 dvc2 ON dvc2.pv_id = m.pv_id AND dvc2.recorded_date = dvc.recorded_date
    WHERE dvc.song_id IN (
      SELECT DISTINCT song_id FROM daily_view_counts
      ORDER BY random()
      LIMIT 100
    )
  ) sample
  WHERE old_views != new_views;

  RAISE NOTICE '';
  RAISE NOTICE 'Sample verification (100 random songs):';
  IF sample_mismatch_count > 0 THEN
    RAISE WARNING '⚠️  % sample records have view count mismatches!', sample_mismatch_count;
  ELSE
    RAISE NOTICE '✅ All 100 sample records match perfectly';
  END IF;

  -- Final verdict
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  IF old_record_count = new_record_count AND old_sum_views = new_sum_views AND sample_mismatch_count = 0 THEN
    RAISE NOTICE '✅✅✅ VERIFICATION PASSED ✅✅✅';
    RAISE NOTICE 'Safe to proceed with table swap in deployment';
  ELSE
    RAISE WARNING '⚠️⚠️⚠️  VERIFICATION FAILED ⚠️⚠️⚠️';
    RAISE WARNING 'DO NOT proceed with table swap!';
    RAISE WARNING 'Review mismatches and debug before continuing';
    -- Uncomment next line to abort on verification failure
    -- RAISE EXCEPTION 'Verification failed - aborting migration';
  END IF;
  RAISE NOTICE '====================================';
END $$;

-- =====================================================
-- 4. Detailed comparison report (first 20 songs)
-- =====================================================
SELECT
  s.vocadb_id as song_id,
  s.title,
  m.pv_id,
  COUNT(dvc_old.*) as old_record_count,
  COUNT(dvc_new.*) as new_record_count,
  COALESCE(SUM(dvc_old.total_views), 0) as old_total_views,
  COALESCE(SUM(dvc_new.total_views), 0) as new_total_views,
  CASE
    WHEN COUNT(dvc_old.*) = COUNT(dvc_new.*) AND COALESCE(SUM(dvc_old.total_views), 0) = COALESCE(SUM(dvc_new.total_views), 0)
    THEN '✅ MATCH'
    ELSE '⚠️  MISMATCH'
  END as status
FROM songs s
INNER JOIN _migration_song_to_pv_mapping m ON m.song_id = s.vocadb_id
LEFT JOIN daily_view_counts dvc_old ON dvc_old.song_id = s.vocadb_id
LEFT JOIN daily_view_counts_v2 dvc_new ON dvc_new.pv_id = m.pv_id
GROUP BY s.vocadb_id, s.title, m.pv_id
ORDER BY s.vocadb_id
LIMIT 20;

-- =====================================================
-- 5. Show summary statistics
-- =====================================================
SELECT
  'Old Table (song_id based)' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT song_id) as unique_songs,
  MIN(recorded_date) as earliest_date,
  MAX(recorded_date) as latest_date,
  SUM(total_views) as total_views_sum,
  pg_size_pretty(pg_total_relation_size('daily_view_counts')) as table_size
FROM daily_view_counts
UNION ALL
SELECT
  'New Table (pv_id based)' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT pv_id) as unique_pvs,
  MIN(recorded_date) as earliest_date,
  MAX(recorded_date) as latest_date,
  SUM(total_views) as total_views_sum,
  pg_size_pretty(pg_total_relation_size('daily_view_counts_v2')) as table_size
FROM daily_view_counts_v2;

COMMIT;

-- =====================================================
-- Migration Script 06: COMPLETED
-- =====================================================
-- ⚠️  CRITICAL: Review verification results before proceeding!
-- If verification passed, proceed to 07-verify.sql for final checks
-- If verification failed, DO NOT swap tables - debug and retry
--
-- Next: Run 07-verify.sql (comprehensive final verification)
