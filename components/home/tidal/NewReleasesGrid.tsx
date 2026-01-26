'use client';

import Image from 'next/image';
import Link from 'next/link';
import { RankingItem } from '@/lib/db';

interface NewReleasesGridProps {
  songs: RankingItem[];
  onPlay?: (song: RankingItem) => void;
}

export default function NewReleasesGrid({ songs, onPlay }: NewReleasesGridProps) {
  const displaySongs = songs.slice(0, 8);

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
    <section className="py-16 px-8">
      {/* Section Header */}
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-white text-3xl font-bold">NEW RELEASES</h2>
        <Link
          href="/charts?tab=new"
          className="text-white/60 hover:text-white text-sm uppercase tracking-wider transition-colors"
        >
          View all
        </Link>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6">
        {displaySongs.map((song) => (
          <div
            key={song.vocadbId}
            className="group cursor-pointer"
            onClick={() => onPlay && onPlay(song)}
          >
            {/* Album Cover */}
            <div className="relative aspect-square overflow-hidden bg-white/5 rounded-sm mb-4">
              <Image
                src={song.thumbUrl || '/default-album.png'}
                fill
                alt=""
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />

              {/* NEW Badge */}
              <div className="absolute top-3 left-3 bg-[#CDFF00] text-black text-xs font-bold px-2 py-1 rounded">
                NEW
              </div>

              {/* Play Button Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Song Info */}
            <div>
              <p className="text-white font-medium text-sm truncate mb-1">
                {song.titleKorean || song.titleEnglish || song.titleJapanese || song.defaultName}
              </p>
              <p className="text-white/60 text-xs truncate mb-1">
                {song.artistString}
              </p>
              <p className="text-white/40 text-xs">
                {formatViews(song.viewCount)} views
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
