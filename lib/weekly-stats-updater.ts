/**
 * Weekly Stats Cache Updater
 *
 * Pre-computes weekly view count increases and stores them in song_weekly_stats table.
 * Called after YouTube view count updates to prepare data for fast weekly ranking queries.
 */

import { prisma } from './prisma';
import { Prisma } from '@prisma/client';

/**
 * Weekly stats query result type
 */
interface WeeklyStatsRow {
  song_id: number;
  current_views: bigint;
  previous_views: bigint;
  weekly_increase: bigint;
}

export async function updateWeeklyStatsCache() {
  console.log('[Weekly Stats] Starting update...');
  const startTime = Date.now();

  try {
    // Calculate weekly increases from daily_view_counts table
    // Use yesterday's data since today's data may not be recorded yet
    const weeklyStats = await prisma.$queryRaw<WeeklyStatsRow[]>`
      WITH weekly_data AS (
        SELECT
          pv.song_id,
          dvc.recorded_date,
          dvc.total_views
        FROM daily_view_counts dvc
        JOIN pvs pv ON dvc.pv_id = pv.id
        WHERE dvc.recorded_date >= CURRENT_DATE - INTERVAL '9 days'
          AND dvc.recorded_date <= CURRENT_DATE - INTERVAL '1 day'
          AND pv.service = 'Youtube'
      ),
      weekly_changes AS (
        SELECT
          song_id,
          MAX(CASE WHEN recorded_date = CURRENT_DATE - INTERVAL '1 day' THEN total_views ELSE 0 END) as current_views,
          MAX(CASE WHEN recorded_date = CURRENT_DATE - INTERVAL '8 days' THEN total_views ELSE 0 END) as previous_views
        FROM weekly_data
        GROUP BY song_id
      )
      SELECT
        song_id,
        current_views,
        previous_views,
        (current_views - previous_views) as weekly_increase
      FROM weekly_changes
      WHERE current_views > 0
        AND (current_views - previous_views) > 0
    `;

    console.log(`[Weekly Stats] Calculated ${weeklyStats.length} weekly increases`);

    if (weeklyStats.length === 0) {
      console.log('[Weekly Stats] No data to update');
      return {
        success: true,
        count: 0,
        duration: Date.now() - startTime,
      };
    }

    // First, truncate the table for clean slate
    await prisma.$executeRaw`TRUNCATE TABLE song_weekly_stats`;

    // Use batch createMany for fast insertion
    // Process in chunks of 500 records
    const batchSize = 500;
    for (let i = 0; i < weeklyStats.length; i += batchSize) {
      const batch = weeklyStats.slice(i, i + batchSize);
      console.log(`[Weekly Stats] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(weeklyStats.length / batchSize)} (${batch.length} records)`);

      await prisma.song_weekly_stats.createMany({
        data: batch.map((stat) => ({
          song_id: stat.song_id,
          weekly_increase: stat.weekly_increase,
          current_views: stat.current_views,
          previous_views: stat.previous_views,
        })),
      });
    }

    const duration = Date.now() - startTime;
    console.log(`[Weekly Stats] Updated ${weeklyStats.length} records in ${duration}ms`);

    return {
      success: true,
      count: weeklyStats.length,
      duration,
    };
  } catch (error) {
    console.error('[Weekly Stats] Update failed:', error);
    throw error;
  }
}
