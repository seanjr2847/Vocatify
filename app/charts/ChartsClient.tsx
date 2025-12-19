"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home, Music, Radio, Search, User, Video } from "lucide-react";
import { MusicPlayerSection } from "@/components/MusicPlayerSection";
import { ChartsTabNavigation, type TabType } from "@/components/charts/ChartsTabNavigation";
import { RankingSongCard } from "@/components/charts/RankingSongCard";
import { LoadMoreButton } from "@/components/charts/LoadMoreButton";
import type { RankingItem } from "@/lib/db";

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

interface TabData {
  data: RankingItem[];
  offset: number;
  hasMore: boolean;
  isLoading: boolean;
}

interface ChartsClientProps {
  initialTotalRanking: RankingItem[];
  initialDailyRanking: RankingItem[];
  initialWeeklyRanking: RankingItem[];
}

export function ChartsClient({
  initialTotalRanking,
  initialDailyRanking,
  initialWeeklyRanking,
}: ChartsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>('total');
  const [tabsData, setTabsData] = useState<Record<TabType, TabData>>({
    total: {
      data: initialTotalRanking,
      offset: 100,
      hasMore: initialTotalRanking.length === 100,
      isLoading: false,
    },
    daily: {
      data: initialDailyRanking,
      offset: 100,
      hasMore: initialDailyRanking.length === 100,
      isLoading: false,
    },
    weekly: {
      data: initialWeeklyRanking,
      offset: 100,
      hasMore: initialWeeklyRanking.length === 100,
      isLoading: false,
    },
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.length >= 2) {
      // TODO: 검색 기능 구현
      console.log("검색:", searchQuery);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const loadMore = async () => {
    const currentTabData = tabsData[activeTab];
    if (currentTabData.isLoading || !currentTabData.hasMore) return;

    // Set loading state
    setTabsData(prev => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], isLoading: true },
    }));

    try {
      const endpoint = `/api/ranking/${activeTab}`;
      const response = await fetch(
        `${endpoint}?limit=100&offset=${currentTabData.offset}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch more songs');
      }

      const result = await response.json();
      const newSongs: RankingItem[] = result.data || [];

      setTabsData(prev => ({
        ...prev,
        [activeTab]: {
          data: [...prev[activeTab].data, ...newSongs],
          offset: prev[activeTab].offset + 100,
          hasMore: newSongs.length === 100,
          isLoading: false,
        },
      }));
    } catch (error) {
      console.error('Error loading more songs:', error);
      setTabsData(prev => ({
        ...prev,
        [activeTab]: { ...prev[activeTab], isLoading: false },
      }));
    }
  };

  const currentTabData = tabsData[activeTab];

  return (
    <div className="bg-[#1d2123] overflow-hidden w-full min-w-[1280px] flex flex-col min-h-screen">
      <div className="flex flex-1">
        <aside className="w-[92px] flex-shrink-0 flex flex-col items-center py-6 gap-6">
          <div className="w-[34px] h-[34px] flex items-center justify-center">
            {/* 로고 플레이스홀더 */}
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

          <section className="flex-1 relative w-full px-6 py-6 pb-[150px] custom-scrollbar overflow-y-auto">
            <div className="mb-6">
              <h1 className="text-4xl font-bold text-white mb-6">차트 (Charts)</h1>
              <ChartsTabNavigation activeTab={activeTab} onChange={handleTabChange} />
            </div>

            <div className="grid grid-cols-1 gap-4 mt-6">
              {currentTabData.data.map((song) => (
                <RankingSongCard key={song.vocadbId} song={song} />
              ))}
            </div>

            {currentTabData.hasMore && (
              <LoadMoreButton onClick={loadMore} isLoading={currentTabData.isLoading} />
            )}

            {currentTabData.data.length === 0 && !currentTabData.isLoading && (
              <div className="text-center py-12">
                <p className="text-gray-400">표시할 곡이 없습니다.</p>
              </div>
            )}
          </section>
        </main>
      </div>

      <section className="relative w-full">
        <MusicPlayerSection />
      </section>
    </div>
  );
}
