'use client';

import { RADIO_CHANNELS } from '@/lib/radio/channels';
import RadioChannelCard from '@/components/radio/RadioChannelCard';
import { Radio, Sparkles, Waves, Zap, Home, Music, Video, Search } from "lucide-react";
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
    <div className="bg-[#1d2123] overflow-hidden w-full flex flex-col min-h-screen">
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
                <item.icon className={`w-[22px] h-[22px] ${item.href ? 'text-white/60 hover:text-white' : 'text-white/40'} ${item.alt === '라디오' ? '!text-[#39c5bb]' : ''}`} />
              </Button>
            ))}
          </nav>

          <div className="flex flex-col items-center gap-4 mt-auto">
            <UserMenu />
          </div>
        </aside>

        <main className="flex-1 flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-50 h-[73px] bg-[#1d2123]/95 backdrop-blur-md border-b border-white/5 flex items-center px-4 sm:px-6 lg:px-[27px]">
            <div className="flex items-center gap-3 sm:gap-[22px] w-full">
              {/* Mobile Navigation Button */}
              <div className="flex lg:hidden items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full hover:bg-[#39c5bb]/10"
                  onClick={() => toast.info("모바일 메뉴 준비 중")}
                >
                  <Music className="h-5 w-5 text-[#39c5bb]" />
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

          {/* Main Content */}
          <section className="flex-1 relative w-full py-6 pb-[150px] overflow-y-auto">
            <div className="relative">
              {/* Ambient Background Elements */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#39c5bb]/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#4A90E2]/5 rounded-full blur-3xl" />
                <div className="absolute top-1/3 right-1/3 w-72 h-72 bg-[#F5A623]/5 rounded-full blur-3xl" />

                {/* Animated particles */}
                {mounted && [...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 bg-white/20 rounded-full"
                    style={{
                      left: `${10 + i * 12}%`,
                      top: `${20 + (i % 3) * 25}%`,
                      animation: `float ${8 + i * 2}s ease-in-out infinite`,
                      animationDelay: `${i * 0.8}s`,
                    }}
                  />
                ))}
              </div>

              <div className="relative max-w-7xl mx-auto px-6">
                {/* Enhanced Header with Animation */}
                <div className={`mb-16 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                  {/* Icon and Title */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      {/* Pulsing glow */}
                      <div className="absolute inset-0 bg-[#39c5bb]/30 rounded-2xl blur-xl animate-pulse" />

                      {/* Icon container */}
                      <div className="relative bg-gradient-to-br from-[#39c5bb]/20 to-[#39c5bb]/10 p-4 rounded-2xl border border-[#39c5bb]/30">
                        <Radio className="h-10 w-10 text-[#39c5bb]" />
                      </div>
                    </div>

                    <div>
                      <h1
                        className="text-5xl md:text-6xl font-bold text-white tracking-tight"
                        style={{
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          textShadow: '0 0 40px rgba(57, 197, 187, 0.3)',
                        }}
                      >
                        라디오 채널
                      </h1>
                      <div className="flex items-center gap-2 mt-2">
                        <Sparkles className="w-4 h-4 text-[#39c5bb]/70" />
                        <p
                          className="text-white/50 text-sm tracking-wide uppercase"
                          style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '0.1em' }}
                        >
                          Infinite Discovery Mode
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Subtitle */}
                  <p
                    className="text-xl text-white/70 max-w-2xl leading-relaxed ml-[88px]"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    당신을 위한 무한 재생 - 기분에 맞는 음악을 자동으로
                  </p>

                  {/* Decorative line */}
                  <div className="mt-6 ml-[88px] h-[1px] w-64 bg-gradient-to-r from-[#39c5bb]/50 via-[#39c5bb]/20 to-transparent" />
                </div>

                {/* Channel Grid with Staggered Animation */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
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
                  <div className="relative rounded-3xl overflow-hidden">
                    {/* Glassmorphic background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a]/90 to-[#0a0a0a]/90 backdrop-blur-xl" />
                    <div className="absolute inset-0 border border-white/[0.08] rounded-3xl" />

                    {/* Subtle gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#39c5bb]/5 via-transparent to-[#4A90E2]/5" />

                    {/* Content */}
                    <div className="relative p-10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-[#39c5bb]/10">
                          <Waves className="w-5 h-5 text-[#39c5bb]" />
                        </div>
                        <h2
                          className="text-2xl font-bold text-white"
                          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                          라디오 채널이란?
                        </h2>
                      </div>

                      <div className="grid md:grid-cols-3 gap-6">
                        {/* Feature 1 */}
                        <div className="group">
                          <div className="flex items-start gap-3">
                            <div className="mt-1 p-2 rounded-lg bg-[#39c5bb]/10 group-hover:bg-[#39c5bb]/20 transition-colors">
                              <Radio className="w-4 h-4 text-[#39c5bb]" />
                            </div>
                            <div>
                              <h3 className="text-white font-semibold mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                무한 재생
                              </h3>
                              <p className="text-white/60 text-sm leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                                끝없이 이어지는 큐레이션된 음악 스트림
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Feature 2 */}
                        <div className="group">
                          <div className="flex items-start gap-3">
                            <div className="mt-1 p-2 rounded-lg bg-[#4A90E2]/10 group-hover:bg-[#4A90E2]/20 transition-colors">
                              <Sparkles className="w-4 h-4 text-[#4A90E2]" />
                            </div>
                            <div>
                              <h3 className="text-white font-semibold mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                스마트 추천
                              </h3>
                              <p className="text-white/60 text-sm leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                                태그 기반 알고리즘으로 비슷한 곡 자동 선곡
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Feature 3 */}
                        <div className="group">
                          <div className="flex items-start gap-3">
                            <div className="mt-1 p-2 rounded-lg bg-[#F5A623]/10 group-hover:bg-[#F5A623]/20 transition-colors">
                              <Zap className="w-4 h-4 text-[#F5A623]" />
                            </div>
                            <div>
                              <h3 className="text-white font-semibold mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                반복 방지
                              </h3>
                              <p className="text-white/60 text-sm leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                                이미 들은 곡은 제외하고 새로운 곡 발견
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
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

      {/* Custom CSS animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) scale(1);
            opacity: 0.2;
          }
          50% {
            transform: translateY(-20px) scale(1.2);
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  );
}
