'use client';

import { RADIO_CHANNELS } from '@/lib/radio/channels';
import RadioChannelCard from '@/components/radio/RadioChannelCard';
import { Radio, Sparkles, Home, Music, Video, Search } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MusicPlayerSection } from "@/components/MusicPlayerSection";
import { SearchSuggestions } from "@/components/SearchSuggestions";
import { UserMenu } from "@/components/auth/UserMenu";
import { toast } from "sonner";
import type { Song } from "@/lib/db";

interface SearchSong extends Song {
  matchedField?: 'title' | 'titleEnglish' | 'titleJapanese' | 'titleKorean' | 'titleRomaji' | 'artist';
  relevanceScore?: number;
}

const navigationItems = [
  { icon: Home, alt: "홈", href: "/" },
  { icon: Music, alt: "차트", href: "/charts" },
  { icon: Radio, alt: "라디오", href: "/radio" },
  { icon: Video, alt: "비디오", href: null },
];

// SSR-safe deterministic particle positions based on index
const PARTICLE_POSITIONS = [
  { left: 10, top: 20 },
  { left: 22, top: 45 },
  { left: 34, top: 70 },
  { left: 46, top: 20 },
  { left: 58, top: 45 },
  { left: 70, top: 70 },
  { left: 82, top: 20 },
  { left: 94, top: 45 },
];

export default function RadioPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSong[]>([]);
  const [suggestionsTotal, setSuggestionsTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchCacheRef = useRef<Map<string, { data: SearchSong[]; total: number; timestamp: number }>>(new Map());
  const CACHE_TTL = 5 * 60 * 1000;

  useEffect(() => {
    setMounted(true);
  }, []);

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

  return (
    <div className="bg-black overflow-hidden w-full flex flex-col min-h-screen">
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-[92px] flex-shrink-0 flex-col items-center py-6 gap-6">
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
                <item.icon className={`w-[22px] h-[22px] ${item.href ? 'text-white/60 hover:text-white' : 'text-white/40'} ${item.alt === '라디오' ? '!text-[#CDFF00]' : ''}`} />
              </Button>
            ))}
          </nav>

          <div className="flex flex-col items-center gap-4 mt-auto">
            <UserMenu />
          </div>
        </aside>

        <main className="flex-1 flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-50 h-[73px] bg-black/95 backdrop-blur-md border-b border-white/5 flex items-center px-4 sm:px-6 lg:px-[27px]">
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

              {/* User Menu */}
              <div className="flex items-center">
                <UserMenu />
              </div>
            </div>
          </header>

          {/* Main Content - with safe-area padding for mobile */}
          <section
            className="flex-1 relative w-full py-6 overflow-y-auto"
            style={{
              paddingBottom: 'max(150px, calc(env(safe-area-inset-bottom, 0px) + 150px))',
            }}
          >
            <div className="relative">
              {/* Ambient Background Elements */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#CDFF00]/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#CDFF00]/3 rounded-full blur-3xl" />
                <div className="absolute top-1/3 right-1/3 w-72 h-72 bg-[#CDFF00]/4 rounded-full blur-3xl" />

                {/* SSR-Safe animated particles with deterministic positions */}
                {mounted && PARTICLE_POSITIONS.map((pos, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 bg-white/20 rounded-full radio-animate-float"
                    style={{
                      left: `${pos.left}%`,
                      top: `${pos.top}%`,
                      animationDuration: `${8 + i * 2}s`,
                      animationDelay: `${i * 0.8}s`,
                    }}
                  />
                ))}
              </div>

              <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
                {/* Enhanced Header with Animation */}
                <div className={`mb-12 md:mb-16 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                  {/* Icon and Title */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      {/* Pulsing glow */}
                      <div className="absolute inset-0 bg-[#CDFF00]/30 rounded-2xl blur-xl animate-pulse" aria-hidden="true" />

                      {/* Icon container with Live indicator */}
                      <div className="relative bg-gradient-to-br from-[#CDFF00]/20 to-[#CDFF00]/10 p-4 rounded-2xl border border-[#CDFF00]/30">
                        <Radio className="h-8 w-8 md:h-10 md:w-10 text-[#CDFF00]" />

                        {/* Live indicator dot */}
                        <div
                          className="absolute -top-1 -right-1 w-3 h-3 bg-[#CDFF00] rounded-full radio-animate-live-pulse"
                          aria-label="라이브"
                        >
                          <div className="absolute inset-0 bg-[#CDFF00] rounded-full animate-ping opacity-75" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h1
                        className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight"
                        style={{
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          textShadow: '0 0 40px rgba(205, 255, 0, 0.3)',
                        }}
                      >
                        라디오 채널
                      </h1>
                      <div className="flex items-center gap-2 mt-2">
                        <Sparkles className="w-4 h-4 text-[#CDFF00]/70" aria-hidden="true" />
                        <p
                          className="text-white/50 text-xs sm:text-sm tracking-wide uppercase"
                          style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '0.1em' }}
                        >
                          Infinite Discovery Mode
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Subtitle */}
                  <p
                    className="text-lg md:text-xl text-white/70 max-w-2xl leading-relaxed ml-0 md:ml-[88px]"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    당신을 위한 무한 재생 - 기분에 맞는 음악을 자동으로
                  </p>

                  {/* Decorative line */}
                  <div className="mt-6 ml-0 md:ml-[88px] h-[1px] w-48 md:w-64 bg-gradient-to-r from-[#CDFF00]/50 via-[#CDFF00]/20 to-transparent" aria-hidden="true" />
                </div>

                {/* Channel Grid with Staggered Animation - improved spacing */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 lg:gap-10 mb-12 md:mb-16">
                  {RADIO_CHANNELS.map((channel, idx) => (
                    <div
                      key={channel.slug}
                      className={`transition-all duration-700 ${
                        mounted
                          ? 'opacity-100 translate-y-0'
                          : 'opacity-0 translate-y-8'
                      }`}
                      style={{
                        transitionDelay: `${200 + idx * 150}ms`,
                      }}
                    >
                      <RadioChannelCard channel={channel} />
                    </div>
                  ))}
                </div>

                {/* Enhanced Info Section */}
                <div
                  className={`transition-all duration-1000 ${
                    mounted
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-8'
                  }`}
                  style={{ transitionDelay: '800ms' }}
                >
                  <div className="relative rounded-2xl md:rounded-3xl overflow-hidden">
                    {/* Glassmorphic background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a]/90 to-[#0a0a0a]/90 backdrop-blur-xl" />
                    <div className="absolute inset-0 border border-white/[0.08] rounded-2xl md:rounded-3xl" />

                    {/* Subtle gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#CDFF00]/5 via-transparent to-[#CDFF00]/3" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Music Player */}
      <section className="relative w-full">
        <MusicPlayerSection />
      </section>
    </div>
  );
}
