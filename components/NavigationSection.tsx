"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Heart, Play, ChevronRight, Plus } from "lucide-react";
import React, { memo, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { RankingItem } from "@/lib/db";
import { useMusicPlayer } from "@/lib/MusicPlayerContext";
import { formatNumber as formatViews, getYouTubeThumbnail, formatPublishDate } from "@/lib/utils/format-utils";

interface NavigationSectionProps {
  topCharts: RankingItem[];
  newReleases: RankingItem[];
  popularSongs: RankingItem[];
}

const NavigationSectionComponent = ({ topCharts, newReleases, popularSongs }: NavigationSectionProps): JSX.Element => {
  const router = useRouter();
  const { playSong, addToPlaylist } = useMusicPlayer();
  const topSong = topCharts[0];

  // Memoize computed values
  const totalFavorites = useMemo(
    () => topCharts.reduce((sum, song) => sum + (song.favoritedTimes || 0), 0),
    [topCharts]
  );
  const topThreeCharts = useMemo(() => topCharts.slice(0, 3), [topCharts]);
  const topSixReleases = useMemo(() => newReleases.slice(0, 6), [newReleases]);

  return (
    <section className="relative w-full h-auto px-6">
      <div className="grid grid-cols-1 lg:grid-cols-[686px_1fr] gap-6">
        {/* 추천 플레이리스트 카드 */}
        <div className="relative">
          <div className="absolute top-[95px] left-[89px] w-[507px] h-[287px] bg-[#7a8f95] blur-[25.58px] mix-blend-color-dodge opacity-45" />

          <Card className="relative w-full h-[373px] bg-[#5f9eaf] rounded-[40px] overflow-hidden border-0">
            <CardContent className="relative p-0 h-full">
              <div className="absolute top-[38px] left-[45px] font-regular-12px font-[number:var(--regular-12px-font-weight)] text-white text-[length:var(--regular-12px-font-size)] tracking-[var(--regular-12px-letter-spacing)] leading-[var(--regular-12px-line-height)] whitespace-nowrap [font-style:var(--regular-12px-font-style)]">
                큐레이션 플레이리스트
              </div>

              <div className="absolute top-[137px] left-[45px] flex flex-col gap-1.5 z-10">
                <h2 className="font-bold-35px font-[number:var(--bold-35px-font-weight)] text-white text-[length:var(--bold-35px-font-size)] tracking-[var(--bold-35px-letter-spacing)] leading-[var(--bold-35px-line-height)] whitespace-nowrap [font-style:var(--bold-35px-font-style)]">
                  {topSong ? (topSong.titleKorean ?? topSong.titleEnglish ?? topSong.defaultName) : '보컬로이드 히트곡'}
                </h2>

                <p className="[font-family:'Quicksand-Regular',Helvetica] font-normal text-white text-sm tracking-[0] leading-[16.8px] max-w-[300px]">
                  {topCharts.slice(0, 3).map(song => song.titleKorean ?? song.titleEnglish ?? song.defaultName).join(', ')}
                  {topCharts.length > 3 && ', 그 외 다수'}
                </p>
              </div>

              <div className="absolute top-[312px] left-[54px] flex items-center gap-[11px] z-10">
                <div className="flex items-center gap-2">
                  <div className="relative w-4 h-4">
                    <Heart className="w-[13px] h-[13px] absolute top-0.5 left-px text-white fill-white" />
                  </div>

                  <span className="font-regular-14px font-[number:var(--regular-14px-font-weight)] text-white text-[length:var(--regular-14px-font-size)] tracking-[var(--regular-14px-letter-spacing)] leading-[var(--regular-14px-line-height)] whitespace-nowrap [font-style:var(--regular-14px-font-style)]">
                    좋아요 {formatViews(totalFavorites)}
                  </span>
                </div>
              </div>

              {topSong && topSong.thumbUrl && (
                <div className="absolute top-[-50px] right-[-50px] w-[400px] h-[500px] opacity-30">
                  <Image
                    src={topSong.thumbUrl}
                    alt="추천 아티스트"
                    fill
                    className="object-cover"
                    sizes="400px"
                    priority
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 인기 차트 */}
        <div className="flex flex-col gap-[15px]">
          <div className="flex items-center justify-between">
            <h2 className="font-bold-24px font-[number:var(--bold-24px-font-weight)] text-light text-[length:var(--bold-24px-font-size)] tracking-[var(--bold-24px-letter-spacing)] leading-[var(--bold-24px-line-height)] whitespace-nowrap [font-style:var(--bold-24px-font-style)]">
              인기 차트
            </h2>
            <button
              onClick={() => router.push('/charts')}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="인기 차트 전체 보기"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          <div className="flex flex-col gap-[15px]">
            {topThreeCharts.map((chart, idx) => (
              <Card key={chart.vocadbId}
                className={`relative rounded-[20px] border-0 overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 ${
                  idx === 0
                    ? 'bg-gradient-to-r from-[#39c5bb]/20 via-[#1a1a1a] to-[#1a1a1a] shadow-[0_0_30px_rgba(57,197,187,0.15)] hover:shadow-[0_0_40px_rgba(57,197,187,0.25)]'
                    : idx === 1
                    ? 'bg-gradient-to-r from-[#facd66]/15 via-[#1a1a1a] to-[#1a1a1a] shadow-[0_0_20px_rgba(250,205,102,0.1)] hover:shadow-[0_0_30px_rgba(250,205,102,0.2)]'
                    : 'bg-[#1a1a1a] hover:bg-[#222222] shadow-lg hover:shadow-xl'
                }`}
                onClick={() => router.push(`/songs/${chart.vocadbId}`)}
              >
                <CardContent className="relative p-0 h-24">
                  {/* 순위 배지 */}
                  <div className={`absolute top-1/2 -translate-y-1/2 left-3 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    idx === 0
                      ? 'bg-[#39c5bb] text-black shadow-[0_0_15px_rgba(57,197,187,0.5)]'
                      : idx === 1
                      ? 'bg-[#facd66] text-black shadow-[0_0_12px_rgba(250,205,102,0.4)]'
                      : 'bg-white/20 text-white'
                  }`}>
                    {idx + 1}
                  </div>

                  <div className="absolute top-[17px] left-[55px] w-[63px] h-[63px] rounded-lg overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow">
                    <Image
                      src={chart.thumbUrl || (chart.youtubeId ? getYouTubeThumbnail(chart.youtubeId) : '/placeholder.png')}
                      alt={chart.titleKorean ?? chart.titleEnglish ?? chart.defaultName}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                      sizes="63px"
                    />
                  </div>

                  <div className="absolute top-[17px] left-[130px] font-regular-17px font-[number:var(--regular-17px-font-weight)] text-white text-[length:var(--regular-17px-font-size)] tracking-[var(--regular-17px-letter-spacing)] leading-[var(--regular-17px-line-height)] max-w-[220px] truncate [font-style:var(--regular-17px-font-style)]">
                    {chart.titleKorean ?? chart.titleEnglish ?? chart.defaultName}
                  </div>

                  <div className="absolute top-[41px] left-[130px] font-regular-12px font-[number:var(--regular-12px-font-weight)] text-[#ffffff80] text-[length:var(--regular-12px-font-size)] tracking-[var(--regular-12px-letter-spacing)] leading-[var(--regular-12px-line-height)] whitespace-nowrap [font-style:var(--regular-12px-font-style)]">
                    {chart.artistString}
                  </div>

                  <div className="absolute top-[30px] right-[17px] flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                    <button
                      className="w-[32px] h-[32px] rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center hover:scale-110 shadow-lg transition-all duration-200 backdrop-blur-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToPlaylist(chart);
                      }}
                      title="재생목록에 추가"
                    >
                      <Plus className="w-4 h-4 text-white" />
                    </button>
                    <button
                      className="w-[37px] h-[37px] rounded-full bg-[#39c5bb] flex items-center justify-center hover:scale-110 shadow-[0_0_20px_rgba(57,197,187,0.4)] hover:shadow-[0_0_25px_rgba(57,197,187,0.6)] transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        playSong(chart);
                      }}
                      title="재생"
                    >
                      <Play className="w-4 h-4 text-black fill-black ml-0.5" />
                    </button>
                  </div>

                  <div className={`absolute top-[63px] left-[130px] font-regular-12px text-[length:var(--regular-12px-font-size)] whitespace-nowrap ${
                    idx === 0 ? 'text-[#39c5bb]' : idx === 1 ? 'text-[#facd66]' : 'text-white/70'
                  }`}>
                    {formatViews(chart.viewCount)} 조회
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* 최신 발매곡 차트 */}
      <div className="mt-[43px]">
        <div className="flex items-center justify-between mb-[15px]">
          <h2 className="font-bold-24px font-[number:var(--bold-24px-font-weight)] text-light text-[length:var(--bold-24px-font-size)] tracking-[var(--bold-24px-letter-spacing)] leading-[var(--bold-24px-line-height)] whitespace-nowrap [font-style:var(--bold-24px-font-style)]">
            최신 발매곡
          </h2>
          <button
            onClick={() => router.push('/charts?tab=new')}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="최신 발매곡 전체 보기"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topSixReleases.map((release, idx) => (
            <Card key={release.vocadbId}
              className={`relative rounded-[20px] border-0 overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-[1.02] ${
                idx < 2
                  ? 'bg-gradient-to-br from-[#39c5bb]/10 via-[#1a1a1a] to-[#1a1a1a] hover:shadow-[0_0_25px_rgba(57,197,187,0.15)]'
                  : 'bg-[#1a1a1a] hover:bg-[#222222]'
              } shadow-md hover:shadow-lg`}
              onClick={() => router.push(`/songs/${release.vocadbId}`)}
            >
              <CardContent className="relative p-0 h-20">
                {/* 순위 배지 */}
                <div className={`absolute top-1/2 -translate-y-1/2 left-3 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                  idx === 0
                    ? 'bg-gradient-to-br from-[#39c5bb] to-[#2ba39a] text-black shadow-[0_0_12px_rgba(57,197,187,0.5)]'
                    : idx === 1
                    ? 'bg-gradient-to-br from-[#facd66] to-[#e5b84d] text-black shadow-[0_0_10px_rgba(250,205,102,0.4)]'
                    : idx === 2
                    ? 'bg-gradient-to-br from-[#c0c0c0] to-[#a0a0a0] text-black'
                    : 'bg-white/15 text-white/80'
                }`}>
                  {idx + 1}
                </div>

                <div className="absolute top-[10px] left-[48px] w-[60px] h-[60px] rounded-lg overflow-hidden shadow-md group-hover:shadow-lg transition-all duration-300">
                  <Image
                    src={release.thumbUrl || (release.youtubeId ? getYouTubeThumbnail(release.youtubeId) : '/placeholder.png')}
                    alt={release.titleKorean ?? release.titleEnglish ?? release.defaultName}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                    sizes="60px"
                  />
                </div>

                <div className="absolute top-[14px] left-[118px] right-[100px]">
                  <div className="font-regular-17px font-[number:var(--regular-17px-font-weight)] text-white text-[length:var(--regular-17px-font-size)] truncate group-hover:text-[#39c5bb] transition-colors duration-300">
                    {release.titleKorean ?? release.titleEnglish ?? release.defaultName}
                  </div>
                  <div className="font-regular-12px text-[#ffffff80] text-[length:var(--regular-12px-font-size)] truncate mt-0.5">
                    {release.artistString}
                  </div>
                </div>

                {/* 발매일 - NEW 배지 추가 */}
                <div className="absolute top-[14px] right-[17px] text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    {release.publishDate && (
                      <span className={`font-regular-12px text-xs ${
                        formatPublishDate(release.publishDate) === '오늘' || formatPublishDate(release.publishDate) === '어제'
                          ? 'px-2 py-0.5 rounded-full bg-[#39c5bb]/20 text-[#39c5bb] font-medium'
                          : 'text-[#39c5bb]/80'
                      }`}>
                        {formatPublishDate(release.publishDate)}
                      </span>
                    )}
                  </div>
                  <div className="font-regular-12px text-[#ffffff60] text-xs mt-1">
                    {formatViews(release.viewCount)} 조회
                  </div>
                </div>

                {/* 호버 버튼 */}
                <div className="absolute top-1/2 -translate-y-1/2 right-[90px] flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                  <button
                    className="w-[28px] h-[28px] rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center hover:scale-110 shadow-lg transition-all duration-200 backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToPlaylist(release);
                    }}
                    title="재생목록에 추가"
                  >
                    <Plus className="w-3.5 h-3.5 text-white" />
                  </button>
                  <button
                    className="w-[32px] h-[32px] rounded-full bg-[#39c5bb] flex items-center justify-center hover:scale-110 shadow-[0_0_15px_rgba(57,197,187,0.4)] hover:shadow-[0_0_20px_rgba(57,197,187,0.6)] transition-all duration-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      playSong(release);
                    }}
                    title="재생"
                  >
                    <Play className="w-3.5 h-3.5 text-black fill-black ml-0.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 주간 인기곡 */}
      <div className="mt-[57px]">
        <h2 className="font-bold-24px font-[number:var(--bold-24px-font-weight)] text-light text-[length:var(--bold-24px-font-size)] tracking-[var(--bold-24px-letter-spacing)] leading-[var(--bold-24px-line-height)] whitespace-nowrap [font-style:var(--bold-24px-font-style)] mb-[9px]">
          주간 인기곡
        </h2>

        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-[30px] pb-4">
            {popularSongs.map((item, idx) => (
              <div key={item.vocadbId}
                className="inline-flex flex-col gap-[5px] w-[153px] cursor-pointer group transition-all duration-300 hover:-translate-y-2"
                onClick={() => router.push(`/songs/${item.vocadbId}`)}
              >
                <div className={`relative w-[153px] h-[153px] rounded-xl overflow-hidden transition-all duration-300 ${
                  idx < 3
                    ? 'shadow-[0_4px_20px_rgba(57,197,187,0.2)] group-hover:shadow-[0_8px_30px_rgba(57,197,187,0.35)]'
                    : 'shadow-lg group-hover:shadow-xl'
                }`}>
                  <Image
                    src={item.thumbUrl || (item.youtubeId ? getYouTubeThumbnail(item.youtubeId) : '/placeholder.png')}
                    alt={item.titleKorean ?? item.titleEnglish ?? item.defaultName}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                    sizes="153px"
                  />
                  {/* 순위 배지 (상위 3곡) */}
                  {idx < 3 && (
                    <div className={`absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                      idx === 0
                        ? 'bg-[#39c5bb] text-black shadow-[0_0_10px_rgba(57,197,187,0.6)]'
                        : idx === 1
                        ? 'bg-[#facd66] text-black shadow-[0_0_8px_rgba(250,205,102,0.5)]'
                        : 'bg-white/80 text-black'
                    }`}>
                      {idx + 1}
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    <button
                      className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center hover:scale-110 shadow-lg transition-all duration-200 backdrop-blur-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToPlaylist(item);
                      }}
                      title="재생목록에 추가"
                    >
                      <Plus className="w-4 h-4 text-white" />
                    </button>
                    <button
                      className="w-12 h-12 rounded-full bg-[#39c5bb] flex items-center justify-center hover:scale-110 shadow-[0_0_20px_rgba(57,197,187,0.5)] hover:shadow-[0_0_28px_rgba(57,197,187,0.7)] transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        playSong(item);
                      }}
                      title="재생"
                    >
                      <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                    </button>
                  </div>
                </div>

                <div className="font-medium text-white text-xs truncate group-hover:text-[#39c5bb] transition-colors duration-200">
                  {item.titleKorean ?? item.titleEnglish ?? item.defaultName}
                </div>

                <div className="text-[#ffffff80] text-xs truncate">
                  {item.artistString}
                </div>

                <div className={`text-xs ${
                  item.weeklyIncrease ? 'text-[#39c5bb] font-medium' : 'text-[#ffffff60]'
                }`}>
                  {item.weeklyIncrease && `+${formatViews(Number(item.weeklyIncrease))} 이번 주`}
                  {!item.weeklyIncrease && `${formatViews(item.viewCount)} 조회`}
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </section>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const NavigationSection = memo(NavigationSectionComponent);
export default NavigationSection;
