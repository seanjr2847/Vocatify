"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Heart, Play, ChevronRight, Plus } from "lucide-react";
import React from "react";
import { useRouter } from "next/navigation";
import { RankingItem } from "@/lib/db";
import { useMusicPlayer } from "@/lib/MusicPlayerContext";

interface NavigationSectionProps {
  topCharts: RankingItem[];
  newReleases: RankingItem[];
  popularSongs: RankingItem[];
}

// 조회수 포맷팅 함수
function formatViews(views: number | undefined): string {
  if (!views) return "0";
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  }
  return views.toString();
}

// YouTube 썸네일 URL 생성
function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

export const NavigationSection = ({ topCharts, newReleases, popularSongs }: NavigationSectionProps): JSX.Element => {
  const router = useRouter();
  const { playSong, addToPlaylist } = useMusicPlayer();
  const topSong = topCharts[0];
  const totalFavorites = topCharts.reduce((sum, song) => sum + (song.favoritedTimes || 0), 0);

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
                  {topSong ? topSong.title : '보컬로이드 히트곡'}
                </h2>

                <p className="[font-family:'Quicksand-Regular',Helvetica] font-normal text-white text-sm tracking-[0] leading-[16.8px] max-w-[300px]">
                  {topCharts.slice(0, 3).map(song => song.title).join(', ')}
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
                <img
                  className="absolute top-[-50px] right-[-50px] w-[400px] h-[500px] object-cover opacity-30"
                  alt="추천 아티스트"
                  src={topSong.thumbUrl}
                />
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
            {topCharts.slice(0, 3).map((chart) => (
              <Card
                key={chart.vocadbId}
                className="bg-dark-alt rounded-[20px] border-0 overflow-hidden hover:bg-dark-alt/80 transition-colors cursor-pointer group"
                onClick={() => router.push(`/songs/${chart.vocadbId}`)}
              >
                <CardContent className="relative p-0 h-24">
                  <img
                    className="absolute top-[17px] left-[17px] w-[63px] h-[63px] object-cover rounded"
                    alt={chart.title}
                    src={getYouTubeThumbnail(chart.youtubeId)}
                  />

                  <div className="absolute top-[17px] left-[94px] font-regular-17px font-[number:var(--regular-17px-font-weight)] text-white text-[length:var(--regular-17px-font-size)] tracking-[var(--regular-17px-letter-spacing)] leading-[var(--regular-17px-line-height)] max-w-[250px] truncate [font-style:var(--regular-17px-font-style)]">
                    {chart.title}
                  </div>

                  <div className="absolute top-[41px] left-[94px] font-regular-12px font-[number:var(--regular-12px-font-weight)] text-[#ffffff80] text-[length:var(--regular-12px-font-size)] tracking-[var(--regular-12px-letter-spacing)] leading-[var(--regular-12px-line-height)] whitespace-nowrap [font-style:var(--regular-12px-font-style)]">
                    {chart.artist}
                  </div>

                  <div className="absolute top-[30px] right-[17px] flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <button
                      className="w-[32px] h-[32px] rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center hover:scale-105 shadow-lg transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToPlaylist(chart);
                      }}
                      title="재생목록에 추가"
                    >
                      <Plus className="w-4 h-4 text-white" />
                    </button>
                    <button
                      className="w-[37px] h-[37px] rounded-full bg-[#39c5bb] flex items-center justify-center hover:scale-105 shadow-lg transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        playSong(chart);
                      }}
                      title="재생"
                    >
                      <Play className="w-4 h-4 text-black fill-black ml-0.5" />
                    </button>
                  </div>

                  <div className="absolute top-[63px] left-[94px] font-regular-12px font-[number:var(--regular-12px-font-weight)] text-white text-[length:var(--regular-12px-font-size)] tracking-[var(--regular-12px-letter-spacing)] leading-[var(--regular-12px-line-height)] whitespace-nowrap [font-style:var(--regular-12px-font-style)]">
                    {formatViews(chart.viewCount)} 조회
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* 최신 발매 */}
      <div className="mt-[43px]">
        <h2 className="font-bold-24px font-[number:var(--bold-24px-font-weight)] text-light text-[length:var(--bold-24px-font-size)] tracking-[var(--bold-24px-letter-spacing)] leading-[var(--bold-24px-line-height)] whitespace-nowrap [font-style:var(--bold-24px-font-style)] mb-[9px]">
          최신 발매
        </h2>

        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-[30px] pb-4">
            {newReleases.map((release) => (
              <div
                key={release.vocadbId}
                className="inline-flex flex-col gap-[5px] w-[153px] cursor-pointer group"
                onClick={() => router.push(`/songs/${release.vocadbId}`)}
              >
                <div className="relative w-[153px] h-[153px]">
                  <img
                    className="w-full h-full object-cover rounded"
                    alt={release.title}
                    src={getYouTubeThumbnail(release.youtubeId)}
                  />
                  <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <button
                      className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center hover:scale-105 shadow-lg transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToPlaylist(release);
                      }}
                      title="재생목록에 추가"
                    >
                      <Plus className="w-4 h-4 text-white" />
                    </button>
                    <button
                      className="w-12 h-12 rounded-full bg-[#39c5bb] flex items-center justify-center hover:scale-105 shadow-lg transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        playSong(release);
                      }}
                      title="재생"
                    >
                      <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                    </button>
                  </div>
                </div>

                <div className="[font-family:'Quicksand-Regular',Helvetica] font-normal text-white text-xs tracking-[0] leading-[normal] truncate">
                  {release.title}
                </div>

                <div className="[font-family:'Quicksand-Regular',Helvetica] font-normal text-[#ffffff80] text-xs tracking-[0] leading-[normal] truncate">
                  {release.artist}
                </div>

                <div className="[font-family:'Quicksand-Regular',Helvetica] font-normal text-[#ffffff60] text-xs tracking-[0] leading-[normal]">
                  {formatViews(release.viewCount)} 조회
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* 주간 인기곡 */}
      <div className="mt-[57px]">
        <h2 className="font-bold-24px font-[number:var(--bold-24px-font-weight)] text-light text-[length:var(--bold-24px-font-size)] tracking-[var(--bold-24px-letter-spacing)] leading-[var(--bold-24px-line-height)] whitespace-nowrap [font-style:var(--bold-24px-font-style)] mb-[9px]">
          주간 인기곡
        </h2>

        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-[30px] pb-4">
            {popularSongs.map((item) => (
              <div
                key={item.vocadbId}
                className="inline-flex flex-col gap-[5px] w-[153px] cursor-pointer group"
                onClick={() => router.push(`/songs/${item.vocadbId}`)}
              >
                <div className="relative w-[153px] h-[153px]">
                  <img
                    className="w-full h-full object-cover rounded"
                    alt={item.title}
                    src={getYouTubeThumbnail(item.youtubeId)}
                  />
                  <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <button
                      className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center hover:scale-105 shadow-lg transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToPlaylist(item);
                      }}
                      title="재생목록에 추가"
                    >
                      <Plus className="w-4 h-4 text-white" />
                    </button>
                    <button
                      className="w-12 h-12 rounded-full bg-[#39c5bb] flex items-center justify-center hover:scale-105 shadow-lg transition-all"
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

                <div className="[font-family:'Quicksand-Regular',Helvetica] font-normal text-white text-xs tracking-[0] leading-[normal] truncate">
                  {item.title}
                </div>

                <div className="[font-family:'Quicksand-Regular',Helvetica] font-normal text-[#ffffff80] text-xs tracking-[0] leading-[normal] truncate">
                  {item.artist}
                </div>

                <div className="[font-family:'Quicksand-Regular',Helvetica] font-normal text-[#ffffff60] text-xs tracking-[0] leading-[normal]">
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

export default NavigationSection;
