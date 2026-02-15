import { NextRequest, NextResponse } from 'next/server';
import { updateSingleRankingCache } from '@/lib/ranking-updater';

/**
 * Rising Ranking Cache Update Cron Job
 *
 * Updates rising ranking (new songs by weekly increase) in ranking_cache table.
 * Combines weekly stats with publish_date filter for recent songs.
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

    console.log('[Cron] Rising ranking cache update started');
    const result = await updateSingleRankingCache('rising');

    if (result.skipped) {
      return NextResponse.json({
        message: 'Rising ranking cache skipped (no weekly stats data)',
        ...result,
      });
    }

    return NextResponse.json({
      message: 'Rising ranking cache updated successfully',
      ...result,
    });
  } catch (error) {
    console.error('[Cron] Rising ranking cache update failed:', error);
    return NextResponse.json(
      {
        error: 'Rising ranking cache update failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
