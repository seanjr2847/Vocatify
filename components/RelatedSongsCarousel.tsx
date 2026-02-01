'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Play, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { memo, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import type { Song } from '@/lib/db';
import { formatNumber, getDisplayTitle } from '@/lib/utils/format-utils';

interface RelatedSongsCarouselProps {
  songs: Song[];
  title: string;
}

const RelatedSongsCarouselComponent = ({ songs }: RelatedSongsCarouselProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  if (songs.length === 0) {
    return (
      <div className="bg-[#1a1a1a] rounded-lg p-6 text-center">
        <p className="text-gray-400">관련 곡을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="relative group/carousel">
      {/* Navigation Buttons */}
      <button
        onClick={scrollPrev}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full
                   bg-black/80 border border-white/20 flex items-center justify-center
                   opacity-0 group-hover/carousel:opacity-100 transition-all duration-300
                   hover:bg-[#39c5bb] hover:border-[#39c5bb] hover:scale-110
                   -translate-x-1/2 backdrop-blur-sm"
        aria-label="이전"
      >
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>

      <button
        onClick={scrollNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full
                   bg-black/80 border border-white/20 flex items-center justify-center
                   opacity-0 group-hover/carousel:opacity-100 transition-all duration-300
                   hover:bg-[#39c5bb] hover:border-[#39c5bb] hover:scale-110
                   translate-x-1/2 backdrop-blur-sm"
        aria-label="다음"
      >
        <ChevronRight className="w-5 h-5 text-white" />
      </button>

      {/* Carousel Container */}
      <div className="overflow-hidden rounded-xl" ref={emblaRef}>
        <div className="flex gap-4">
          {songs.map((song) => (
            <div
              key={song.vocadbId}
              className="flex-shrink-0 w-[180px] md:w-[200px]"
            >
              <Link
                href={`/songs/${song.vocadbId}`}
                className="block bg-[#1a1a1a] rounded-xl overflow-hidden
                         hover:bg-[#252525] transition-all duration-300
                         group hover:scale-[1.02] hover:shadow-xl hover:shadow-[#39c5bb]/10"
              >
                {/* Thumbnail */}
                <div className="relative aspect-square overflow-hidden">
                  {song.thumbUrl ? (
                    <Image
                      src={song.thumbUrl}
                      alt={getDisplayTitle(song)}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="200px"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-gray-600">
                      No Image
                    </div>
                  )}

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="w-14 h-14 rounded-full bg-[#39c5bb] flex items-center justify-center shadow-lg shadow-[#39c5bb]/30 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                      <Play className="w-7 h-7 text-black fill-black ml-1" />
                    </div>
                  </div>
                </div>

                {/* Song Info */}
                <div className="p-4">
                  <h4 className="text-sm font-semibold text-white line-clamp-2 mb-1.5 min-h-[40px] group-hover:text-[#39c5bb] transition-colors">
                    {getDisplayTitle(song)}
                  </h4>
                  <p className="text-xs text-gray-400 mb-2 truncate">{song.artistString}</p>
                  {song.viewCount && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{formatNumber(song.viewCount)}</span>
                    </div>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
export const RelatedSongsCarousel = memo(RelatedSongsCarouselComponent);
