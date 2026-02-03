import { NextRequest, NextResponse } from 'next/server';
import { getSeedSong, getSimilarSongsPlaylist } from '@/lib/radio/algorithms';

/**
 * GET /api/radio/similar?songId=123
 * 특정 곡과 비슷한 곡들로 라디오 시작
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const songIdParam = searchParams.get('songId');
    const excludeIdsParam = searchParams.get('excludeIds');
    const limitParam = searchParams.get('limit');

    if (!songIdParam) {
      return NextResponse.json(
        { success: false, error: 'songId is required' },
        { status: 400 }
      );
    }

    const songId = parseInt(songIdParam);
    const limit = limitParam ? parseInt(limitParam) : 15;
    const excludeIds = excludeIdsParam
      ? excludeIdsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id))
      : [];

    // 시드 곡 정보 가져오기
    const seedSong = await getSeedSong(songId);

    if (!seedSong) {
      return NextResponse.json(
        { success: false, error: 'Song not found or has no YouTube video' },
        { status: 404 }
      );
    }

    // 비슷한 곡 플레이리스트 생성
    const playlist = await getSimilarSongsPlaylist(
      songId,
      seedSong.viewCount || 100000,
      excludeIds,
      limit
    );

    // BigInt를 string으로 변환
    const serializeSong = (song: typeof seedSong) => ({
      ...song,
      viewCount: song.viewCount?.toString() || null,
    });

    return NextResponse.json({
      success: true,
      seedSong: serializeSong(seedSong),
      playlist: playlist.map(serializeSong),
      meta: {
        seedSongId: songId,
        playlistCount: playlist.length,
        hasMore: playlist.length >= limit,
      },
    });
  } catch (error) {
    console.error('Similar radio error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
