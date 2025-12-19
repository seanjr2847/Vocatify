/**
 * 곡 목록 및 검색 API
 * GET /api/songs?query=검색어&limit=20&offset=0
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchSongs } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!query || query.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: '검색어는 최소 2글자 이상이어야 합니다.',
        },
        { status: 400 }
      );
    }

    const songs = searchSongs(query, limit, offset);

    return NextResponse.json({
      success: true,
      data: songs,
      pagination: {
        limit,
        offset,
        count: songs.length,
      },
    });
  } catch (error: any) {
    console.error('곡 검색 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '곡 검색 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
