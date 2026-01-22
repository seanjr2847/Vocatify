import { NextRequest, NextResponse } from 'next/server';
import { RADIO_CHANNELS } from '@/lib/radio/channels';
import { getTagBasedPlaylist, getRankingPlaylist } from '@/lib/radio/algorithms';
import { getSongById } from '@/lib/db';

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
  const seedSongId = params.get('songId');

  try {
    // 시드 모드: 특정 곡에서 시작
    if (seedSongId) {
      const seedSong = await getSongById(parseInt(seedSongId));
      if (!seedSong) {
        return NextResponse.json({ error: 'Song not found' }, { status: 404 });
      }

      // 곡의 태그 추출 (상위 5개)
      const tags = seedSong.tags
        ?.slice(0, 5)
        .map(t => t.name) || [];

      const playlist = await getTagBasedPlaylist(tags, [seedSong.vocadbId], 10);

      return NextResponse.json({
        success: true,
        channel: null,
        seedSong: serializeBigInt(seedSong),
        tags,
        playlist: serializeBigInt(playlist),
      });
    }

    // 채널 모드
    const channel = RADIO_CHANNELS.find(c => c.slug === channelSlug);
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    let playlist: unknown;
    if (channel.algorithm === 'tag-based') {
      playlist = await getTagBasedPlaylist(channel.config.tags || [], [], 10);
    } else if (channel.algorithm === 'ranking') {
      const rankingType = channel.config.rankingType as 'weekly' | 'daily' | 'total';
      playlist = await getRankingPlaylist(
        rankingType,
        [],
        10
      );
    }

    const playlistArray = Array.isArray(playlist) ? playlist : [];

    return NextResponse.json({
      success: true,
      channel: {
        slug: channel.slug,
        name: channel.nameKo,
      },
      seedSong: serializeBigInt(playlistArray[0]) || null,
      tags: channel.config.tags || [],
      playlist: serializeBigInt(playlistArray.slice(1)), // 첫 곡 제외
    });
  } catch (error) {
    console.error('Radio start error:', error);
    return NextResponse.json(
      { error: 'Failed to start radio' },
      { status: 500 }
    );
  }
}
