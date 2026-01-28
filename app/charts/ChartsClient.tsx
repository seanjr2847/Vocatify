"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Music, Search } from "lucide-react";
import { ChartsTabNavigation, type TabType } from "@/components/charts/ChartsTabNavigation";
import { RankingSongCard } from "@/components/charts/RankingSongCard";
import { RankingSongTableRow } from "@/components/charts/RankingSongTableRow";
import { LoadMoreButton } from "@/components/charts/LoadMoreButton";
import { SearchSuggestions } from "@/components/SearchSuggestions";
import { UserMenu } from "@/components/auth/UserMenu";
import { useSearchSuggestions } from "@/lib/hooks/useSearchSuggestions";
import type { RankingItem } from "@/lib/db";
import { toast } from "sonner";

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
  initialNewRanking: RankingItem[];
}

export function ChartsClient({
  initialTotalRanking,
  initialDailyRanking,
  initialWeeklyRanking,
  initialNewRanking,
}: ChartsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    searchQuery,
    setSearchQuery,
    suggestions,
    suggestionsTotal,
    isLoading,
    showSuggestions,
    setShowSuggestions,
    selectedIndex,
    inputRef,
    handleSearch,
    handleKeyDown,
    handleCloseSuggestions,
    handleSelectIndex,
  } = useSearchSuggestions();

  // Get initial tab from URL query param
  const initialTab = (searchParams.get('tab') as TabType) || 'total';
  const [activeTab, setActiveTab] = useState<TabType>(
    ['total', 'daily', 'weekly', 'new'].includes(initialTab) ? initialTab : 'total'
  );
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
    new: {
      data: initialNewRanking,
      offset: 100,
      hasMore: initialNewRanking.length === 100,
      isLoading: false,
    },
  });

  // Update activeTab when URL tab parameter changes
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabType;
    if (tabParam && ['total', 'daily', 'weekly', 'new'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);


  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    // Update URL query param
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    router.replace(url.pathname + url.search, { scroll: false });
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
    <div className="bg-black overflow-hidden w-full flex flex-col min-h-screen">
      <main className="flex-1 flex flex-col">
          <header className="h-[73px] bg-black/95 flex items-center px-4 sm:px-6 lg:px-[27px]">
            <div className="flex items-center gap-3 sm:gap-[22px] w-full">
              {/* Mobile Navigation Button */}
              <div className="flex lg:hidden items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full hover:bg-[#CDFF00]/10"
                  onClick={() => toast.info("모바일 메뉴 준비 중")}
                >
                  <Music className="h-5 w-5 text-[#CDFF00]" />
                </Button>
              </div>

              <form onSubmit={handleSearch} className="flex items-center gap-2 sm:gap-[22px] flex-1 relative">
              <Search className="w-4 h-4 text-white/25" />
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="곡, 아티스트 검색 (로마지 지원)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    if (searchQuery.length >= 2 && suggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  className="border-0 bg-transparent text-sm font-semibold text-white placeholder:text-white/25 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto [font-family:'Quicksand-SemiBold',Helvetica] w-full"
                  autoComplete="off"
                  aria-autocomplete="list"
                  aria-controls="search-suggestions"
                  aria-expanded={showSuggestions}
                />
                {showSuggestions && (
                  <SearchSuggestions
                    suggestions={suggestions}
                    query={searchQuery}
                    total={suggestionsTotal}
                    isLoading={isLoading}
                    selectedIndex={selectedIndex}
                    onClose={handleCloseSuggestions}
                    onSelectIndex={handleSelectIndex}
                  />
                )}
              </div>
              </form>

              {/* User Menu */}
              <div className="flex items-center">
                <UserMenu />
              </div>
            </div>
          </header>

          <section className="flex-1 relative w-full px-6 py-6 pb-[150px] custom-scrollbar overflow-y-auto">
            <div className="mb-6">
              <h1 className="text-4xl font-bold text-white mb-6">차트 (Charts)</h1>
              <ChartsTabNavigation activeTab={activeTab} onChange={handleTabChange} />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Mobile: Card Layout */}
                <div className="grid grid-cols-1 gap-4 mt-6 lg:hidden">
                  {currentTabData.data.map((song, index) => (
                    <motion.div
                      key={song.vocadbId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03, duration: 0.3 }}
                    >
                      <RankingSongCard song={song} />
                    </motion.div>
                  ))}
                </div>

                {/* Desktop: Table Layout */}
                <div className="hidden lg:block mt-6">
                  {currentTabData.data.map((song, index) => (
                    <motion.div
                      key={song.vocadbId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02, duration: 0.2 }}
                    >
                      <RankingSongTableRow song={song} />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

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
  );
}
