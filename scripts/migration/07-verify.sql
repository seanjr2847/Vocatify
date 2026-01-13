-- =====================================================
-- 07-verify.sql
-- Phase 7: Comprehensive Final Verification
-- =====================================================
-- Purpose: Final validation before production deployment and table swap
-- Safety: Read-only, no data modifications
-- Use: Run after all migration scripts to validate data integrity

BEGIN;

-- =====================================================
-- 1. Table Existence Check
-- =====================================================
DO $$
DECLARE
  missing_tables TEXT[];
BEGIN
  RAISE NOTICE '====================================';
  RAISE NOTICE '1. TABLE EXISTENCE VERIFICATION';
  RAISE NOTICE '====================================';

  SELECT array_agg(table_name) INTO missing_tables
  FROM (VALUES
    ('song_names'),
    ('artists'),
    ('song_artists'),
    ('pvs'),
    ('tags'),
    ('song_tags'),
    ('lyrics'),
    ('daily_view_counts_v2'),
    ('_migration_song_to_pv_mapping')
  ) expected(table_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = expected.table_name
  );

  IF missing_tables IS NOT NULL THEN
    RAISE EXCEPTION 'CRITICAL: Missing tables: %', array_to_string(missing_tables, ', ');
  END IF;

  RAISE NOTICE '✅ All required tables exist';
END $$;

-- =====================================================
-- 2. Row Count Verification
-- =====================================================
DO $$
DECLARE
  song_count BIGINT;
  song_name_count BIGINT;
  artist_count BIGINT;
  song_artist_count BIGINT;
  pv_count BIGINT;
  tag_count BIGINT;
  song_tag_count BIGINT;
  old_dvc_count BIGINT;
  new_dvc_count BIGINT;
  mapping_count BIGINT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE '2. ROW COUNT VERIFICATION';
  RAISE NOTICE '====================================';

  SELECT COUNT(*) INTO song_count FROM songs;
  SELECT COUNT(*) INTO song_name_count FROM song_names;
  SELECT COUNT(*) INTO artist_count FROM artists;
  SELECT COUNT(*) INTO song_artist_count FROM song_artists;
  SELECT COUNT(*) INTO pv_count FROM pvs;
  SELECT COUNT(*) INTO tag_count FROM tags;
  SELECT COUNT(*) INTO song_tag_count FROM song_tags;
  SELECT COUNT(*) INTO old_dvc_count FROM daily_view_counts;
  SELECT COUNT(*) INTO new_dvc_count FROM daily_view_counts_v2;
  SELECT COUNT(*) INTO mapping_count FROM _migration_song_to_pv_mapping;

  RAISE NOTICE 'songs: %', song_count;
  RAISE NOTICE 'song_names: %', song_name_count;
  RAISE NOTICE 'artists: %', artist_count;
  RAISE NOTICE 'song_artists: %', song_artist_count;
  RAISE NOTICE 'pvs: %', pv_count;
  RAISE NOTICE 'tags: %', tag_count;
  RAISE NOTICE 'song_tags: %', song_tag_count;
  RAISE NOTICE 'daily_view_counts (old): %', old_dvc_count;
  RAISE NOTICE 'daily_view_counts_v2 (new): %', new_dvc_count;
  RAISE NOTICE 'mapping table: %', mapping_count;

  -- Sanity checks
  IF song_count = 0 THEN
    RAISE EXCEPTION 'CRITICAL: songs table is empty!';
  END IF;

  IF pv_count = 0 THEN
    RAISE WARNING '⚠️  pvs table is empty - is this expected?';
  END IF;

  IF new_dvc_count = 0 AND old_dvc_count > 0 THEN
    RAISE EXCEPTION 'CRITICAL: daily_view_counts_v2 is empty but old table has % records!', old_dvc_count;
  END IF;

  IF mapping_count != pv_count THEN
    RAISE WARNING '⚠️  Mapping count (%) != PV count (%) - some PVs unmapped?', mapping_count, pv_count;
  END IF;

  RAISE NOTICE '✅ Row counts look reasonable';
END $$;

