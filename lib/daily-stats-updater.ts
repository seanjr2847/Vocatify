/**
 * Daily Stats Cache Updater
 *
 * Pre-computes daily view count increases and stores them in song_daily_stats table.
 * Called after YouTube view count updates to prepare data for fast daily ranking queries.
 *
 * Optimized: Only top 1000 songs by view count (99% data reduction)
 */

import { prisma } from './prisma';

export async function updateDailyStatsCache() {
  console.log('[Daily Stats] Starting optimized update (top 1000 only)...');
  const startTime = Date.now();

  try {
    // ✅ OPTIMIZED: Calculate daily increases for TOP 1000 songs only
    // 2-day period (yesterday vs day before yesterday)

    // Step 1: Clear existing data
    await prisma.$executeRaw`TRUNCATE TABLE song_daily_stats`;

    // Step 2: Insert new data (single INSERT, no batch processing)
    await prisma.$executeRaw`
      INSERT INTO song_daily_stats (song_id, daily_increase, current_views, previous_views, updated_at)
      WITH top_songs AS (
        -- ✅ Get top 1000 songs by current view count (99% data reduction)
        SELECT song_id, MAX(view_count) as max_view_count
        FROM pvs
        WHERE service = 'Youtube' AND view_count IS NOT NULL
        GROUP BY song_id
        ORDER BY max_view_count DESC
        LIMIT 1000
      ),
      daily_data AS (
        SELECT
          pv.song_id,
          dvc.recorded_date,
          dvc.total_views
        FROM daily_view_counts dvc
        INNER JOIN pvs pv ON dvc.pv_id = pv.id
        INNER JOIN top_songs ts ON pv.song_id = ts.song_id
        WHERE dvc.recorded_date >= CURRENT_DATE - INTERVAL '2 days'
          AND dvc.recorded_date <= CURRENT_DATE - INTERVAL '1 day'
          AND pv.service = 'Youtube'
      ),
      daily_changes AS (
        SELECT
          song_id,
          MAX(CASE WHEN recorded_date = CURRENT_DATE - INTERVAL '1 day' THEN total_views ELSE 0 END) as current_views,
          MAX(CASE WHEN recorded_date = CURRENT_DATE - INTERVAL '2 days' THEN total_views ELSE 0 END) as previous_views
        FROM daily_data
        GROUP BY song_id
      )
      SELECT
        song_id,
        (current_views - previous_views) as daily_increase,
        current_views,
        previous_views,
        NOW() as updated_at
      FROM daily_changes
      WHERE current_views > 0
        AND previous_views > 0
        AND (current_views - previous_views) > 0
    `;

    // Get final count
    const count = await prisma.song_daily_stats.count();
    const duration = Date.now() - startTime;

    console.log(`[Daily Stats] Updated ${count} records in ${duration}ms`);

    return {
      success: true,
      count,
      duration,
    };
  } catch (error) {
    console.error('[Daily Stats] Update failed:', error);
    throw error;
  }
}
