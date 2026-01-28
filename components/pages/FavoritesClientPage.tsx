'use client';

import { useEffect, useState } from "react";
import { Heart, Sparkles, Grid3x3, List } from "lucide-react";
import { FavoritesGrid } from "@/components/favorites/FavoritesGrid";

interface FavoriteSong {
  id: string;
  songId: number;
  createdAt: Date;
  song: {
    vocadbId: number;
    defaultName: string;
    titleKorean: string | null;
    titleEnglish: string | null;
    titleJapanese: string | null;
    titleRomaji: string | null;
    artistString: string | null;
    youtubeId: string | null;
    youtubeUrl: string | null;
    thumbUrl: string | null;
    viewCount: string | null;
    publishDate: Date | null;
    songType: string | null;
    lengthSeconds: number | null;
  };
}

interface PageProps {
  favorites: FavoriteSong[];
}

// SSR-safe animated hearts for background
const HEART_POSITIONS = [
  { left: 10, top: 15, scale: 0.8, delay: 0 },
  { left: 25, top: 40, scale: 1.2, delay: 0.5 },
  { left: 40, top: 25, scale: 0.9, delay: 1 },
  { left: 55, top: 50, scale: 1.1, delay: 1.5 },
  { left: 70, top: 30, scale: 0.85, delay: 2 },
  { left: 85, top: 60, scale: 1, delay: 2.5 },
  { left: 92, top: 20, scale: 0.95, delay: 3 },
];

export default function FavoritesClientPage({ favorites }: PageProps) {
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    setMounted(true);
  }, []);

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
            {/* Ambient Background Elements - Love Gallery Theme */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
              {/* Gradient orbs */}
              <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-transparent rounded-full blur-3xl" />
              <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-gradient-to-br from-rose-500/8 via-pink-500/4 to-transparent rounded-full blur-3xl" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-br from-pink-500/6 to-transparent rounded-full blur-3xl" />

              {/* Animated floating hearts */}
              {mounted && HEART_POSITIONS.map((pos, i) => (
                <div
                  key={i}
                  className="absolute text-pink-500/10"
                  style={{
                    left: `${pos.left}%`,
                    top: `${pos.top}%`,
                    transform: `scale(${pos.scale})`,
                    animation: `float-heart ${12 + i}s ease-in-out infinite`,
                    animationDelay: `${pos.delay}s`,
                  }}
                >
                  <Heart className="w-6 h-6 fill-current" />
                </div>
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
                    {/* Heart Icon with Gradient */}
                    <div className="relative">
                      {/* Outer glow */}
                      <div className="absolute inset-0 rounded-[24px] bg-gradient-to-br from-pink-500 to-rose-500 opacity-20 blur-xl animate-pulse" />

                      {/* Icon container */}
                      <div className="relative p-3 sm:p-4 md:p-5 rounded-[20px] sm:rounded-[24px] bg-gradient-to-br from-pink-500/20 to-rose-500/20 border-2 border-pink-500/30 shadow-2xl shadow-pink-500/20 transition-all duration-500 hover:scale-110 hover:shadow-pink-500/40">
                        <Heart className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 text-pink-400 fill-pink-400" />
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <h1
                        className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-1 sm:mb-2"
                        style={{
                          fontFamily: "'Quicksand', sans-serif",
                          textShadow: '0 0 40px rgba(244, 114, 182, 0.3)',
                        }}
                      >
                        즐겨찾기
                      </h1>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-pink-400/70" aria-hidden="true" />
                        <p
                          className="text-white/50 text-xs sm:text-sm tracking-wide uppercase"
                          style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '0.1em' }}
                        >
                          {favorites.length}곡의 특별한 음악
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`
                        p-2 rounded-md transition-all duration-200
                        ${viewMode === 'grid'
                          ? 'bg-pink-500/20 text-pink-400'
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
                          ? 'bg-pink-500/20 text-pink-400'
                          : 'text-white/40 hover:text-white/60'
                        }
                      `}
                      aria-label="리스트 보기"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Subtitle */}
                <p
                  className="text-base sm:text-lg md:text-xl text-white/70 max-w-2xl leading-relaxed ml-0 sm:ml-12 md:ml-[88px] mb-6"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  마음에 담아둔 특별한 노래들
                </p>

                {/* Decorative accent line */}
                <div className="ml-0 sm:ml-12 md:ml-[88px] h-1 w-24 sm:w-32 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 shadow-lg shadow-pink-500/50" />
              </div>

              {/* Favorites Grid */}
              <div
                className={`transition-all duration-700 ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: '200ms' }}
              >
                <FavoritesGrid favorites={favorites} />
              </div>
            </div>
          </div>
        </section>
      </main>

      <style jsx global>{`
        @keyframes float-heart {
          0%, 100% {
            transform: translateY(0) scale(1) rotate(0deg);
            opacity: 0.1;
          }
          25% {
            transform: translateY(-15px) scale(1.1) rotate(5deg);
            opacity: 0.15;
          }
          50% {
            transform: translateY(-25px) scale(1.05) rotate(-5deg);
            opacity: 0.2;
          }
          75% {
            transform: translateY(-15px) scale(1.1) rotate(5deg);
            opacity: 0.15;
          }
        }
      `}</style>
    </div>
  );
}
