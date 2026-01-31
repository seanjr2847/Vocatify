/**
 * 주간 증가량 랭킹 API
 * GET /api/ranking/weekly?limit=100&offset=0
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCachedWeeklyRanking } from '@/lib/db';
import { serializeBigInt } from '@/lib/serialize';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const ranking = await getCachedWeeklyRanking(limit, offset);

    // 주간 랭킹 날짜 범위 계산 (오늘 기준 7일 전 ~ 오늘)
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 6); // 7일간 = 6일 전 ~ 오늘

    return NextResponse.json({
      success: true,
      data: serializeBigInt(ranking),
      dateRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      },
      pagination: {
        limit,
        offset,
        count: ranking.length,
      },
    });
  } catch (error: unknown) {
    console.error('주간 랭킹 조회 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '랭킹 조회 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
