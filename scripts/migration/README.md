# Database Migration Guide: Denormalized → Normalized Schema

This directory contains SQL scripts to migrate Vocatify database from the old denormalized structure to the new normalized architecture.

## 🎯 Migration Overview

**Goal**: Transform database structure from 3 flat tables to 10 normalized tables while **preserving all existing data**.

**Critical Transformation**: `daily_view_counts(song_id)` → `daily_view_counts(pv_id)`

**Estimated Time**: 30-60 minutes depending on database size

**Risk Level**: MODERATE (data preserved with rollback capability at each step)

---

## 📋 Pre-Migration Checklist

### 1. Backup Database
```bash
# Set your DATABASE_URL environment variable first
export DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# Create backup with timestamp
pg_dump "$DATABASE_URL" > "vocatify_backup_$(date +%Y%m%d_%H%M%S).sql"
```

### 2. Pause Crawlers
Stop all automated cron jobs to prevent data changes during migration:
- VocaDB crawler (Daily 2:00 AM UTC)
- YouTube view counter (Daily 3:00 AM UTC)
- Korean title fetcher (Weekly Sunday 4:00 AM UTC)

**Temporary solution**: Update crawler progress records:
```sql
UPDATE crawler_progress SET status = 'paused' WHERE status = 'running';
```

### 3. Verify Environment
```bash
# Check database connection
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM songs;"

# Check available disk space (you'll need ~2x current DB size)
psql "$DATABASE_URL" -c "SELECT pg_size_pretty(pg_database_size(current_database()));"
```

---

## 🚀 Migration Execution

### Phase 1-5: Data Transformation (Safe - Preserves Original)

Execute scripts sequentially. Each script is **backward compatible** - it creates new structures without modifying old ones.

```bash
# Connect to database
psql "$DATABASE_URL"

# Execute migration scripts in order
\i scripts/migration/01-create-tables.sql
\i scripts/migration/02-populate-song-names.sql
\i scripts/migration/03-populate-pvs.sql
\i scripts/migration/04-populate-artists.sql
\i scripts/migration/05-populate-tags.sql
```

**Expected Output**: Each script will show:
- ✅ Success notices
- Row counts for verification
- Sample data reports

**What These Scripts Do**:
1. **01-create-tables.sql** (~2 min): Creates 9 new tables + new columns in songs
2. **02-populate-song-names.sql** (~1 min): Extracts multi-language titles
3. **03-populate-pvs.sql** (~2 min): Creates PV records + **critical song_id→pv_id mapping**
4. **04-populate-artists.sql** (~3 min): Parses comma-separated artists into normalized structure
5. **05-populate-tags.sql** (~2 min): Parses comma-separated tags into normalized structure

### Phase 6: Critical Data Remapping ⚠️

**MOST IMPORTANT SCRIPT** - Transforms historical view count data:

```bash
\i scripts/migration/06-remap-daily-counts.sql
```

**What This Does**:
- Copies all `daily_view_counts` records from old table (song_id) to new table (pv_id)
- Uses mapping table created in script 03
- Runs **comprehensive verification**:
  - Record count comparison
  - Total views sum comparison
  - Date range comparison
  - Sample data comparison (100 random songs)

**Expected Output**:
```
✅ Record counts match perfectly
✅ Total views match perfectly
✅ Date ranges match
✅ All 100 sample records match perfectly
✅✅✅ VERIFICATION PASSED ✅✅✅
```

**If Verification Fails**:
```
⚠️⚠️⚠️  VERIFICATION FAILED ⚠️⚠️⚠️
DO NOT proceed with table swap!
```
- Review error messages
- Check for unmapped songs
- Debug mapping issues
- Re-run script after fixes

### Phase 7: Final Verification

```bash
\i scripts/migration/07-verify.sql
```

**Comprehensive Checks**:
1. ✅ Table existence
2. ✅ Row counts
3. ✅ Referential integrity (foreign keys)
4. ✅ Data quality (NULL checks, duplicates)
5. ✅ Migration accuracy (old vs new data)
6. ✅ Sample comparison (100 random songs)
7. ✅ Index verification

**Expected Output**: All checks should pass with ✅

---

## 🔄 Deployment: Atomic Table Swap

**CRITICAL**: Only proceed if **all verification checks passed**.

### Step 1: Final Backup
```bash
pg_dump "$DATABASE_URL" > "vocatify_pre_swap_$(date +%Y%m%d_%H%M%S).sql"
```

### Step 2: Atomic Swap (Execute as single transaction)
```sql
BEGIN;

-- Rename old table (backup)
ALTER TABLE daily_view_counts RENAME TO daily_view_counts_old;

-- Promote new table to active
ALTER TABLE daily_view_counts_v2 RENAME TO daily_view_counts;

COMMIT;
```

**Verification**:
```sql
-- Check new table is active
SELECT COUNT(*) FROM daily_view_counts;

-- Old table is preserved as backup
SELECT COUNT(*) FROM daily_view_counts_old;
```

### Step 3: Update Prisma Schema (Already Done)
The `prisma/schema.prisma` already expects the new normalized structure. No changes needed.

### Step 4: Deploy Code
```bash
# Generate Prisma Client for new schema
npx prisma generate

# Test build
npm run build

# If successful, deploy
git add .
git commit -m "feat: database migration to normalized schema"
git push origin main
```

### Step 5: Resume Crawlers
```sql
UPDATE crawler_progress
SET status = 'completed', completed_at = NOW()
WHERE status = 'paused';
```

