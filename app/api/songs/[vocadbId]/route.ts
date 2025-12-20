/**
 * 곡 상세 정보 API
 * GET /api/songs/[vocadbId]
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getSongById,
  getDailyViewCounts,
  getSongRankPositions,
  getRelatedSongsByArtist,
  getSongStatistics,
} from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vocadbId: string }> }
) {
  try {
    const { vocadbId: vocadbIdStr } = await params;
    const vocadbId = parseInt(vocadbIdStr);

    if (isNaN(vocadbId)) {
      return NextResponse.json(
        {
          success: false,
          error: '유효하지 않은 곡 ID입니다.',
        },
        { status: 400 }
      );
    }

    const song = await getSongById(vocadbId);

    if (!song) {
      return NextResponse.json(
        {
          success: false,
          error: '곡을 찾을 수 없습니다.',
        },
        { status: 404 }
      );
    }

    // 병렬로 추가 데이터 조회
    const [dailyViews, rankings, relatedSongs, statistics] = await Promise.all([
      Promise.resolve(getDailyViewCounts(vocadbId, 30)),
      Promise.resolve(getSongRankPositions(vocadbId)).catch((error) => {
        console.error('Rankings fetch failed:', error);
        return { total: null, daily: null, weekly: null };
      }),
      Promise.resolve(getRelatedSongsByArtist(song.artist, vocadbId, 6)).catch((error) => {
        console.error('Related songs fetch failed:', error);
        return [];
      }),
      Promise.resolve(getSongStatistics(vocadbId)).catch((error) => {
        console.error('Statistics fetch failed:', error);
        return null;
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        song,
        dailyViews,
        rankings,
        relatedSongs,
        statistics,
      },
    });
  } catch (error: any) {
    console.error('곡 상세 조회 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '곡 조회 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
