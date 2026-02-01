/**
 * 곡 상세 페이지
 */

import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { ArrowLeft, Calendar, Eye, Tag, Clock, Trophy, TrendingUp, Globe } from 'lucide-react';
import { SongActionButtons } from '@/components/SongActionButtons';
import { DailyViewsChart } from '@/components/charts/DailyViewsChart';
import { RankingBadges } from '@/components/RankingBadges';
import { ExternalLinks } from '@/components/ExternalLinks';
import { InfoCard } from '@/components/InfoCard';
import { StatisticsPanel } from '@/components/StatisticsPanel';
import { RelatedSongsCarousel } from '@/components/RelatedSongsCarousel';
import { ArtistsByRole } from '@/components/ArtistsByRole';
import { TagList } from '@/components/TagList';
import type { Song, SongDetail, DailyViewCount, RankingPositions, SongStatistics } from '@/lib/db';
import { formatNumberFull, formatDate, formatDuration, getYouTubeThumbnail } from '@/lib/utils/format-utils';

// Extended song detail with computed fields for UI
interface SongDetailExtended extends SongDetail {
  titleKorean: string | null;
  titleEnglish: string | null;
  titleJapanese: string | null;
  titleRomaji: string | null;
  artistString: string;
  viewCount: bigint | null;
  viewCountUpdatedAt: Date | null;
  youtubeId: string | null;
  youtubeUrl: string | null;
  niconicoUrl: string | null;
}

interface ApiResponse {
  success: boolean;
  data?: {
    song: SongDetailExtended;
    dailyViews: DailyViewCount[];
    rankings: RankingPositions;
    relatedSongs: Song[];
    producerName: string | null;
    statistics: SongStatistics | null;
    isFavorited: boolean;
  };
  error?: string;
}

