/**
 * Weekly Stats Cache Updater
 *
 * Pre-computes weekly view count increases and stores them in song_weekly_stats table.
 * Called after YouTube view count updates to prepare data for fast weekly ranking queries.
 */

import { prisma } from './prisma';

export async function updateWeeklyStatsCache() {
  console.log('[Weekly Stats] Starting update...');
  const startTime = Date.now();

  try {
    // Calculate weekly increases from daily_view_counts table
    const weeklyStats = await prisma.$queryRaw<any[]>`
      WITH weekly_data AS (
        SELECT
          pv.song_id,
          dvc.recorded_date,
          dvc.total_views
        FROM daily_view_counts dvc
        JOIN pvs pv ON dvc.pv_id = pv.id
        WHERE dvc.recorded_date >= CURRENT_DATE - INTERVAL '8 days'
          AND pv.service = 'Youtube'
      ),
      weekly_changes AS (
        SELECT
          song_id,
          MAX(CASE WHEN recorded_date = CURRENT_DATE THEN total_views ELSE 0 END) as current_views,
          MAX(CASE WHEN recorded_date = CURRENT_DATE - INTERVAL '7 days' THEN total_views ELSE 0 END) as previous_views
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

    // Use upsert to update existing records or insert new ones
    await prisma.$transaction(
      weeklyStats.map((stat) =>
        prisma.song_weekly_stats.upsert({
          where: { song_id: stat.song_id },
          update: {
            weekly_increase: stat.weekly_increase,
            current_views: stat.current_views,
            previous_views: stat.previous_views,
            updated_at: new Date(),
          },
          create: {
            song_id: stat.song_id,
            weekly_increase: stat.weekly_increase,
            current_views: stat.current_views,
            previous_views: stat.previous_views,
          },
        })
      )
    );

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
