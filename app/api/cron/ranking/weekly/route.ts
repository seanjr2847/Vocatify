import { NextRequest, NextResponse } from 'next/server';
import { updateSingleRankingCache } from '@/lib/ranking-updater';

/**
 * Weekly Ranking Cache Update Cron Job
 *
 * Updates weekly ranking (by weekly increase) in ranking_cache table.
 * Fast query (~2s) - uses pre-computed song_weekly_stats cache.
 *
 * Authorization: Requires CRON_SECRET in Authorization header
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 30 seconds max

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

    console.log('[Cron] Weekly ranking cache update started');
    const result = await updateSingleRankingCache('weekly');

    if (result.skipped) {
      return NextResponse.json({
        message: 'Weekly ranking cache skipped (no weekly stats data)',
        ...result,
      });
    }

    return NextResponse.json({
      message: 'Weekly ranking cache updated successfully',
      ...result,
    });
  } catch (error) {
    console.error('[Cron] Weekly ranking cache update failed:', error);
    return NextResponse.json(
      {
        error: 'Weekly ranking cache update failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
