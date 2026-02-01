/**
 * 곡 상세 정보 API
 * GET /api/songs/[vocadbId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import {
  getSongById,
  getDailyViewCounts,
  getSongRankPositions,
  getRelatedSongsByArtist,
  getSongStatistics,
} from '@/lib/db';
import { isSongFavorited } from '@/lib/db/user';
import { serializeBigInt } from '@/lib/serialize';

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

    // Get producer/composer artist ID for related songs
    // Priority: Producer > Composer > Lyricist
    const producerArtist = song.artists.find(a =>
      !a.isSupport &&
      (a.categories.includes('Producer') ||
       a.categories.includes('Composer') ||
       a.categories.includes('Lyricist'))
    );
    const producerArtistId = producerArtist?.id ?? null;
    const producerName = producerArtist?.name ?? null;

    // Compute UI-friendly fields
    const titleKorean = song.names.find(n => n.language === 'Korean')?.value || null;
    const titleEnglish = song.names.find(n => n.language === 'English')?.value || null;
    const titleJapanese = song.names.find(n => n.language === 'Japanese')?.value || null;
    const titleRomaji = song.names.find(n => n.language === 'Romaji')?.value || null;

    const artistString = song.artists
      .filter(a => !a.isSupport)
      .map(a => a.name)
      .join(', ');

    const youtubePv = song.pvs.find(pv => pv.service === 'Youtube');
    const viewCount = youtubePv?.viewCount || null;
    const viewCountUpdatedAt = youtubePv?.viewCountUpdatedAt || null;
    const youtubeId = youtubePv?.pvId || null;
    const youtubeUrl = youtubePv?.url || null;

    // NicoNico Douga PV
    const niconicoPv = song.pvs.find(pv => pv.service === 'NicoNicoDouga');
    const niconicoUrl = niconicoPv?.url || null;

    // Extended song with computed fields
    const extendedSong = {
      ...song,
      titleKorean,
      titleEnglish,
      titleJapanese,
      titleRomaji,
      artistString,
      viewCount,
      viewCountUpdatedAt,
      youtubeId,
      youtubeUrl,
      niconicoUrl,
    };

    // Check authentication for favorite status
    const session = await auth();

    // 병렬로 추가 데이터 조회
    const [dailyViews, rankings, relatedSongs, statistics, isFavorited] = await Promise.all([
      Promise.resolve(getDailyViewCounts(vocadbId, 30)),
      Promise.resolve(getSongRankPositions(vocadbId)).catch((error) => {
        console.error('Rankings fetch failed:', error);
        return { total: null, daily: null, weekly: null };
      }),
      producerArtistId
        ? Promise.resolve(getRelatedSongsByArtist(producerArtistId, vocadbId, 6)).catch((error) => {
            console.error('Related songs fetch failed:', error);
            return [];
          })
        : Promise.resolve([]),
      Promise.resolve(getSongStatistics(vocadbId)).catch((error) => {
        console.error('Statistics fetch failed:', error);
        return null;
      }),
      session?.user?.id
        ? isSongFavorited(session.user.id, vocadbId)
        : Promise.resolve(false),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: serializeBigInt({
          song: extendedSong,
          dailyViews,
          rankings,
          relatedSongs,
          producerName,
          statistics,
          isFavorited,
        }),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error: unknown) {
    console.error('곡 상세 조회 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '곡 조회 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
