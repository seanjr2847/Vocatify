/**
 * 신곡 랭킹 API
 * GET /api/ranking/new?limit=100&offset=0
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCachedNewRanking } from '@/lib/db';
import { serializeBigInt } from '@/lib/serialize';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const ranking = await getCachedNewRanking(limit, offset);

    return NextResponse.json({
      success: true,
      data: serializeBigInt(ranking),
      pagination: {
        limit,
        offset,
        count: ranking.length,
      },
    });
  } catch (error: any) {
    console.error('신곡 랭킹 조회 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '랭킹 조회 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