async function getSongData(vocadbId: string): Promise<ApiResponse> {
  // 현재 요청의 호스트를 사용하여 동적으로 baseUrl 구성
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3002';
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;

  const res = await fetch(`${baseUrl}/api/songs/${vocadbId}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    return { success: false, error: 'Failed to fetch song data' };
  }

  return res.json();
}

export default async function SongDetailPage({
  params,
}: {
  params: Promise<{ vocadbId: string }>;
}) {
  const { vocadbId } = await params;
  const response = await getSongData(vocadbId);

  if (!response.success || !response.data) {
    notFound();
  }

  const { song, dailyViews, rankings, relatedSongs, producerName, statistics, isFavorited } = response.data;

  // 최근 7일 증가량 계산
  const recentViews = dailyViews.slice(-7);
  const weeklyIncrease = recentViews.length >= 2
    ? recentViews[recentViews.length - 1].totalViews - recentViews[0].totalViews
    : 0;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="relative pb-6">
        <div className="max-w-7xl mx-auto px-8 pt-6">
          {/* Back Navigation */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-semibold">랭킹으로 돌아가기</span>
          </Link>

          {/* Hero Section */}
          <div className="flex flex-col md:flex-row gap-8 items-end pb-6">
            {/* Album Art */}
            <div className="flex-shrink-0">
              {(song.youtubeId || song.thumbUrl) ? (
                <img
                  src={song.youtubeId ? getYouTubeThumbnail(song.youtubeId, 'maxres') : song.thumbUrl!}
                  alt={song.titleKorean ?? song.titleEnglish ?? song.defaultName}
                  className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-lg shadow-2xl object-cover"
                />
              ) : (
                <div className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 shadow-2xl" />
              )}
            </div>

            {/* Song Info */}
            <div className="flex-1 pb-2">
              <p className="text-sm font-semibold mb-2">곡</p>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black mb-6 leading-tight">
                {song.titleKorean ?? song.titleEnglish ?? song.defaultName}
              </h1>

              {/* Artists Section - Grouped by Role */}
              <div className="space-y-3">
                <ArtistsByRole artists={song.artists} />

                {/* Metadata Row - Year and View Count */}
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  {song.publishDate && (
                    <>
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(song.publishDate).getFullYear()}</span>
                    </>
                  )}
                  {song.viewCount && (
                    <>
                      <span>•</span>
                      <Eye className="w-4 h-4" />
                      <span>{formatNumberFull(song.viewCount)} 조회</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-6 pb-player-offset">
        {/* Action Buttons */}
        <SongActionButtons song={song} initialIsFavorited={isFavorited} />

        {/* Rankings Section - Enhanced */}
        {rankings && (rankings.total || rankings.daily || rankings.weekly) && (
          <div className="mb-6 p-6 bg-gradient-to-r from-[#1a1a1a] to-[#252525] rounded-xl border border-gray-800 animate-fadeIn">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-[#facd66]" />
              랭킹
            </h3>
            <RankingBadges rankings={rankings} />
          </div>
        )}

        {/* Stats Grid - Redesigned */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 animate-fadeIn">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#252525] rounded-xl p-5 border border-gray-800 hover:border-gray-700 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <Eye className="w-5 h-5" />
                <span className="font-medium">총 조회수</span>
              </div>
              <TrendingUp className="w-5 h-5 text-[#39c5bb]" />
            </div>
            <div className="text-3xl font-bold">
              {song.viewCount ? formatNumberFull(song.viewCount) : 'N/A'}
            </div>
            {dailyViews.length >= 30 && (
              <p className="text-xs text-gray-500 mt-2">
                최근 30일 데이터 추적 중
              </p>
            )}
          </div>

          {weeklyIncrease > 0 && (
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#252525] rounded-xl p-5 border border-gray-800 hover:border-gray-700 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="text-gray-400 text-xs font-medium">주간 증가</div>
                <TrendingUp className="w-5 h-5 text-[#39c5bb]" />
              </div>
              <div className="text-3xl font-bold text-[#39c5bb]">
                +{formatNumberFull(weeklyIncrease)}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                최근 7일간 증가량
              </p>
            </div>
          )}
        </div>

        {/* Alternative Titles */}
        {(song.titleEnglish || song.titleJapanese || song.titleRomaji) && (
          <InfoCard title="다른 제목" icon={<Globe className="w-5 h-5" />} className="mb-6 animate-fadeIn">
            <div className="space-y-3">
              {song.titleEnglish && (
                <div className="flex items-start gap-3">
                  <span className="px-2 py-1 bg-[#2a2a2a] rounded text-xs text-gray-400 font-medium">EN</span>
                  <span className="text-gray-300 flex-1">{song.titleEnglish}</span>
                </div>
              )}
              {song.titleJapanese && (
                <div className="flex items-start gap-3">
                  <span className="px-2 py-1 bg-[#2a2a2a] rounded text-xs text-gray-400 font-medium">JP</span>
                  <span className="text-gray-300 flex-1">{song.titleJapanese}</span>
                </div>
              )}
              {song.titleRomaji && (
                <div className="flex items-start gap-3">
                  <span className="px-2 py-1 bg-[#2a2a2a] rounded text-xs text-gray-400 font-medium">RM</span>
                  <span className="text-gray-300 flex-1">{song.titleRomaji}</span>
                </div>
              )}
            </div>
          </InfoCard>
        )}

        {/* Song Info */}
        <InfoCard title="곡 정보" icon={<Tag className="w-5 h-5" />} className="mb-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {song.publishDate && (
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-gray-400">발매일</div>
                  <div className="font-semibold">{formatDate(song.publishDate)}</div>
                </div>
              </div>
            )}

            {song.lengthSeconds && (
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-gray-400">곡 길이</div>
                  <div className="font-semibold">{formatDuration(song.lengthSeconds)}</div>
                </div>
              </div>
            )}

          </div>
        </InfoCard>

        {/* Tags */}
        {song.tags && song.tags.length > 0 && <TagList tags={song.tags} />}

        {/* External Links */}
        <div className="mb-8">
          <h3 className="text-lg font-bold mb-3">외부 링크</h3>
          <ExternalLinks vocadbId={song.vocadbId} youtubeUrl={song.youtubeUrl} niconicoUrl={song.niconicoUrl} />
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-3">통계</h3>
            <StatisticsPanel statistics={statistics} />
          </div>
        )}

        {/* Related Songs */}
        {relatedSongs && relatedSongs.length > 0 && producerName && (
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-3">같은 프로듀서의 다른 곡</h3>
            <RelatedSongsCarousel songs={relatedSongs} title={producerName} />
          </div>
        )}

        {/* View History Chart */}
        {dailyViews.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-3">조회수 추이</h3>
            <div className="bg-[#1a1a1a] rounded-lg p-6">
              <DailyViewsChart data={dailyViews} />
              <p className="text-xs text-gray-500 mt-4 text-center">
                전체 {dailyViews.length}일간의 조회수 기록
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