-- =====================================================
-- 3. Referential Integrity Verification
-- =====================================================
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE '3. REFERENTIAL INTEGRITY CHECK';
  RAISE NOTICE '====================================';

  -- song_names → songs
  SELECT COUNT(*) INTO orphan_count
  FROM song_names sn
  WHERE NOT EXISTS (SELECT 1 FROM songs WHERE vocadb_id = sn.song_id);

  IF orphan_count > 0 THEN
    RAISE WARNING '⚠️  % orphan records in song_names (no matching song)', orphan_count;
  ELSE
    RAISE NOTICE '✅ song_names: All references valid';
  END IF;

  -- song_artists → songs
  SELECT COUNT(*) INTO orphan_count
  FROM song_artists sa
  WHERE NOT EXISTS (SELECT 1 FROM songs WHERE vocadb_id = sa.song_id);

  IF orphan_count > 0 THEN
    RAISE WARNING '⚠️  % orphan records in song_artists (no matching song)', orphan_count;
  ELSE
    RAISE NOTICE '✅ song_artists → songs: All references valid';
  END IF;

  -- song_artists → artists
  SELECT COUNT(*) INTO orphan_count
  FROM song_artists sa
  WHERE NOT EXISTS (SELECT 1 FROM artists WHERE vocadb_id = sa.artist_id);

  IF orphan_count > 0 THEN
    RAISE WARNING '⚠️  % orphan records in song_artists (no matching artist)', orphan_count;
  ELSE
    RAISE NOTICE '✅ song_artists → artists: All references valid';
  END IF;

  -- pvs → songs
  SELECT COUNT(*) INTO orphan_count
  FROM pvs p
  WHERE NOT EXISTS (SELECT 1 FROM songs WHERE vocadb_id = p.song_id);

  IF orphan_count > 0 THEN
    RAISE WARNING '⚠️  % orphan records in pvs (no matching song)', orphan_count;
  ELSE
    RAISE NOTICE '✅ pvs → songs: All references valid';
  END IF;

  -- daily_view_counts_v2 → pvs
  SELECT COUNT(*) INTO orphan_count
  FROM daily_view_counts_v2 dvc
  WHERE NOT EXISTS (SELECT 1 FROM pvs WHERE id = dvc.pv_id);

  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'CRITICAL: % orphan records in daily_view_counts_v2 (no matching pv)!', orphan_count;
  ELSE
    RAISE NOTICE '✅ daily_view_counts_v2 → pvs: All references valid';
  END IF;

  -- song_tags → songs
  SELECT COUNT(*) INTO orphan_count
  FROM song_tags st
  WHERE NOT EXISTS (SELECT 1 FROM songs WHERE vocadb_id = st.song_id);

  IF orphan_count > 0 THEN
    RAISE WARNING '⚠️  % orphan records in song_tags (no matching song)', orphan_count;
  ELSE
    RAISE NOTICE '✅ song_tags → songs: All references valid';
  END IF;

  -- song_tags → tags
  SELECT COUNT(*) INTO orphan_count
  FROM song_tags st
  WHERE NOT EXISTS (SELECT 1 FROM tags WHERE vocadb_id = st.tag_id);

  IF orphan_count > 0 THEN
    RAISE WARNING '⚠️  % orphan records in song_tags (no matching tag)', orphan_count;
  ELSE
    RAISE NOTICE '✅ song_tags → tags: All references valid';
  END IF;
END $$;

-- =====================================================
-- 4. Data Quality Checks
-- =====================================================
DO $$
DECLARE
  null_default_name_count INTEGER;
  duplicate_pv_count INTEGER;
  negative_views_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE '4. DATA QUALITY VERIFICATION';
  RAISE NOTICE '====================================';

  -- Check for NULL default_name
  SELECT COUNT(*) INTO null_default_name_count
  FROM songs
  WHERE default_name IS NULL;

  IF null_default_name_count > 0 THEN
    RAISE WARNING '⚠️  % songs have NULL default_name', null_default_name_count;
  ELSE
    RAISE NOTICE '✅ All songs have default_name populated';
  END IF;

  -- Check for duplicate PVs (same song, service, pv_id)
  SELECT COUNT(*) INTO duplicate_pv_count
  FROM (
    SELECT song_id, service, pv_id, COUNT(*) as cnt
    FROM pvs
    GROUP BY song_id, service, pv_id
    HAVING COUNT(*) > 1
  ) dups;

  IF duplicate_pv_count > 0 THEN
    RAISE WARNING '⚠️  % duplicate PV records found', duplicate_pv_count;
  ELSE
    RAISE NOTICE '✅ No duplicate PVs';
  END IF;

  -- Check for negative view counts
  SELECT COUNT(*) INTO negative_views_count
  FROM daily_view_counts_v2
  WHERE total_views < 0;

  IF negative_views_count > 0 THEN
    RAISE EXCEPTION 'CRITICAL: % records have negative view counts!', negative_views_count;
  ELSE
    RAISE NOTICE '✅ All view counts are non-negative';
  END IF;
