import { NextRequest, NextResponse } from 'next/server';
import { updateRankingCache } from '@/lib/ranking-updater';

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
  try {
    // Verify authorization
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

    // Update ranking cache
    const result = await updateRankingCache();

    const duration = Date.now() - startTime;
    console.log(`[Cron] Ranking cache update completed in ${duration}ms`);

    return NextResponse.json({
      message: 'Ranking cache updated successfully',
      ...result,
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
}

// GET endpoint to check last update status
export async function GET(request: NextRequest) {
  try {
    const { prisma } = await import('@/lib/prisma');

    // Get latest update time and count
    const [latestUpdate, totalCount, weeklyCount, newCount] = await Promise.all([
      prisma.ranking_cache.findFirst({
        select: { updated_at: true },
        orderBy: { updated_at: 'desc' },
      }),
      prisma.ranking_cache.count({ where: { ranking_type: 'total' } }),
      prisma.ranking_cache.count({ where: { ranking_type: 'weekly' } }),
      prisma.ranking_cache.count({ where: { ranking_type: 'new' } }),
    ]);

    return NextResponse.json({
      last_updated: latestUpdate?.updated_at,
      counts: {
        total: totalCount,
        weekly: weeklyCount,
        new: newCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get ranking cache status' },
      { status: 500 }
    );
  }
}
