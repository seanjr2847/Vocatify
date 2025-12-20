/**
 * 곡 상세 페이지
 */

import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Calendar, Eye, Star, Tag, Play, Heart } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { MusicPlayerSection } from '@/components/MusicPlayerSection';
import { PlaySongButton } from '@/components/PlaySongButton';
import { DailyViewsChart } from '@/components/charts/DailyViewsChart';
import { RankingBadges } from '@/components/RankingBadges';
import { ExternalLinks } from '@/components/ExternalLinks';
import { StatisticsPanel } from '@/components/StatisticsPanel';
import { RelatedSongsCarousel } from '@/components/RelatedSongsCarousel';
import type { Song, DailyViewCount, RankingPositions, SongStatistics } from '@/lib/db';

interface ApiResponse {
  success: boolean;
  data?: {
    song: Song;
    dailyViews: DailyViewCount[];
    rankings: RankingPositions;
    relatedSongs: Song[];
    statistics: SongStatistics | null;
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

function formatNumber(num: number | bigint | null | undefined): string {
  if (!num) return '0';
  const n = typeof num === 'bigint' ? Number(num) : num;
  if (n >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toFixed(1)}B`;
  }
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }
  return n.toString();
}

function formatDate(dateInput?: string | Date | null): string {
  if (!dateInput) return 'N/A';
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return 'N/A';
  }
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

  const { song, dailyViews, rankings, relatedSongs, statistics } = response.data;

  // 최근 7일 증가량 계산
  const recentViews = dailyViews.slice(-7);
  const weeklyIncrease = recentViews.length >= 2
    ? recentViews[recentViews.length - 1].totalViews - recentViews[0].totalViews
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] via-[#121212] to-[#121212] text-white">
      {/* Header with gradient background */}
      <div className="relative bg-gradient-to-b from-[#2a2a2a] to-[#121212] pb-6">
        <div className="max-w-7xl mx-auto px-8 pt-16">
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
              {song.thumbUrl ? (
                <img
                  src={song.thumbUrl}
                  alt={song.title}
                  className="w-[232px] h-[232px] rounded-lg shadow-2xl object-cover"
                />
              ) : (
                <div className="w-[232px] h-[232px] rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 shadow-2xl" />
              )}
            </div>

            {/* Song Info */}
            <div className="flex-1 pb-2">
              <p className="text-sm font-semibold mb-2">곡</p>
              <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
                {song.title}
              </h1>

              <div className="flex items-center gap-3 text-sm">
                {song.thumbUrl && (
                  <img
                    src={song.thumbUrl}
                    alt={song.artist}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                )}
                <span className="font-bold hover:underline cursor-pointer">{song.artist}</span>
                {song.publishDate && (
                  <>
                    <span>•</span>
                    <span>{new Date(song.publishDate).getFullYear()}</span>
                  </>
                )}
                {song.viewCount && (
                  <>
                    <span>•</span>
                    <span>{formatNumber(song.viewCount)} 조회</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-6 pb-[150px]">
        {/* Action Buttons */}
        <div className="flex items-center gap-4 mb-8">
          <PlaySongButton song={song} />

          <button className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-white transition-colors">
            <Heart className="w-8 h-8" />
          </button>
        </div>

        {/* Rankings Section */}
        {rankings && (rankings.total || rankings.daily || rankings.weekly) && (
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-3">랭킹</h3>
            <RankingBadges rankings={rankings} />
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-[#1a1a1a] rounded-lg p-4 hover:bg-[#2a2a2a] transition-colors">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <Eye className="w-4 h-4" />
              <span>총 조회수</span>
            </div>
            <div className="text-2xl font-bold">
              {song.viewCount ? formatNumber(song.viewCount) : 'N/A'}
            </div>
          </div>

          {weeklyIncrease > 0 && (
            <div className="bg-[#1a1a1a] rounded-lg p-4 hover:bg-[#2a2a2a] transition-colors">
              <div className="text-gray-400 text-xs mb-1">주간 증가</div>
              <div className="text-2xl font-bold text-[#39c5bb]">
                +{formatNumber(weeklyIncrease)}
              </div>
            </div>
          )}
        </div>

        {/* Alternative Titles */}
        {(song.titleEnglish || song.titleJapanese || song.titleRomaji) && (
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-3">다른 제목</h3>
            <div className="space-y-2 text-sm text-gray-400">
              {song.titleEnglish && (
                <div>
                  <span className="text-gray-500">영어:</span> {song.titleEnglish}
                </div>
              )}
              {song.titleJapanese && (
                <div>
                  <span className="text-gray-500">일본어:</span> {song.titleJapanese}
                </div>
              )}
              {song.titleRomaji && (
                <div>
                  <span className="text-gray-500">로마자:</span> {song.titleRomaji}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Song Info */}
        <div className="mb-8">
          <h3 className="text-lg font-bold mb-3">곡 정보</h3>
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

            {song.songType && (
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 mt-0.5" />
                <div>
                  <div className="text-gray-400">곡 유형</div>
                  <div className="font-semibold">{song.songType}</div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="w-4 h-4 mt-0.5" />
              <div>
                <div className="text-gray-400">VocaDB ID</div>
                <div className="font-semibold">#{song.vocadbId}</div>
              </div>
            </div>

            {song.viewCountUpdatedAt && (
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 mt-0.5" />
                <div>
                  <div className="text-gray-400">마지막 업데이트</div>
                  <div className="font-semibold">{formatDate(song.viewCountUpdatedAt)}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* External Links */}
        <div className="mb-8">
          <h3 className="text-lg font-bold mb-3">외부 링크</h3>
          <ExternalLinks vocadbId={song.vocadbId} youtubeUrl={song.youtubeUrl} />
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-3">통계</h3>
            <StatisticsPanel statistics={statistics} />
          </div>
        )}

        {/* Related Songs */}
        {relatedSongs && relatedSongs.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-3">같은 아티스트의 다른 곡</h3>
            <RelatedSongsCarousel songs={relatedSongs} title={song.artist} />
          </div>
        )}

        {/* Tags */}
        {/* {song.tags && (
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-3">태그</h3>
            <div className="flex flex-wrap gap-2">
              {song.tags.split(',').map((tag, index) => (
                <span
                  key={index}
                  className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white px-3 py-1.5 rounded-full text-sm transition-colors cursor-pointer"
                >
                  {tag.trim()}
                </span>
              ))}
            </div>
          </div>
        )} */}

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

      {/* Fixed Music Player */}
      <MusicPlayerSection />
    </div>
  );
}