END $$;

-- =====================================================
-- 5. daily_view_counts Migration Verification (Critical!)
-- =====================================================
DO $$
DECLARE
  old_count BIGINT;
  new_count BIGINT;
  old_sum BIGINT;
  new_sum BIGINT;
  count_diff BIGINT;
  sum_diff BIGINT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE '5. DAILY_VIEW_COUNTS MIGRATION CHECK';
  RAISE NOTICE '====================================';

  SELECT COUNT(*), COALESCE(SUM(total_views), 0) INTO old_count, old_sum
  FROM daily_view_counts;

  SELECT COUNT(*), COALESCE(SUM(total_views), 0) INTO new_count, new_sum
  FROM daily_view_counts_v2;

  count_diff := ABS(old_count - new_count);
  sum_diff := ABS(old_sum - new_sum);

  RAISE NOTICE 'Old table: % records, % total views', old_count, old_sum;
  RAISE NOTICE 'New table: % records, % total views', new_count, new_sum;
  RAISE NOTICE 'Difference: % records, % views', count_diff, sum_diff;

  IF count_diff = 0 AND sum_diff = 0 THEN
    RAISE NOTICE '✅✅✅ PERFECT MATCH - No data loss!';
  ELSIF count_diff > 0 OR sum_diff > 0 THEN
    DECLARE
      loss_percentage NUMERIC;
    BEGIN
      loss_percentage := ROUND((sum_diff::NUMERIC / NULLIF(old_sum, 0)) * 100, 4);
      RAISE WARNING '⚠️  Data difference detected: %.4f%% of total views', loss_percentage;

      IF loss_percentage > 0.01 THEN  -- More than 0.01% loss
        RAISE EXCEPTION 'CRITICAL: Unacceptable data loss (%.4f%%)!', loss_percentage;
      ELSE
        RAISE NOTICE 'Acceptable minor difference (%.4f%% - likely rounding)', loss_percentage;
      END IF;
    END;
  END IF;
END $$;

-- =====================================================
-- 6. Sample Data Comparison (100 random songs)
-- =====================================================
CREATE TEMP TABLE _sample_comparison AS
SELECT
  s.vocadb_id,
  s.title,
  m.pv_id,
  old_data.record_count as old_count,
  new_data.record_count as new_count,
  old_data.total_views as old_views,
  new_data.total_views as new_views,
  CASE
    WHEN old_data.record_count = new_data.record_count
     AND old_data.total_views = new_data.total_views
    THEN 'MATCH'
    ELSE 'MISMATCH'
  END as status
FROM (
  SELECT DISTINCT song_id
  FROM daily_view_counts
  ORDER BY random()
  LIMIT 100
) sample
INNER JOIN songs s ON s.vocadb_id = sample.song_id
INNER JOIN _migration_song_to_pv_mapping m ON m.song_id = s.vocadb_id
LEFT JOIN LATERAL (
  SELECT COUNT(*) as record_count, COALESCE(SUM(total_views), 0) as total_views
  FROM daily_view_counts
  WHERE song_id = s.vocadb_id
) old_data ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) as record_count, COALESCE(SUM(total_views), 0) as total_views
  FROM daily_view_counts_v2
  WHERE pv_id = m.pv_id
) new_data ON true;

