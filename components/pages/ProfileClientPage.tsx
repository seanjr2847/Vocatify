'use client';

import { useEffect, useState } from "react";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { Heart, ListMusic, Music, Search, Sparkles, TrendingUp, Calendar, Award } from "lucide-react";
import Link from "next/link";
import { UserMenu } from "@/components/auth/UserMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchSuggestions } from "@/components/SearchSuggestions";
import { useSearchSuggestions } from "@/lib/hooks/useSearchSuggestions";
import { toast } from "sonner";

interface PageProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  favorites: any[];
  totalFavorites: number;
}

// SSR-safe animated particles
const PARTICLE_POSITIONS = [
  { left: 12, top: 20, size: 2 },
  { left: 28, top: 55, size: 3 },
  { left: 45, top: 30, size: 2.5 },
  { left: 62, top: 65, size: 2 },
  { left: 78, top: 35, size: 3 },
  { left: 88, top: 70, size: 2.5 },
];

export default function ProfileClientPage({ user, favorites, totalFavorites }: PageProps) {
  const [mounted, setMounted] = useState(false);

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

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="bg-black overflow-hidden w-full flex flex-col min-h-screen">
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

        {/* Main Content */}
        <section
          className="flex-1 relative w-full py-6 overflow-y-auto"
          style={{
            paddingBottom: 'max(150px, calc(env(safe-area-inset-bottom, 0px) + 150px))',
          }}
        >
          <div className="relative">
            {/* Ambient Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
              <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-[#CDFF00]/8 rounded-full blur-3xl" />
              <div className="absolute bottom-1/4 right-1/3 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-500/6 rounded-full blur-3xl" />

              {/* Animated particles */}
              {mounted && PARTICLE_POSITIONS.map((pos, i) => (
                <div
                  key={i}
                  className="absolute rounded-full bg-white/10"
                  style={{
                    left: `${pos.left}%`,
                    top: `${pos.top}%`,
                    width: `${pos.size}px`,
                    height: `${pos.size}px`,
                    animation: `float ${10 + i * 1.5}s ease-in-out infinite`,
                    animationDelay: `${i * 0.6}s`,
                  }}
                />
              ))}
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
              {/* Profile Hero Section */}
              <div
                className={`mb-16 transition-all duration-1000 ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
                }`}
              >
                {/* Profile Header Card */}
                <div className="relative rounded-3xl overflow-hidden">
                  {/* Glassmorphic background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a]/90 to-[#0a0a0a]/90 backdrop-blur-xl" />
                  <div className="absolute inset-0 border border-white/[0.08] rounded-3xl" />

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#CDFF00]/10 via-transparent to-blue-500/5" aria-hidden="true" />

                  {/* Content */}
                  <div className="relative p-8 sm:p-12">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8">
                      {/* Avatar with glow */}
                      <div className="relative">
                        <div className="absolute inset-0 bg-[#CDFF00]/30 rounded-full blur-2xl animate-pulse" />
                        <div className="relative ring-4 ring-[#CDFF00]/20 rounded-full">
                          <UserAvatar
                            name={user.name}
                            image={user.image}
                            className="h-24 w-24 sm:h-32 sm:w-32"
                          />
                        </div>
                      </div>

                      {/* User Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h1
                            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white"
                            style={{
                              fontFamily: "'Quicksand', sans-serif",
                              textShadow: '0 0 30px rgba(205, 255, 0, 0.3)',
                            }}
                          >
                            {user.name}
                          </h1>
                          <div className="px-3 py-1 rounded-full bg-[#CDFF00]/20 border border-[#CDFF00]/30">
                            <Award className="w-4 h-4 text-[#CDFF00]" />
                          </div>
                        </div>
                        <p className="text-white/60 text-sm sm:text-base mb-6">{user.email}</p>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                          {/* Favorites Stat */}
                          <Link
                            href="/favorites"
                            className="group flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-pink-500/50 transition-all duration-300 hover:bg-white/10"
                          >
                            <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500/20 to-rose-500/20 group-hover:scale-110 transition-transform">
                              <Heart className="w-5 h-5 text-pink-400" />
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-white">{totalFavorites}</div>
                              <div className="text-xs text-white/50">즐겨찾기</div>
                            </div>
                          </Link>

                          {/* Playlists Stat */}
                          <Link
                            href="/playlists"
                            className="group flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all duration-300 hover:bg-white/10"
                          >
                            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-[#CDFF00]/10 group-hover:scale-110 transition-transform">
                              <ListMusic className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-white">0</div>
                              <div className="text-xs text-white/50">플레이리스트</div>
                            </div>
                          </Link>

                          {/* Activity Stat (placeholder) */}
                          <div className="group flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-[#CDFF00]/20 to-blue-500/10 group-hover:scale-110 transition-transform">
                              <TrendingUp className="w-5 h-5 text-[#CDFF00]" />
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-white">-</div>
                              <div className="text-xs text-white/50">활동 점수</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Favorites Section */}
              <div
                className={`transition-all duration-700 ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: '300ms' }}
              >
                {/* Section Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20">
                      <Heart className="w-6 h-6 text-pink-400 fill-pink-400" />
                    </div>
                    <div>
                      <h2
                        className="text-2xl sm:text-3xl font-bold text-white"
                        style={{ fontFamily: "'Quicksand', sans-serif" }}
                      >
                        최근 즐겨찾기
                      </h2>
                      <p className="text-white/50 text-sm">최근에 추가한 음악들</p>
                    </div>
                  </div>
                  {totalFavorites > 20 && (
                    <Link href="/favorites">
                      <Button className="text-sm text-[#CDFF00] hover:text-[#CDFF00]/80 transition-colors">
                        모두 보기 →
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Favorites Grid */}
                {favorites.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-20 backdrop-blur-sm">
                    <Heart className="mb-4 h-16 w-16 text-white/20" />
                    <p className="mb-2 text-lg font-semibold text-white/60">
                      즐겨찾기한 곡이 없습니다
                    </p>
                    <p className="text-sm text-white/40 mb-6">
                      마음에 드는 곡에 하트를 눌러보세요
                    </p>
                    <Link href="/">
                      <Button className="rounded-full bg-gradient-to-r from-pink-500 to-[#CDFF00] text-black font-bold px-6 py-2 hover:scale-105 transition-transform">
                        곡 둘러보기
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {favorites.map((favorite, idx) => {
                      const song = favorite.song;
                      const displayTitle =
                        song.titleKorean ||
                        song.titleEnglish ||
                        song.titleJapanese ||
                        song.defaultName;

                      return (
                        <Link
                          key={favorite.id}
                          href={`/songs/${song.vocadbId}`}
                          className={`
                            group relative overflow-hidden rounded-xl
                            border border-white/10 bg-white/5
                            transition-all duration-500
                            hover:border-pink-500/50 hover:bg-white/10
                            hover:shadow-xl hover:shadow-pink-500/10
                            hover:-translate-y-1
                            ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                          `}
                          style={{
                            transitionDelay: `${400 + idx * 80}ms`,
                          }}
                        >
                          {/* Thumbnail */}
                          {song.thumbUrl ? (
                            <div className="relative aspect-video w-full overflow-hidden">
                              <img
                                src={song.thumbUrl}
                                alt={displayTitle}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                              {/* Overlay gradient */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          ) : (
                            <div className="aspect-video w-full bg-gradient-to-br from-pink-500/20 to-rose-500/10 flex items-center justify-center">
                              <ListMusic className="h-12 w-12 text-pink-500/40" />
                            </div>
                          )}

                          {/* Info */}
                          <div className="p-4">
                            <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-white group-hover:text-pink-400 transition-colors">
                              {displayTitle}
                            </h3>
                            {song.artistString && (
                              <p className="text-xs text-white/50 line-clamp-1 mb-2">
                                {song.artistString}
                              </p>
                            )}
                            {song.viewCount && (
                              <div className="flex items-center gap-2 text-xs text-white/40">
                                <TrendingUp className="w-3 h-3" />
                                <span>{Number(song.viewCount).toLocaleString()}회</span>
                              </div>
                            )}
                          </div>

                          {/* Favorite Badge */}
                          <div className="absolute right-2 top-2 rounded-full bg-black/50 p-2 backdrop-blur-sm">
                            <Heart className="h-4 w-4 fill-pink-500 text-pink-500" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
}
