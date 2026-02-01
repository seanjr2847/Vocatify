import { NextRequest, NextResponse } from 'next/server';
import { updateDailyStatsCache } from '@/lib/daily-stats-updater';

/**
 * Daily Stats Cache Update Cron Job
 *
 * Pre-computes daily view count increases and stores in song_daily_stats table.
 * Should run daily after YouTube crawler completes.
 *
 * Authorization: Requires CRON_SECRET in Authorization header
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 1 minute max

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

    console.log('[Cron] Daily stats cache update started');
    const startTime = Date.now();

    const result = await updateDailyStatsCache();

    const duration = Date.now() - startTime;
    console.log(`[Cron] Daily stats cache update completed in ${duration}ms`);

    return NextResponse.json({
      message: 'Daily stats cache updated successfully',
      ...result,
      duration,
    });
  } catch (error) {
    console.error('[Cron] Daily stats cache update failed:', error);
    return NextResponse.json(
      {
        error: 'Daily stats cache update failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check last update status
export async function GET(_request: NextRequest) {
  try {
    const { prisma } = await import('@/lib/prisma');

    const [latestUpdate, totalCount] = await Promise.all([
      prisma.song_daily_stats.findFirst({
        select: { updated_at: true },
        orderBy: { updated_at: 'desc' },
      }),
      prisma.song_daily_stats.count(),
    ]);

    return NextResponse.json({
      last_updated: latestUpdate?.updated_at,
      total_count: totalCount,
    });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to get daily stats status' },
      { status: 500 }
    );
  }
}
