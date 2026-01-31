import { NextRequest, NextResponse } from 'next/server';

/**
 * Ranking Cache Update Cron Job
 *
 * Updates pre-computed ranking cache after YouTube view count updates.
 * Should run daily after YouTube crawler (4:00 AM UTC).
 *
 * Authorization: Requires CRON_SECRET in Authorization header
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

export async function POST(request: NextRequest) {
  // DEPRECATED: This endpoint is deprecated in favor of split endpoints
  // Please use the following endpoints instead:
  //   POST /api/cron/weekly-stats
  //   POST /api/cron/ranking/total
  //   POST /api/cron/ranking/weekly
  //   POST /api/cron/ranking/new
  //   POST /api/cron/ranking/daily

  return NextResponse.json(
    {
      error: 'Deprecated endpoint',
      message: 'This endpoint has been split into separate endpoints to avoid timeout issues.',
      newEndpoints: {
        weeklyStats: '/api/cron/weekly-stats',
        totalRanking: '/api/cron/ranking/total',
        weeklyRanking: '/api/cron/ranking/weekly',
        newRanking: '/api/cron/ranking/new',
        dailyRanking: '/api/cron/ranking/daily',
      },
      documentation: 'Please update your cron jobs to call these endpoints sequentially.',
    },
    { status: 410 } // 410 Gone - resource is no longer available
  );

  /* DEPRECATED CODE - Kept for reference
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Cron] Ranking cache update started');
    const startTime = Date.now();

    // Step 1: Update weekly stats cache (optimized with batch processing)
    console.log('[Cron] Step 1/2: Updating weekly stats cache...');
    const weeklyStatsResult = await updateWeeklyStatsCache();

    // Step 2: Update ranking cache (using weekly stats cache)
    console.log('[Cron] Step 2/2: Updating ranking cache...');
    const rankingResult = await updateRankingCache();

    const duration = Date.now() - startTime;
    console.log(`[Cron] Ranking cache update completed in ${duration}ms`);

    return NextResponse.json({
      message: 'Ranking cache updated successfully',
      weeklyStats: weeklyStatsResult,
      rankings: rankingResult,
      totalDuration: duration,
    });
  } catch (error) {
    console.error('[Cron] Ranking cache update failed:', error);
    return NextResponse.json(
      {
        error: 'Ranking cache update failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
  */
}

// GET endpoint to check last update status
export async function GET(request: NextRequest) {
  try {
    const { prisma } = await import('@/lib/prisma');

    // Get latest update time and count
    const [latestUpdate, totalCount, weeklyCount, newCount, dailyCount] = await Promise.all([
      prisma.ranking_cache.findFirst({
        select: { updated_at: true },
        orderBy: { updated_at: 'desc' },
      }),
      prisma.ranking_cache.count({ where: { ranking_type: 'total' } }),
      prisma.ranking_cache.count({ where: { ranking_type: 'weekly' } }),
      prisma.ranking_cache.count({ where: { ranking_type: 'new' } }),
      prisma.ranking_cache.count({ where: { ranking_type: 'daily' } }),
    ]);

    return NextResponse.json({
      last_updated: latestUpdate?.updated_at,
      counts: {
        total: totalCount,
        weekly: weeklyCount,
        new: newCount,
        daily: dailyCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get ranking cache status' },
      { status: 500 }
    );
  }
}
