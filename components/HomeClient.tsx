"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home, Music, Radio, Search, User, Video } from "lucide-react";
import React, { useState } from "react";
import { MusicPlayerSection } from "@/components/MusicPlayerSection";
import { NavigationSection } from "@/components/NavigationSection";
import { RankingItem } from "@/lib/db";

const navigationItems = [
  { icon: Home, alt: "홈", active: false },
  { icon: Music, alt: "음악 라이브러리", active: false },
  { icon: Radio, alt: "라디오", active: false },
  { icon: Video, alt: "비디오", active: false },
];

const personalItems = [
  { icon: User, alt: "프로필" },
  { icon: User, alt: "설정" },
];

interface HomeClientProps {
  topCharts: RankingItem[];
  newReleases: RankingItem[];
  popularSongs: RankingItem[];
}

export function HomeClient({ topCharts, newReleases, popularSongs }: HomeClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.length >= 2) {
      // TODO: 검색 기능 구현
      console.log("검색:", searchQuery);
    }
  };

  return (
    <div className="bg-[#1d2123] overflow-hidden w-full min-w-[1280px] flex flex-col min-h-screen">
      <div className="flex flex-1">
        <aside className="w-[92px] flex-shrink-0 flex flex-col items-center py-6 gap-6">
          <div className="w-[34px] h-[34px] flex items-center justify-center">
            {/* 로고 플레이스홀더 - 로고 이미지를 추가하세요 */}
          </div>

          <nav className="flex flex-col items-center bg-dark-alt rounded-[32px] p-4 gap-[30px] mt-10">
            {navigationItems.map((item, index) => (
              <Button
                key={index}
                variant="ghost"
                size="icon"
                className="w-[22px] h-[22px] p-0 hover:bg-transparent"
              >
                <item.icon className="w-[22px] h-[22px] text-white/40" />
              </Button>
            ))}
          </nav>

          <div className="flex flex-col items-center gap-4 mt-auto">
            {personalItems.map((item, index) => (
              <Button
                key={index}
                variant="ghost"
                size="icon"
                className="w-[22px] h-[22px] p-0 hover:bg-transparent"
              >
                <item.icon className="w-[22px] h-[22px] text-white/40" />
              </Button>
            ))}
          </div>
        </aside>

        <main className="flex-1 flex flex-col">
          <header className="h-[73px] bg-[#1d2123] flex items-center px-[27px]">
            <form onSubmit={handleSearch} className="flex items-center gap-[22px] w-full">
              <Search className="w-4 h-4 text-white/25" />
              <Input
                type="text"
                placeholder="아티스트 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 bg-transparent text-sm font-semibold text-white/25 placeholder:text-white/25 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto [font-family:'Quicksand-SemiBold',Helvetica]"
              />
            </form>
          </header>

          <section className="flex-1 relative w-full py-6 pb-[150px]">
            <NavigationSection
              topCharts={topCharts}
              newReleases={newReleases}
              popularSongs={popularSongs}
            />
          </section>
        </main>
      </div>

      <section className="relative w-full">
        <MusicPlayerSection />
      </section>
    </div>
  );
}