---

## ✅ Post-Migration Validation

### Immediate Checks (within 1 hour)

1. **Website Loads**:
   ```bash
   curl https://vocatify.vercel.app/
   curl https://vocatify.vercel.app/api/ranking/total?limit=10
   ```

2. **Rankings Work**:
   - Check total ranking: `/api/ranking/total`
   - Check daily ranking: `/api/ranking/daily`
   - Check weekly ranking: `/api/ranking/weekly`

3. **Search Works**:
   ```bash
   curl "https://vocatify.vercel.app/api/songs?query=test"
   ```

4. **Vercel Logs**:
   Check for any errors in Vercel deployment logs

### 24-Hour Monitoring

- Monitor Vercel function logs for errors
- Check database CPU/memory usage in Neon dashboard
- Verify cron jobs resume successfully
- Test song detail pages with view count history

### 7-Day Observation Period

**During this period**:
- Old table `daily_view_counts_old` remains as backup
- Old columns in `songs` table remain intact
- Mapping table `_migration_song_to_pv_mapping` preserved

**Monitor**:
- View count accuracy
- Ranking correctness
- No missing data reports
- Performance metrics

---

## 🧹 Final Cleanup (After 7 Days)

**Only if everything is working perfectly**:

```sql
BEGIN;

-- Drop old backup table
DROP TABLE IF EXISTS daily_view_counts_old;

-- Drop migration mapping table
DROP TABLE IF EXISTS _migration_song_to_pv_mapping;

-- Remove old denormalized columns from songs table
ALTER TABLE songs
  DROP COLUMN IF EXISTS title,
  DROP COLUMN IF EXISTS title_english,
  DROP COLUMN IF EXISTS title_japanese,
  DROP COLUMN IF EXISTS title_romaji,
  DROP COLUMN IF EXISTS title_korean,
  DROP COLUMN IF EXISTS title_original,
  DROP COLUMN IF EXISTS artist,
  DROP COLUMN IF EXISTS artist_type,
  DROP COLUMN IF EXISTS youtube_id,
  DROP COLUMN IF EXISTS youtube_url,
  DROP COLUMN IF EXISTS view_count,
  DROP COLUMN IF EXISTS view_count_updated_at,
  DROP COLUMN IF EXISTS tags;

-- Vacuum to reclaim disk space
VACUUM FULL songs;
VACUUM FULL daily_view_counts;

COMMIT;
```

**Expected Result**: ~30-50% reduction in database size due to normalization

---

## 🔙 Rollback Procedures

### Rollback After Table Swap (Within 7 days)

```sql
BEGIN;

-- Restore old table as active
ALTER TABLE daily_view_counts RENAME TO daily_view_counts_v2;
ALTER TABLE daily_view_counts_old RENAME TO daily_view_counts;

COMMIT;
```

### Full Rollback (Restore from Backup)

```bash
# Drop current database (CAREFUL!)
psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Restore from backup
psql "$DATABASE_URL" < vocatify_backup_YYYYMMDD_HHMMSS.sql
```

---

## 📊 Expected Changes

### Before Migration
```
Tables: 3 (songs, daily_view_counts, crawler_progress)
songs columns: 20
daily_view_counts PK: (song_id, recorded_date)
```

### After Migration
```
Tables: 10 (songs, song_names, artists, song_artists, pvs, tags, song_tags, lyrics, daily_view_counts, crawler_progress)
songs columns: 11 (normalized)
daily_view_counts PK: (pv_id, recorded_date)
```

### Data Volume (Example for 270K songs)
```
songs: 270,000 rows → 270,000 rows
+ song_names: ~1,080,000 rows (avg 4 titles per song)
+ artists: ~5,000 unique artists
+ song_artists: ~400,000 relationships
+ pvs: 270,000 video records
+ tags: ~3,000 unique tags
+ song_tags: ~2,000,000 relationships
+ daily_view_counts: Same record count, different structure
```

---

## ⚠️ Troubleshooting

### Issue: "Mapping table is empty"
**Cause**: Script 03 failed or wasn't run
**Fix**: Re-run `03-populate-pvs.sql`

### Issue: "Verification failed - record count mismatch"
**Cause**: Some songs have no PV mapping
**Fix**:
```sql
-- Find unmapped songs
SELECT s.vocadb_id, s.title
FROM songs s
WHERE s.youtube_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM _migration_song_to_pv_mapping m
    WHERE m.song_id = s.vocadb_id
  )
LIMIT 10;

-- Investigate why these songs have no PVs
```

### Issue: "Total views mismatch"
**Cause**: Data corruption or duplicate handling
**Fix**: Check sample comparison output in script 06 for specific mismatches

### Issue: Build still fails after migration
**Cause**: Prisma Client cache
**Fix**:
```bash
rm -rf node_modules/.prisma
npx prisma generate
npm run build
```

---

## 📞 Support

If migration fails:
1. **Don't panic** - original data is preserved
2. Review error messages in script output
3. Check verification sections for specific issues
4. Restore from backup if needed
5. Debug and retry

---

## ✨ Migration Benefits

After successful migration:
- ✅ Supports multiple videos per song (YouTube, NicoNico, Bilibili)
- ✅ Normalized artist data (no duplication)
- ✅ Searchable multi-language titles
- ✅ Tag-based filtering
- ✅ Better query performance with proper indexes
- ✅ Reduced storage (30-50% smaller)
- ✅ Easier to maintain and extend

---

**Good luck with your migration! 🚀**
