import { NextRequest, NextResponse } from 'next/server';
import { RADIO_CHANNELS } from '@/lib/radio/channels';
import { getPopularPlaylist, getRandomPlaylist, RadioSong } from '@/lib/radio/algorithms';

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

  try {
    // 채널 찾기 (기본값: 첫 번째 채널)
    const channel = channelSlug
      ? RADIO_CHANNELS.find(c => c.slug === channelSlug)
      : RADIO_CHANNELS[0];

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const limit = channel.config.limit || 15;
    let playlist: RadioSong[];

    // 알고리즘에 따라 재생목록 생성
    if (channel.algorithm === 'popular') {
      playlist = await getPopularPlaylist(
        channel.config.minViews,
        [],
        limit
      );
    } else {
      // random
      playlist = await getRandomPlaylist(
        channel.config.minViews,
        channel.config.maxViews,
        [],
        limit
      );
    }

    if (playlist.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No songs found for this channel',
      }, { status: 404 });
    }

    // 첫 곡 = seedSong, 나머지 = playlist
    const [seedSong, ...remainingPlaylist] = playlist;

    return NextResponse.json({
      success: true,
      channel: {
        slug: channel.slug,
        name: channel.nameKo,
      },
      seedSong: serializeBigInt(seedSong),
      playlist: serializeBigInt(remainingPlaylist),
    });
  } catch (error) {
    console.error('Radio start error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start radio' },
      { status: 500 }
    );
  }
}
