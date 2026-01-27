import { NextRequest, NextResponse } from 'next/server';
import { updateSingleRankingCache } from '@/lib/ranking-updater';

/**
 * Daily Ranking Cache Update Cron Job
 *
 * Updates daily ranking (by daily increase) in ranking_cache table.
 * Slower query (~45s) - scans daily_view_counts with LAG window function.
 *
 * Authorization: Requires CRON_SECRET in Authorization header
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 90; // 90 seconds max (longer due to complex query)

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

    console.log('[Cron] Daily ranking cache update started');
    const result = await updateSingleRankingCache('daily');

    return NextResponse.json({
      message: 'Daily ranking cache updated successfully',
      ...result,
    });
  } catch (error) {
    console.error('[Cron] Daily ranking cache update failed:', error);
    return NextResponse.json(
      {
        error: 'Daily ranking cache update failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
