/**
 * 일간 증가량 랭킹 API
 * GET /api/ranking/daily?limit=100&offset=0
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDailyRanking } from '@/lib/db';
import { serializeBigInt } from '@/lib/serialize';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const ranking = await getDailyRanking(limit, offset);

    // 일간 랭킹 날짜 (어제 기준)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return NextResponse.json({
      success: true,
      data: serializeBigInt(ranking),
      dateRange: {
        date: yesterday.toISOString().split('T')[0],
      },
      pagination: {
        limit,
        offset,
        count: ranking.length,
      },
    });
  } catch (error: unknown) {
    console.error('일간 랭킹 조회 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '랭킹 조회 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
