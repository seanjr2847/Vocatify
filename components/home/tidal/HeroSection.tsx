'use client';

import Image from 'next/image';
import { RankingItem } from '@/lib/db';

interface HeroSectionProps {
  song: RankingItem;
  onPlay?: (song: RankingItem) => void;
}

export default function HeroSection({ song, onPlay }: HeroSectionProps) {
  const handlePlay = () => {
    if (onPlay) {
      onPlay(song);
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Background Image with Blur */}
      <div className="absolute inset-0">
        <Image
          src={song.thumbUrl || '/default-album.png'}
          fill
          alt=""
          className="object-cover blur-2xl opacity-30"
          priority
        />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-8">
        {/* Song Title */}
        <h1 className="text-white text-7xl md:text-8xl lg:text-9xl font-bold text-center mb-4 max-w-4xl leading-none">
          {song.titleKorean || song.titleEnglish || song.titleJapanese || song.defaultName}
        </h1>

        {/* Artist */}
        <p className="text-white/80 text-2xl mb-12">
          {song.artistString}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handlePlay}
            className="tidal-btn-primary flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
            재생하기
          </button>
          <button className="tidal-btn-secondary">
            <span className="text-2xl leading-none">+</span> 추가
          </button>
        </div>

        {/* View Count */}
        <div className="mt-8 text-white/50 text-sm">
          {Number(song.viewCount).toLocaleString()} 조회수
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg
          className="w-6 h-6 text-white/40"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </div>
  );
}
