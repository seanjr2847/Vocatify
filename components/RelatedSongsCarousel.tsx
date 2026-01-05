'use client';

import Link from 'next/link';
import { Play, Eye } from 'lucide-react';
import { useState } from 'react';
import type { Song } from '@/lib/db';
import { formatNumber, getDisplayTitle } from '@/lib/utils/format-utils';

interface RelatedSongsCarouselProps {
  songs: Song[];
  title: string;
}

export function RelatedSongsCarousel({ songs, title }: RelatedSongsCarouselProps) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  if (songs.length === 0) {
    return (
      <div className="bg-[#1a1a1a] rounded-lg p-6 text-center">
        <p className="text-gray-400">관련 곡을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className="flex gap-4 pb-4">
        {songs.map((song) => (
          <Link
            key={song.vocadbId}
            href={`/songs/${song.vocadbId}`}
            className="flex-shrink-0 w-[200px] bg-[#1a1a1a] rounded-lg overflow-hidden hover:bg-[#2a2a2a] transition-all group"
            onMouseEnter={() => setHoveredId(song.vocadbId)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Thumbnail */}
            <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-700 to-gray-900">
              {song.thumbUrl ? (
                <img
                  src={song.thumbUrl}
                  alt={getDisplayTitle(song)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                  No Image
                </div>
              )}

              {/* Play button overlay on hover */}
              <div
                className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                  hoveredId === song.vocadbId ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-[#39c5bb] flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                  <Play className="w-6 h-6 text-black fill-black ml-0.5" />
                </div>
              </div>
            </div>

            {/* Song Info */}
            <div className="p-3">
              <h4 className="text-sm font-semibold text-white line-clamp-2 mb-1 min-h-[40px]">
                {getDisplayTitle(song)}
              </h4>
              <p className="text-xs text-gray-400 mb-2 truncate">{song.artistString}</p>
              {song.viewCount && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Eye className="w-3 h-3" />
                  <span>{formatNumber(song.viewCount)}</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
