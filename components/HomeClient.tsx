"use client";

import { Input } from "@/components/ui/input";
import { Music, Search } from "lucide-react";
import React from "react";
import { NavigationSection } from "@/components/NavigationSection";
import { SearchSuggestions } from "@/components/SearchSuggestions";
import { RankingItem } from "@/lib/db";
import { toast } from "sonner";
import { UserMenu } from "@/components/auth/UserMenu";
import { Button } from "@/components/ui/button";
import { useSearchSuggestions } from "@/lib/hooks/useSearchSuggestions";

interface HomeClientProps {
  topCharts: RankingItem[];
  newReleases: RankingItem[];
  popularSongs: RankingItem[];
}

export function HomeClient({ topCharts, newReleases, popularSongs }: HomeClientProps) {
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
