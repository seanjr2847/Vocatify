/**
 * 총 조회수 랭킹 API
 * GET /api/ranking/total?limit=100&offset=0
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCachedTotalRanking } from '@/lib/db';
import { serializeBigInt } from '@/lib/serialize';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const ranking = await getCachedTotalRanking(limit, offset);

    return NextResponse.json({
      success: true,
      data: serializeBigInt(ranking),
      pagination: {
        limit,
        offset,
        count: ranking.length,
      },
    });
  } catch (error: unknown) {
    console.error('총 조회수 랭킹 조회 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '랭킹 조회 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
