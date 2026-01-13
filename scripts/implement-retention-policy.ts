/**
 * Data Retention Policy Implementation
 * Automated cleanup cron job to maintain optimal database size
 */

import { prisma } from '../lib/prisma';

interface RetentionConfig {
  dailyViewCountsDays: number; // Keep last N days
  crawlerProgressDays: number; // Keep completed crawler logs for N days
}

const DEFAULT_RETENTION: RetentionConfig = {
  dailyViewCountsDays: 14, // 2 weeks of daily stats
  crawlerProgressDays: 7, // 1 week of crawler logs
};

async function applyRetentionPolicy(config: RetentionConfig = DEFAULT_RETENTION) {
  console.log('🗂️ Applying data retention policy...');
  console.log(`  - Daily view counts: ${config.dailyViewCountsDays} days`);
  console.log(`  - Crawler progress: ${config.crawlerProgressDays} days`);

  try {
    // 1. Clean up old daily view counts
    const viewCountCutoff = new Date();
    viewCountCutoff.setDate(viewCountCutoff.getDate() - config.dailyViewCountsDays);

    const deletedViewCounts = await prisma.daily_view_counts.deleteMany({
      where: {
        recorded_date: {
          lt: viewCountCutoff,
        },
      },
    });

    console.log(`✅ Deleted ${deletedViewCounts.count} old daily view count records`);

    // 2. Clean up old completed crawler progress
    const crawlerCutoff = new Date();
    crawlerCutoff.setDate(crawlerCutoff.getDate() - config.crawlerProgressDays);

    const deletedCrawlers = await prisma.crawler_progress.deleteMany({
      where: {
        status: 'completed',
        completed_at: {
          lt: crawlerCutoff,
        },
      },
    });

    console.log(`✅ Deleted ${deletedCrawlers.count} old crawler progress records`);

    // 3. Get storage stats
    const stats = await getDatabaseStats();
    console.log('\n📊 Database Statistics:');
    console.log(`  Total size: ${stats.totalSize}`);
    console.log(`  Largest tables:`);
    stats.tables.slice(0, 5).forEach((table) => {
      console.log(`    - ${table.table_name}: ${table.total_size}`);
    });

    return {
      deletedViewCounts: deletedViewCounts.count,
      deletedCrawlers: deletedCrawlers.count,
      stats,
    };
  } catch (error) {
    console.error('❌ Retention policy failed:', error);
    throw error;
  }
}

async function getDatabaseStats() {
  const tables = await prisma.$queryRaw<Array<{ table_name: string; total_size: string; row_estimate: string }>>`
    SELECT
      schemaname || '.' || tablename AS table_name,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)::bigint) AS row_estimate
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
  `;

  const totalSize = await prisma.$queryRaw<Array<{ total: string }>>`
    SELECT pg_size_pretty(pg_database_size(current_database())) AS total;
  `;

  return {
    totalSize: totalSize[0]?.total || 'unknown',
    tables,
  };
}

// Run if called directly
if (require.main === module) {
  applyRetentionPolicy()
    .then((result) => {
      console.log('\n✅ Retention policy applied successfully');
      console.log(`   Freed up space by deleting ${result.deletedViewCounts + result.deletedCrawlers} records`);
    })
    .catch((error) => {
      console.error('Failed to apply retention policy:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}

export { applyRetentionPolicy, getDatabaseStats };
