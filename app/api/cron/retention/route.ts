/**
 * Automated Data Retention Cron Endpoint
 * Schedule: Weekly on Sundays at 5:00 AM UTC
 * Purpose: Clean up old daily_view_counts to maintain database size
 */

import { NextRequest, NextResponse } from 'next/server';
import { applyRetentionPolicy } from '@/scripts/implement-retention-policy';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Retention Cron] Starting data retention policy...');

    const result = await applyRetentionPolicy();

    console.log('[Retention Cron] Completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Data retention policy applied',
      deletedViewCounts: result.deletedViewCounts,
      deletedCrawlers: result.deletedCrawlers,
      stats: result.stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Retention Cron] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check status
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/cron/retention',
    schedule: 'Weekly on Sundays at 5:00 AM UTC',
    purpose: 'Clean up old daily_view_counts records (>14 days)',
    authorization: 'Required (Bearer token)',
  });
}
