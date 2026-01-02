"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home, Music, Radio, Search, User, Video } from "lucide-react";
import { MusicPlayerSection } from "@/components/MusicPlayerSection";
import { ChartsTabNavigation, type TabType } from "@/components/charts/ChartsTabNavigation";
import { RankingSongCard } from "@/components/charts/RankingSongCard";
import { LoadMoreButton } from "@/components/charts/LoadMoreButton";
import { SearchSuggestions } from "@/components/SearchSuggestions";
import type { RankingItem, SearchSong } from "@/lib/db";
import { toast } from "sonner";

const navigationItems = [
  { icon: Home, alt: "홈", href: "/" },
  { icon: Music, alt: "차트", href: "/charts" },
  { icon: Radio, alt: "라디오", href: null },
  { icon: Video, alt: "비디오", href: null },
];

const personalItems = [
  { icon: User, alt: "프로필", href: null },
  { icon: User, alt: "설정", href: null },
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
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSong[]>([]);
  const [suggestionsTotal, setSuggestionsTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchCacheRef = useRef<Map<string, { data: SearchSong[]; total: number; timestamp: number }>>(new Map());
  const CACHE_TTL = 5 * 60 * 1000;

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

  // Debounced search for suggestions with caching
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedIndex(-1);
      return;
    }

    const cached = searchCacheRef.current.get(searchQuery);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setSuggestions(cached.data);
      setSuggestionsTotal(cached.total);
      setShowSuggestions(true);
      setSelectedIndex(-1);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/songs?query=${encodeURIComponent(searchQuery)}&limit=7&sortBy=relevance`
        );
        const data = await response.json();

        if (data.success) {
          setSuggestions(data.data);
          setSuggestionsTotal(data.pagination.total);
          setShowSuggestions(true);
          setSelectedIndex(-1);

          searchCacheRef.current.set(searchQuery, {
            data: data.data,
            total: data.pagination.total,
            timestamp: Date.now(),
          });

          if (searchCacheRef.current.size > 50) {
            const entries = Array.from(searchCacheRef.current.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            entries.slice(0, 10).forEach(([key]) => searchCacheRef.current.delete(key));
          }
        }
      } catch (error) {
        console.error("검색 오류:", error);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
      return;
    }

    const maxIndex = suggestionsTotal > suggestions.length ? suggestions.length : suggestions.length - 1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < maxIndex ? prev + 1 : -1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > -1 ? prev - 1 : maxIndex));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex === -1) {
          if (searchQuery.length >= 2) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
            setShowSuggestions(false);
          }
        } else if (selectedIndex === suggestions.length) {
          router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
          setShowSuggestions(false);
        } else {
          const song = suggestions[selectedIndex];
          if (song) {
            router.push(`/songs/${song.vocadbId}`);
            setShowSuggestions(false);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  }, [showSuggestions, suggestions, suggestionsTotal, selectedIndex, searchQuery, router]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.length >= 2) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSuggestions(false);
    }
  };

  const handleCloseSuggestions = useCallback(() => {
    setShowSuggestions(false);
    setSelectedIndex(-1);
  }, []);

  const handleSelectIndex = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const handleNavClick = (href: string | null, alt: string) => {
    if (href) {
      router.push(href);
    } else {
      toast.info(`${alt} 기능은 준비 중입니다`);
    }
  };

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
                onClick={() => handleNavClick(item.href, item.alt)}
                title={item.alt}
              >
                <item.icon className={`w-[22px] h-[22px] ${item.href ? 'text-white/60 hover:text-white' : 'text-white/40'}`} />
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
                onClick={() => handleNavClick(item.href, item.alt)}
                title={item.alt}
              >
                <item.icon className="w-[22px] h-[22px] text-white/40" />
              </Button>
            ))}
          </div>
        </aside>

        <main className="flex-1 flex flex-col">
          <header className="h-[73px] bg-[#1d2123] flex items-center px-[27px]">
            <form onSubmit={handleSearch} className="flex items-center gap-[22px] w-full relative">
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
