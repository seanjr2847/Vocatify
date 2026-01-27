/**
 * Create song_daily_stats table manually
 * Run: npx tsx scripts/create-daily-stats-table.ts
 */

import { prisma } from '../lib/prisma';

async function createDailyStatsTable() {
  console.log('Creating song_daily_stats table...');

  try {
    // Create table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS song_daily_stats (
        song_id INTEGER PRIMARY KEY,
        daily_increase BIGINT NOT NULL,
        current_views BIGINT NOT NULL,
        previous_views BIGINT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Table created successfully');

    // Create indexes
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_song_daily_stats_increase
      ON song_daily_stats(daily_increase DESC)
    `;
    console.log('✅ Index on daily_increase created');

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_song_daily_stats_updated
      ON song_daily_stats(updated_at)
    `;
    console.log('✅ Index on updated_at created');

    console.log('\n🎉 song_daily_stats table setup complete!');
  } catch (error) {
    console.error('❌ Error creating table:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createDailyStatsTable();
