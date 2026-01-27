import { NextRequest, NextResponse } from 'next/server';
import { updateSingleRankingCache } from '@/lib/ranking-updater';

/**
 * New Ranking Cache Update Cron Job
 *
 * Updates new ranking (by publish date) in ranking_cache table.
 * Fast query (~2s) - no daily_view_counts scan.
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

    console.log('[Cron] New ranking cache update started');
    const result = await updateSingleRankingCache('new');

    return NextResponse.json({
      message: 'New ranking cache updated successfully',
      ...result,
    });
  } catch (error) {
    console.error('[Cron] New ranking cache update failed:', error);
    return NextResponse.json(
      {
        error: 'New ranking cache update failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
