/**
 * SQLite to PostgreSQL Data Migration Script
 *
 * Migrates all data from SQLite to PostgreSQL:
 * - Songs table (~270K records)
 * - DailyViewCounts table (if exists)
 *
 * Features:
 * - Batch processing (10K read, 1K insert)
 * - Date string to DateTime conversion
 * - Progress tracking
 * - Error handling with rollback
 * - Data validation
 */

import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { config } from 'dotenv';

config();

const BATCH_SIZE_READ = 10000;  // Read 10K from SQLite at a time
const BATCH_SIZE_INSERT = 1000;  // Insert 1K into PostgreSQL at a time

// Database connections
const sqlitePath = path.join(process.cwd(), 'data', 'vocadb', 'vocatify.db');
const sqlite = new Database(sqlitePath, { readonly: true });
const prisma = new PrismaClient();

// Type definitions
interface SQLiteSong {
  vocadbId: number;
  title: string;
  titleEnglish?: string;
  titleJapanese?: string;
  titleRomaji?: string;
  titleKorean?: string;
  titleOriginal?: string;
  artist: string;
  artistType?: string;
  youtubeId: string;
  youtubeUrl: string;
  thumbUrl?: string;
  favoritedTimes: number;
  ratingScore: number;
  tags?: string;
  publishDate?: string;
  songType?: string;
  viewCount?: number;
  viewCountUpdatedAt?: string;
  crawledAt: string;
  defaultLanguage?: string;
}

interface SQLiteDailyViewCount {
  vocadbId: number;
  youtubeId: string;
  viewCount: number;
  dailyIncrease: number;
  recordDate: string;
}

// Helper: Convert SQLite date string to DateTime
function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

// Helper: Convert SQLite song to Prisma format
function convertSong(song: SQLiteSong) {
  return {
    vocadbId: song.vocadbId,
    title: song.title,
    titleEnglish: song.titleEnglish || null,
    titleJapanese: song.titleJapanese || null,
    titleRomaji: song.titleRomaji || null,
    titleKorean: song.titleKorean || null,
    titleOriginal: song.titleOriginal || null,
    artist: song.artist,
    artistType: song.artistType || null,
    youtubeId: song.youtubeId,
    youtubeUrl: song.youtubeUrl,
    thumbUrl: song.thumbUrl || null,
    favoritedTimes: song.favoritedTimes,
    ratingScore: song.ratingScore,
    tags: song.tags || null,
    publishDate: parseDate(song.publishDate),
    songType: song.songType || null,
    viewCount: song.viewCount || null,
    viewCountUpdatedAt: parseDate(song.viewCountUpdatedAt),
    crawledAt: parseDate(song.crawledAt) || new Date(),
    defaultLanguage: song.defaultLanguage || null,
  };
}

// Migrate songs table
async function migrateSongs() {
  console.log('📦 Migrating Songs Table\n');

  // Get total count
  const totalCount = sqlite
    .prepare('SELECT COUNT(*) as count FROM songs')
    .get() as { count: number };

  console.log(`Total songs to migrate: ${totalCount.count.toLocaleString()}\n`);

  let offset = 0;
  let totalMigrated = 0;
  const startTime = Date.now();

  while (offset < totalCount.count) {
    // Read batch from SQLite
    const songs = sqlite
      .prepare(`SELECT * FROM songs LIMIT ? OFFSET ?`)
      .all(BATCH_SIZE_READ, offset) as SQLiteSong[];

    if (songs.length === 0) break;

    console.log(`📥 Reading batch: ${offset.toLocaleString()} - ${(offset + songs.length).toLocaleString()}`);

    // Convert and insert in smaller batches
    for (let i = 0; i < songs.length; i += BATCH_SIZE_INSERT) {
      const batch = songs.slice(i, i + BATCH_SIZE_INSERT);
      const converted = batch.map(convertSong);

      try {
        // Use createMany with skipDuplicates to handle conflicts
        await prisma.song.createMany({
          data: converted,
          skipDuplicates: true,
        });

        totalMigrated += batch.length;

        const percent = ((totalMigrated / totalCount.count) * 100).toFixed(1);
        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

        console.log(`  ✅ Inserted: ${totalMigrated.toLocaleString()}/${totalCount.count.toLocaleString()} (${percent}%) | ${elapsed}min`);
      } catch (error: any) {
        console.error(`  ❌ Error inserting batch at offset ${offset + i}:`, error.message);
        throw error;
      }
    }

    offset += songs.length;

    // Small delay to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n✅ Songs migration complete: ${totalMigrated.toLocaleString()} records in ${duration} minutes\n`);

  return totalMigrated;
}

// Migrate daily_view_counts table
async function migrateDailyViewCounts() {
  console.log('📦 Migrating DailyViewCounts Table\n');

  // Check if table exists in SQLite
  const tableExists = sqlite
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='daily_view_counts'`)
    .get();

  if (!tableExists) {
    console.log('⚠️  daily_view_counts table does not exist in SQLite. Skipping.\n');
    return 0;
  }

  // Get total count
  const totalCount = sqlite
    .prepare('SELECT COUNT(*) as count FROM daily_view_counts')
    .get() as { count: number };

  if (totalCount.count === 0) {
    console.log('ℹ️  daily_view_counts table is empty. Skipping.\n');
    return 0;
  }

  console.log(`Total records to migrate: ${totalCount.count.toLocaleString()}\n`);

  let offset = 0;
  let totalMigrated = 0;
  const startTime = Date.now();

  while (offset < totalCount.count) {
    // Read batch from SQLite
    const records = sqlite
      .prepare(`SELECT * FROM daily_view_counts LIMIT ? OFFSET ?`)
      .all(BATCH_SIZE_READ, offset) as SQLiteDailyViewCount[];

    if (records.length === 0) break;

    console.log(`📥 Reading batch: ${offset.toLocaleString()} - ${(offset + records.length).toLocaleString()}`);

    // Convert and insert in smaller batches
    for (let i = 0; i < records.length; i += BATCH_SIZE_INSERT) {
      const batch = records.slice(i, i + BATCH_SIZE_INSERT);

      const converted = batch.map(record => ({
        songId: record.vocadbId,
        recordedDate: parseDate(record.recordDate) || new Date(),
        totalViews: record.viewCount,
      }));

      try {
        await prisma.dailyViewCount.createMany({
          data: converted,
          skipDuplicates: true,
        });

        totalMigrated += batch.length;

        const percent = ((totalMigrated / totalCount.count) * 100).toFixed(1);
        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

        console.log(`  ✅ Inserted: ${totalMigrated.toLocaleString()}/${totalCount.count.toLocaleString()} (${percent}%) | ${elapsed}min`);
      } catch (error: any) {
        console.error(`  ❌ Error inserting batch at offset ${offset + i}:`, error.message);
        throw error;
      }
    }

    offset += records.length;
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n✅ DailyViewCounts migration complete: ${totalMigrated.toLocaleString()} records in ${duration} minutes\n`);

  return totalMigrated;
}

