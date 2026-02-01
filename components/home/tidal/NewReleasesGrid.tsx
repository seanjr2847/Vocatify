'use client';

import Image from 'next/image';
import Link from 'next/link';
import { RankingItem } from '@/lib/db';
import { useMusicPlayer } from '@/lib/MusicPlayerContext';
import { Play, Eye } from 'lucide-react';
import { getYouTubeThumbnail } from '@/lib/utils/format-utils';

interface NewReleasesGridProps {
  songs: RankingItem[];
}

export default function NewReleasesGrid({ songs }: NewReleasesGridProps) {
  const displaySongs = songs.slice(0, 12); // Show more albums
  const { playSong } = useMusicPlayer();

  const formatViews = (views: bigint | number | null) => {
    if (!views) return '0';
    const num = Number(views);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  return (
    <section className="py-12 px-6 lg:px-8">
      {/* Section Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-white text-2xl lg:text-3xl font-bold tracking-tight mb-1">
            New Releases
          </h2>
          <p className="text-white/50 text-sm">최신 보컬로이드 음악</p>
        </div>
        <Link
          href="/charts?tab=new"
          className="text-white/60 hover:text-[#39c5bb] text-sm font-medium transition-colors group flex items-center gap-1"
        >
          전체 보기
          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Compact Grid - More albums, smaller cards */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 lg:gap-5">
        {displaySongs.map((song, index) => (
          <div
            key={song.vocadbId}
            className="group cursor-pointer"
            onClick={() => song.youtubeId && playSong(song)}
            style={{
              animation: 'fadeInUp 0.5s ease-out',
              animationDelay: `${index * 0.05}s`,
              animationFillMode: 'both',
            }}
          >
            {/* Compact Album Cover */}
            <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-white/5 to-white/[0.02] rounded-lg mb-3 shadow-lg shadow-black/20 group-hover:shadow-xl group-hover:shadow-[#39c5bb]/10 transition-all duration-300">
              <Image
                src={song.youtubeId ? getYouTubeThumbnail(song.youtubeId, 'maxres') : (song.thumbUrl || '/default-album.png')}
                fill
                alt=""
                className="object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
              />

              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Compact NEW Badge */}
              <div className="absolute top-2 left-2 bg-[#39c5bb] text-black text-[10px] font-bold px-1.5 py-0.5 rounded shadow-md">
                NEW
              </div>

              {/* Play Button Overlay - Smaller and more refined */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                <button
                  className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm text-black flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-all duration-300 hover:bg-[#39c5bb]"
                  aria-label="Play song"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
              </div>

              {/* View count badge - Bottom right */}
              <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white/90 text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Eye className="w-2.5 h-2.5" />
                {formatViews(song.viewCount)}
              </div>
            </div>

            {/* Compact Song Info */}
            <div className="space-y-0.5">
              <p className="text-white/90 font-medium text-xs lg:text-sm truncate group-hover:text-[#39c5bb] transition-colors">
                {song.titleKorean || song.titleEnglish || song.titleJapanese || song.defaultName}
              </p>
              <p className="text-white/50 text-[10px] lg:text-xs truncate">
                {song.artistString}
              </p>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}
