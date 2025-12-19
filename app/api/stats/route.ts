/**
 * 전체 통계 API
 * GET /api/stats
 */

import { NextResponse } from 'next/server';
import { getStats } from '@/lib/db';

export async function GET() {
  try {
    const stats = getStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('통계 조회 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '통계 조회 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