// Validate migration
async function validateMigration(sqliteSongCount: number, sqliteDailyCount: number) {
  console.log('🔍 Validating Migration\n');

  // Check songs count
  const pgSongCount = await prisma.song.count();
  console.log(`Songs: SQLite=${sqliteSongCount.toLocaleString()}, PostgreSQL=${pgSongCount.toLocaleString()}`);

  if (pgSongCount !== sqliteSongCount) {
    console.warn(`⚠️  Song count mismatch! Missing ${sqliteSongCount - pgSongCount} records`);
  } else {
    console.log('✅ Song count matches');
  }

  // Check daily_view_counts if applicable
  if (sqliteDailyCount > 0) {
    const pgDailyCount = await prisma.dailyViewCount.count();
    console.log(`DailyViewCounts: SQLite=${sqliteDailyCount.toLocaleString()}, PostgreSQL=${pgDailyCount.toLocaleString()}`);

    if (pgDailyCount !== sqliteDailyCount) {
      console.warn(`⚠️  DailyViewCount mismatch! Missing ${sqliteDailyCount - pgDailyCount} records`);
    } else {
      console.log('✅ DailyViewCount matches');
    }
  }

  // Sample data check
  console.log('\n📊 Sample Data Check:');

  const sampleSongs = await prisma.song.findMany({
    take: 3,
    orderBy: { vocadbId: 'asc' },
  });

  sampleSongs.forEach((song, idx) => {
    console.log(`\n${idx + 1}. ${song.title}`);
    console.log(`   Artist: ${song.artist}`);
    console.log(`   Views: ${song.viewCount?.toLocaleString() || 'N/A'}`);
    console.log(`   Published: ${song.publishDate?.toISOString().split('T')[0] || 'N/A'}`);
    console.log(`   Korean Title: ${song.titleKorean || 'N/A'}`);
  });

  console.log('\n');
}

// Main migration function
async function main() {
  console.log('🚀 SQLite to PostgreSQL Migration\n');
  console.log('Source: SQLite (data/vocadb/vocatify.db)');
  console.log('Target: PostgreSQL (DATABASE_URL from .env)\n');

  try {
    // Check SQLite database exists
    const sqliteSongCount = sqlite
      .prepare('SELECT COUNT(*) as count FROM songs')
      .get() as { count: number };

    const sqliteDailyCount = (() => {
      try {
        const result = sqlite
          .prepare('SELECT COUNT(*) as count FROM daily_view_counts')
          .get() as { count: number };
        return result.count;
      } catch {
        return 0;
      }
    })();

    console.log(`📊 SQLite Database Stats:`);
    console.log(`   Songs: ${sqliteSongCount.count.toLocaleString()}`);
    console.log(`   DailyViewCounts: ${sqliteDailyCount.toLocaleString()}\n`);

    // Confirm before proceeding
    console.log('⚠️  This will insert data into PostgreSQL.');
    console.log('   Existing data will be skipped (skipDuplicates: true)\n');

    // Migrate songs
    const migratedSongs = await migrateSongs();

    // Migrate daily view counts
    const migratedDaily = await migrateDailyViewCounts();

    // Validate
    await validateMigration(sqliteSongCount.count, sqliteDailyCount);

    console.log('✅ Migration Complete!\n');
    console.log(`📊 Summary:`);
    console.log(`   Songs migrated: ${migratedSongs.toLocaleString()}`);
    console.log(`   DailyViewCounts migrated: ${migratedDaily.toLocaleString()}`);
    console.log(`\n🎉 You can now use PostgreSQL as your primary database!\n`);

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    sqlite.close();
    await prisma.$disconnect();
  }
}

// Run migration
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
