"use client";

import { Input } from "@/components/ui/input";
import { Music, Search } from "lucide-react";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { NavigationSection } from "@/components/NavigationSection";
import { SearchSuggestions } from "@/components/SearchSuggestions";
import { RankingItem, Song } from "@/lib/db";
import { toast } from "sonner";
import { UserMenu } from "@/components/auth/UserMenu";
import { Button } from "@/components/ui/button";

interface SearchSong extends Song {
  matchedField?: 'title' | 'titleEnglish' | 'titleJapanese' | 'titleKorean' | 'titleRomaji' | 'artist';
  relevanceScore?: number;
}

// Navigation items moved to Sidebar component

interface HomeClientProps {
  topCharts: RankingItem[];
  newReleases: RankingItem[];
  popularSongs: RankingItem[];
}

export function HomeClient({ topCharts, newReleases, popularSongs }: HomeClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSong[]>([]);
  const [suggestionsTotal, setSuggestionsTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchCacheRef = useRef<Map<string, { data: SearchSong[]; total: number; timestamp: number }>>(new Map());

  // Cache expiration time (5 minutes)
  const CACHE_TTL = 5 * 60 * 1000;

  // Debounced search for suggestions with caching
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedIndex(-1);
      return;
    }

    // Check cache first
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

          // Store in cache
          searchCacheRef.current.set(searchQuery, {
            data: data.data,
            total: data.pagination.total,
            timestamp: Date.now(),
          });

          // Clean old cache entries (keep max 50)
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
    }, 200); // 200ms debounce (reduced from 300ms)

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
          // Submit search form
          if (searchQuery.length >= 2) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
            setShowSuggestions(false);
          }
        } else if (selectedIndex === suggestions.length) {
          // "View all results" option
          router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
          setShowSuggestions(false);
        } else {
          // Select specific song
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

  return (
    <div className="bg-black overflow-hidden w-full flex flex-col min-h-screen">
      <main className="flex-1 flex flex-col">
          {/* Enhanced Responsive Header */}
          <header className="sticky top-0 z-50 h-[73px] bg-black/95 backdrop-blur-md border-b border-white/5 flex items-center px-4 sm:px-6 lg:px-[27px]">
            <div className="flex items-center gap-3 sm:gap-[22px] w-full">
              {/* Mobile Navigation Button - visible only on mobile */}
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

              {/* Search Form */}
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

              {/* User Menu - always visible on all screen sizes */}
              <div className="flex items-center">
                <UserMenu />
              </div>
            </div>
          </header>

          <section className="flex-1 relative w-full pb-[150px]">
            <NavigationSection
              topCharts={topCharts}
              newReleases={newReleases}
              popularSongs={popularSongs}
            />
          </section>
        </main>
    </div>
  );
}
