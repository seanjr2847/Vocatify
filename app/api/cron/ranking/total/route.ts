import { NextRequest, NextResponse } from 'next/server';
import { updateSingleRankingCache } from '@/lib/ranking-updater';

/**
 * Total Ranking Cache Update Cron Job
 *
 * Updates total ranking (by total view count) in ranking_cache table.
 * Fast query (~2s) - no daily_view_counts scan.
 *
 * Authorization: Requires CRON_SECRET in Authorization header
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max (requires Vercel Pro)

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

    console.log('[Cron] Total ranking cache update started');
    const result = await updateSingleRankingCache('total');

    return NextResponse.json({
      message: 'Total ranking cache updated successfully',
      ...result,
    });
  } catch (error) {
    console.error('[Cron] Total ranking cache update failed:', error);
    return NextResponse.json(
      {
        error: 'Total ranking cache update failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
