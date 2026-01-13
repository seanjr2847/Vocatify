/**
 * Emergency Database Cleanup Script
 * Removes old daily_view_counts records to free up storage
 */

import { prisma } from '../lib/prisma';

async function emergencyCleanup() {
  console.log('🚨 Starting emergency database cleanup...');

  try {
    // Keep only last 14 days of daily view counts (2 weeks)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 14);

    console.log(`📅 Deleting records older than: ${cutoffDate.toISOString()}`);

    const result = await prisma.dailyViewCount.deleteMany({
      where: {
        recordedDate: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`✅ Deleted ${result.count} old daily view count records`);

    // Check current database size
    const sizeQuery = await prisma.$queryRaw<Array<{ table_name: string; total_size: string }>>`
      SELECT
        schemaname || '.' || tablename AS table_name,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 10;
    `;

    console.log('\n📊 Top 10 Tables by Size:');
    sizeQuery.forEach((row) => {
      console.log(`  ${row.table_name}: ${row.total_size}`);
    });

    // Vacuum to reclaim space
    console.log('\n🧹 Running VACUUM FULL to reclaim disk space...');
    await prisma.$executeRawUnsafe('VACUUM FULL daily_view_counts');

    console.log('✅ Emergency cleanup completed successfully');
  } catch (error) {
    console.error('❌ Emergency cleanup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

emergencyCleanup().catch(console.error);
