import { NextRequest, NextResponse } from 'next/server';
import { RADIO_CHANNELS } from '@/lib/radio/channels';
import { getPopularPlaylist, getRandomPlaylist, getSimilarSongsPlaylist, getSeedSong } from '@/lib/radio/algorithms';

// Helper to serialize BigInt values for JSON
function serializeBigInt(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object') {
    const serialized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeBigInt(value);
    }
    return serialized;
  }
  return obj;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const channelSlug = params.get('channel');
  const excludeIdsParam = params.get('excludeIds');
  const seedSongIdParam = params.get('seedSongId'); // similar 채널용
  const limit = parseInt(params.get('limit') || '10');

  const excludeIds = excludeIdsParam
    ? excludeIdsParam.split(',').map(Number).filter(n => !isNaN(n))
    : [];

  try {
    // similar 채널 특별 처리
    if (channelSlug === 'similar') {
      const seedSongId = seedSongIdParam ? parseInt(seedSongIdParam) : null;

      if (!seedSongId) {
        // seedSongId 없으면 popular 채널로 폴백
        const playlist = await getPopularPlaylist(100000, excludeIds, limit);
        return NextResponse.json({
          success: true,
          playlist: serializeBigInt(playlist),
          meta: { hasMore: playlist.length > 0 }
        });
      }

      // seed 곡 정보 가져오기
      const seedSong = await getSeedSong(seedSongId);
      if (!seedSong) {
        const playlist = await getPopularPlaylist(100000, excludeIds, limit);
        return NextResponse.json({
          success: true,
          playlist: serializeBigInt(playlist),
          meta: { hasMore: playlist.length > 0 }
        });
      }

      const playlist = await getSimilarSongsPlaylist(
        seedSongId,
        seedSong.viewCount || 100000,
        excludeIds,
        limit
      );

      return NextResponse.json({
        success: true,
        playlist: serializeBigInt(playlist),
        meta: { hasMore: playlist.length > 0 }
      });
    }

    // 채널 찾기 (기본값: 첫 번째 채널)
    const channel = channelSlug
      ? RADIO_CHANNELS.find(c => c.slug === channelSlug)
      : RADIO_CHANNELS[0];

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    let playlist;

    if (channel.algorithm === 'popular') {
      playlist = await getPopularPlaylist(
        channel.config.minViews,
        excludeIds,
        limit
      );
    } else {
      playlist = await getRandomPlaylist(
        channel.config.minViews,
        channel.config.maxViews,
        excludeIds,
        limit
      );
    }

    return NextResponse.json({
      success: true,
      playlist: serializeBigInt(playlist),
      meta: { hasMore: playlist.length > 0 }
    });
  } catch (error) {
    console.error('Radio next error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch songs' },
      { status: 500 }
    );
  }
}
