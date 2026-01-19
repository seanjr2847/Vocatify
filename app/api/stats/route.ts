/**
 * 전체 통계 API
 * GET /api/stats
 */

import { NextResponse } from 'next/server';
import { getStats } from '@/lib/db';
import { bigIntToString } from '@/lib/serialize';

export async function GET() {
  try {
    const stats = await getStats();

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        totalViews: bigIntToString(stats.totalViews),
      },
    });
  } catch (error: unknown) {
    console.error('통계 조회 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '통계 조회 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
