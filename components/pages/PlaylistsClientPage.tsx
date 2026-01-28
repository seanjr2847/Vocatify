'use client';

import { useEffect, useState } from "react";
import { PlaylistCard } from "@/components/user/PlaylistCard";
import { Plus, ListMusic, Sparkles, Grid3x3, List } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/playlists/EmptyState";
import { Button } from "@/components/ui/button";

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  songCount: number;
  updatedAt: Date;
}

interface PageProps {
  initialPlaylists: Playlist[];
  initialTotal: number;
}

// SSR-safe animated particles
const PARTICLE_POSITIONS = [
  { left: 15, top: 25 },
  { left: 30, top: 60 },
  { left: 45, top: 35 },
  { left: 60, top: 70 },
  { left: 75, top: 40 },
  { left: 85, top: 65 },
];

export default function PlaylistsClientPage({ initialPlaylists, initialTotal }: PageProps) {
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'name'>('updated');

  useEffect(() => {
    setMounted(true);
  }, []);

  const playlists = initialPlaylists;
  const totalCount = initialTotal;

  return (
    <div className="bg-black overflow-hidden w-full flex flex-col min-h-screen">
      <main className="flex-1 flex flex-col">
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
              <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#CDFF00]/5 rounded-full blur-3xl" />
              <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-[#CDFF00]/3 rounded-full blur-3xl" />
              <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl" />

              {/* Animated particles */}
              {mounted && PARTICLE_POSITIONS.map((pos, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-white/10 rounded-full"
                  style={{
                    left: `${pos.left}%`,
                    top: `${pos.top}%`,
                    animation: `float ${10 + i * 1.5}s ease-in-out infinite`,
                    animationDelay: `${i * 0.7}s`,
                  }}
                />
              ))}
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
              {/* Page Header with Animation */}
              <div
                className={`mb-12 transition-all duration-1000 ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start justify-between gap-6 mb-6">
                  {/* Title Section */}
                  <div className="flex items-center gap-4 sm:gap-6">
                    {/* Icon */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-purple-500/30 rounded-2xl blur-xl animate-pulse" aria-hidden="true" />
                      <div className="relative bg-gradient-to-br from-purple-500/20 to-[#CDFF00]/10 p-3 sm:p-4 rounded-2xl border border-purple-500/30">
                        <ListMusic className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 text-purple-400" />
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <h1
                        className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-1 sm:mb-2"
                        style={{
                          fontFamily: "'Quicksand', sans-serif",
                          textShadow: '0 0 40px rgba(168, 85, 247, 0.3)',
                        }}
                      >
                        플레이리스트
                      </h1>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400/70" aria-hidden="true" />
                        <p
                          className="text-white/50 text-xs sm:text-sm tracking-wide uppercase"
                          style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '0.1em' }}
                        >
                          {totalCount}개의 컬렉션
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Create Button */}
                  <Link href="/playlists/create">
                    <Button
                      className={`
                        flex items-center gap-2
                        rounded-full px-5 sm:px-6 py-2.5 sm:py-3 h-auto
                        bg-gradient-to-r from-purple-500 to-[#CDFF00]
                        text-black font-bold text-sm sm:text-base
                        transition-all duration-300
                        hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30
                        active:scale-95
                      `}
                    >
                      <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="hidden sm:inline">새 플레이리스트</span>
                      <span className="sm:hidden">새로 만들기</span>
                    </Button>
                  </Link>
                </div>

                {/* Subtitle */}
                <p
                  className="text-base sm:text-lg md:text-xl text-white/70 max-w-2xl leading-relaxed ml-0 sm:ml-12 md:ml-[88px] mb-6"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  나만의 음악 세계를 만들어보세요
                </p>

                {/* View Controls */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 ml-0 sm:ml-12 md:ml-[88px]">
                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`
                        p-2 rounded-md transition-all duration-200
                        ${viewMode === 'grid'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'text-white/40 hover:text-white/60'
                        }
                      `}
                      aria-label="그리드 보기"
                    >
                      <Grid3x3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`
                        p-2 rounded-md transition-all duration-200
                        ${viewMode === 'list'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'text-white/40 hover:text-white/60'
                        }
                      `}
                      aria-label="리스트 보기"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Sort Controls */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'updated' | 'created' | 'name')}
                    className="px-3 sm:px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 text-xs sm:text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                  >
                    <option value="updated">최근 업데이트</option>
                    <option value="created">생성일</option>
                    <option value="name">이름순</option>
                  </select>
                </div>

                {/* Decorative line */}
                <div
                  className="mt-6 ml-0 sm:ml-12 md:ml-[88px] h-[1px] w-32 sm:w-48 md:w-64 bg-gradient-to-r from-purple-500/50 via-[#CDFF00]/30 to-transparent"
                  aria-hidden="true"
                />
              </div>

              {/* Playlists Grid */}
              {playlists.length === 0 ? (
                <div
                  className={`transition-all duration-700 ${
                    mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                  style={{ transitionDelay: '200ms' }}
                >
                  <EmptyState
                    icon={ListMusic}
                    title="아직 플레이리스트가 없습니다"
                    description="나만의 플레이리스트를 만들어보세요"
                    actionLabel="새 플레이리스트 만들기"
                    actionHref="/playlists/create"
                  />
                </div>
              ) : (
                <div
                  className={`
                    grid gap-4 sm:gap-6 md:gap-8 lg:gap-10 mb-12
                    ${viewMode === 'grid'
                      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                      : 'grid-cols-1'
                    }
                  `}
                >
                  {playlists.map((playlist, idx) => (
                    <div
                      key={playlist.id}
                      className={`transition-all duration-700 ${
                        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                      }`}
                      style={{
                        transitionDelay: `${200 + idx * 100}ms`,
                      }}
                    >
                      <PlaylistCard
                        id={playlist.id}
                        name={playlist.name}
                        description={playlist.description}
                        isPublic={playlist.isPublic}
                        songCount={playlist.songCount}
                        updatedAt={playlist.updatedAt}
                      />
                    </div>
                  ))}
                </div>
              )}
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
