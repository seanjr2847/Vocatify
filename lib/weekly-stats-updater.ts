/**
 * Weekly Stats Cache Updater
 *
 * Pre-computes weekly view count increases and stores them in song_weekly_stats table.
 * Called after YouTube view count updates to prepare data for fast weekly ranking queries.
 */

import { prisma } from './prisma';

export async function updateWeeklyStatsCache() {
  console.log('[Weekly Stats] Starting optimized update (top 1000 + recent songs)...');
  const startTime = Date.now();

  try {
    // ✅ OPTIMIZED: Calculate weekly increases for TOP 1000 songs + recent 30-day songs
    // 7-day period (today-1 vs today-8)

    // Step 1: Clear existing data
    await prisma.$executeRaw`TRUNCATE TABLE song_weekly_stats`;

    // Step 2: Insert new data
    await prisma.$executeRaw`
      INSERT INTO song_weekly_stats (song_id, weekly_increase, current_views, previous_views, updated_at)
      WITH top_songs AS (
        -- Top 1000 songs by view count
        SELECT song_id
        FROM pvs
        WHERE service = 'Youtube' AND view_count IS NOT NULL
        GROUP BY song_id
        ORDER BY MAX(view_count) DESC
        LIMIT 1000
      ),
      recent_songs AS (
        -- Songs published within last 30 days (for rising new chart)
        SELECT vocadb_id as song_id
        FROM songs
        WHERE publish_date IS NOT NULL
          AND publish_date >= CURRENT_DATE - INTERVAL '30 days'
      ),
      target_songs AS (
        SELECT song_id FROM top_songs
        UNION
        SELECT song_id FROM recent_songs
      ),
      weekly_data AS (
        SELECT
          pv.song_id,
          dvc.recorded_date,
          dvc.total_views
        FROM daily_view_counts dvc
        INNER JOIN pvs pv ON dvc.pv_id = pv.id
        INNER JOIN target_songs ts ON pv.song_id = ts.song_id
        WHERE dvc.recorded_date >= CURRENT_DATE - INTERVAL '8 days'
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
        (current_views - previous_views) as weekly_increase,
        current_views,
        previous_views,
        NOW() as updated_at
      FROM weekly_changes
      WHERE current_views > 0
        AND (current_views - previous_views) > 0
    `;

    // Get final count
    const count = await prisma.song_weekly_stats.count();
    const duration = Date.now() - startTime;

    console.log(`[Weekly Stats] Updated ${count} records in ${duration}ms`);

    return {
      success: true,
      count,
      duration,
    };
  } catch (error) {
    console.error('[Weekly Stats] Update failed:', error);
    throw error;
  }
}
