/**
 * 곡 목록 및 검색 API
 * GET /api/songs?query=검색어&limit=20&offset=0&sortBy=viewCount&artistType=Vocaloid
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchSongs, SortBy } from '@/lib/db';

const VALID_SORT_OPTIONS: SortBy[] = ['viewCount', 'publishDate', 'title', 'artist', 'relevance'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Max 100
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortByParam = searchParams.get('sortBy') || 'viewCount';
    const artistTypeParam = searchParams.get('artistType');
    const tagIdParam = searchParams.get('tagId');

    // Validate query
    if (!query || query.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: '검색어는 최소 2글자 이상이어야 합니다.',
        },
        { status: 400 }
      );
    }

    // Parse and validate tagId
    let tagId: number | null = null;
    if (tagIdParam) {
      const parsedTagId = parseInt(tagIdParam);
      if (isNaN(parsedTagId) || parsedTagId <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: '유효하지 않은 태그 ID입니다.',
          },
          { status: 400 }
        );
      }
      tagId = parsedTagId;
    }

    // Validate sortBy
    const sortBy = VALID_SORT_OPTIONS.includes(sortByParam as SortBy)
      ? (sortByParam as SortBy)
      : 'viewCount';

    // Parse artistType (null means all artists, 'Vocaloid' means Vocaloid only)
    const artistType = artistTypeParam === 'all' ? null : 'Vocaloid';

    const result = await searchSongs(query, limit, offset, sortBy, artistType, tagId);

    return NextResponse.json({
      success: true,
      data: result.songs.map((song) => ({
        ...song,
        viewCount: song.viewCount?.toString(), // Convert BigInt to string
        matchedField: song.matchedField,
        relevanceScore: song.relevanceScore,
      })),
      pagination: {
        limit,
        offset,
        count: result.songs.length,
        total: result.total,
        hasMore: offset + result.songs.length < result.total,
      },
      filters: {
        sortBy,
        artistType: artistType || 'all',
        tagId: tagId || null,
      },
      query, // Include original query for highlighting
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