DO $$
DECLARE
  mismatch_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE '6. SAMPLE DATA COMPARISON (100 songs)';
  RAISE NOTICE '====================================';

  SELECT COUNT(*) INTO mismatch_count
  FROM _sample_comparison
  WHERE status = 'MISMATCH';

  IF mismatch_count = 0 THEN
    RAISE NOTICE '✅ All 100 sample songs match perfectly!';
  ELSE
    RAISE WARNING '⚠️  % out of 100 sample songs have mismatches', mismatch_count;

    -- Show mismatched samples
    RAISE NOTICE 'Mismatched samples:';
    FOR rec IN (
      SELECT * FROM _sample_comparison
      WHERE status = 'MISMATCH'
      LIMIT 5
    )
    LOOP
      RAISE NOTICE '  Song % (%): old=%/%, new=%/%',
        rec.vocadb_id, rec.title, rec.old_count, rec.old_views, rec.new_count, rec.new_views;
    END LOOP;
  END IF;
END $$;

DROP TABLE _sample_comparison;

-- =====================================================
-- 7. Index Verification
-- =====================================================
DO $$
DECLARE
  missing_indexes TEXT[];
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE '7. INDEX VERIFICATION';
  RAISE NOTICE '====================================';

  -- Check critical indexes exist
  SELECT array_agg(index_name) INTO missing_indexes
  FROM (VALUES
    ('idx_song_names_song_id'),
    ('idx_pvs_song_id'),
    ('idx_pvs_service'),
    ('idx_daily_view_counts_v2_pv_id'),
    ('idx_daily_view_counts_v2_recorded_date'),
    ('idx_song_artists_song_id'),
    ('idx_song_tags_song_id')
  ) expected(index_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = expected.index_name
  );

  IF missing_indexes IS NOT NULL THEN
    RAISE WARNING '⚠️  Missing indexes: %', array_to_string(missing_indexes, ', ');
  ELSE
    RAISE NOTICE '✅ All critical indexes exist';
  END IF;
END $$;

-- =====================================================
-- 8. Final Summary Report
-- =====================================================
RAISE NOTICE '';
RAISE NOTICE '====================================';
RAISE NOTICE 'FINAL VERIFICATION SUMMARY';
RAISE NOTICE '====================================';

SELECT
  table_name,
  row_count,
  pg_size_pretty(table_size) as size
FROM (
  SELECT 'songs' as table_name, COUNT(*) as row_count, pg_total_relation_size('songs') as table_size FROM songs
  UNION ALL
  SELECT 'song_names', COUNT(*), pg_total_relation_size('song_names') FROM song_names
  UNION ALL
  SELECT 'artists', COUNT(*), pg_total_relation_size('artists') FROM artists
  UNION ALL
  SELECT 'song_artists', COUNT(*), pg_total_relation_size('song_artists') FROM song_artists
  UNION ALL
  SELECT 'pvs', COUNT(*), pg_total_relation_size('pvs') FROM pvs
  UNION ALL
  SELECT 'tags', COUNT(*), pg_total_relation_size('tags') FROM tags
  UNION ALL
  SELECT 'song_tags', COUNT(*), pg_total_relation_size('song_tags') FROM song_tags
  UNION ALL
  SELECT 'daily_view_counts (old)', COUNT(*), pg_total_relation_size('daily_view_counts') FROM daily_view_counts
  UNION ALL
  SELECT 'daily_view_counts_v2 (new)', COUNT(*), pg_total_relation_size('daily_view_counts_v2') FROM daily_view_counts_v2
) tables
ORDER BY row_count DESC;

COMMIT;

-- =====================================================
-- Migration Script 07: COMPLETED
-- =====================================================
-- ✅ If all checks passed, you are ready for deployment:
--
-- DEPLOYMENT STEPS:
-- 1. Backup Neon database (pg_dump)
-- 2. Pause all crawlers
-- 3. Run atomic table swap:
--    BEGIN;
--    ALTER TABLE daily_view_counts RENAME TO daily_view_counts_old;
--    ALTER TABLE daily_view_counts_v2 RENAME TO daily_view_counts;
--    COMMIT;
-- 4. Deploy code (git push)
-- 5. Verify production site works
-- 6. Monitor for 7 days
-- 7. Clean up old tables and columns:
--    DROP TABLE daily_view_counts_old;
--    DROP TABLE _migration_song_to_pv_mapping;
--    ALTER TABLE songs DROP COLUMN title, title_english, ...;
