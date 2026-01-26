'use client';

import { useMusicPlayer } from '@/lib/MusicPlayerContext';
import { Play, Radio, Waves, TrendingUp, Shuffle } from 'lucide-react';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { RadioChannel } from '@/lib/radio/channels';

interface RadioChannelCardProps {
  channel: RadioChannel;
}

// Deterministic waveform heights to avoid SSR hydration mismatch
const WAVEFORM_HEIGHTS = [28, 45, 35, 52, 40];

export default function RadioChannelCard({ channel }: RadioChannelCardProps) {
  const { startRadio } = useMusicPlayer();
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleStart = async () => {
    setIsLoading(true);
    try {
      await startRadio(channel.slug);
      toast.success(`${channel.nameKo} 재생 시작`);
    } catch (error) {
      console.error('Failed to start radio:', error);
      toast.error('라디오 시작 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isLoading) {
        handleStart();
      }
    }
  }, [isLoading]);

  // Get algorithm display info
  const algorithmInfo = channel.algorithm === 'popular'
    ? { icon: TrendingUp, label: '인기순' }
    : { icon: Shuffle, label: '랜덤' };

  return (
    <article
      role="article"
      aria-label={`${channel.nameKo} 라디오 채널`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="relative group overflow-hidden rounded-2xl md:rounded-3xl transition-all duration-700 ease-out hover:scale-[1.02] radio-card-transition radio-focus-visible focus:outline-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
      }}
    >
      {/* Glassmorphic container with depth */}
      <div className="relative bg-gradient-to-br from-[#1a1a1a]/90 to-[#0a0a0a]/90 backdrop-blur-xl border border-white/5 rounded-2xl md:rounded-3xl p-6 md:p-8 transition-all duration-700">

        {/* Animated gradient background */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-2xl md:rounded-3xl"
          style={{
            background: `radial-gradient(circle at 30% 20%, #CDFF0015, transparent 50%),
                         radial-gradient(circle at 70% 80%, #CDFF0010, transparent 50%)`,
          }}
          aria-hidden="true"
        />

        {/* SSR-Safe animated waveform particles */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl md:rounded-3xl pointer-events-none" aria-hidden="true">
          {WAVEFORM_HEIGHTS.map((height, i) => (
            <div
              key={i}
              className={`absolute w-1 rounded-full opacity-0 group-hover:opacity-30 transition-all duration-1000 ${isHovered ? 'radio-animate-wave' : ''}`}
              style={{
                height: `${height}px`,
                left: `${20 + i * 15}%`,
                bottom: '20%',
                background: '#CDFF00',
                animationDelay: `${i * 0.1}s`,
                filter: `blur(${1 + i * 0.5}px)`,
              }}
            />
          ))}
        </div>

        {/* Glowing orb with icon */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Outer glow ring */}
          <div
            className="absolute w-24 h-24 md:w-28 md:h-28 rounded-full opacity-0 group-hover:opacity-40 transition-all duration-700 blur-2xl"
            style={{ backgroundColor: '#CDFF00' }}
            aria-hidden="true"
          />

          {/* Pulsing ring */}
          <div
            className={`absolute w-20 h-20 md:w-24 md:h-24 rounded-full border-2 opacity-0 group-hover:opacity-60 transition-all duration-500 ${isHovered ? 'radio-animate-pulse-ring' : ''}`}
            style={{ borderColor: '#CDFF00' }}
            aria-hidden="true"
          />

          {/* Icon container */}
          <div
            className="relative w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-3xl md:text-4xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-12"
            style={{
              background: `linear-gradient(135deg, #CDFF0025, #CDFF0015)`,
              boxShadow: `0 0 40px #CDFF0020, inset 0 0 20px #CDFF0010`,
            }}
          >
            <span className="relative z-10 drop-shadow-2xl" role="img" aria-label={channel.nameKo}>
              {channel.icon}
            </span>

            {/* Rotating radio icon badge */}
            <div
              className={`absolute -top-2 -right-2 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 ${isHovered ? 'radio-animate-spin-slow' : ''}`}
              style={{
                backgroundColor: '#CDFF00',
                boxShadow: `0 0 20px #CDFF0060`,
              }}
              aria-hidden="true"
            >
              <Radio className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Text content with staggered animation */}
        <div className="relative z-10 space-y-3">
          {/* Channel name */}
          <div className="overflow-hidden">
            <h3
              className="text-xl md:text-2xl font-bold text-white transition-all duration-500 group-hover:translate-x-1"
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                letterSpacing: '-0.02em',
                textShadow: `0 0 20px #CDFF0040`,
              }}
            >
              {channel.nameKo}
            </h3>
          </div>

          {/* Description */}
          <p
            className="text-white/60 text-sm leading-relaxed min-h-[44px] transition-all duration-500 group-hover:text-white/80"
            style={{
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {channel.description}
          </p>

          {/* Algorithm type & min views display */}
          <div className="flex items-center gap-3 text-xs font-mono text-white/40 group-hover:text-white/60 transition-colors duration-500">
            <div className="flex items-center gap-1.5">
              <algorithmInfo.icon className="w-3 h-3" aria-hidden="true" />
              <span>{algorithmInfo.label}</span>
            </div>
            {channel.config.minViews && (
              <>
                <span className="text-white/20">•</span>
                <div className="flex items-center gap-1.5">
                  <Waves className="w-3 h-3" aria-hidden="true" />
                  <span>{(channel.config.minViews / 10000).toFixed(0)}만+ 조회수</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Enhanced play button with improved touch target */}
        <button
          onClick={handleStart}
          disabled={isLoading}
          aria-busy={isLoading}
          aria-label={isLoading ? '연결 중...' : `${channel.nameKo} 지금 듣기`}
          className="relative mt-6 w-full group/btn overflow-hidden rounded-xl md:rounded-2xl transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[48px] md:min-h-[56px] active:scale-[0.98]"
          style={{
            background: isLoading
              ? `linear-gradient(135deg, #CDFF0060, #CDFF0040)`
              : `linear-gradient(135deg, #CDFF00, #CDFF00dd)`,
            boxShadow: isHovered && !isLoading
              ? `0 8px 32px #CDFF0040, 0 0 0 1px #CDFF0030`
              : `0 4px 16px #CDFF0020`,
          }}
        >
          {/* Button shine effect */}
          <div
            className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500"
            style={{
              background: `linear-gradient(90deg, transparent, #CDFF0040, transparent)`,
              transform: isHovered ? 'translateX(100%)' : 'translateX(-100%)',
              transition: 'transform 0.8s ease-in-out',
            }}
            aria-hidden="true"
          />

          {/* Button content */}
          <div className="relative flex items-center justify-center gap-3 px-6 py-3 md:py-4">
            {isLoading ? (
              <>
                {/* Improved loading state with spinner + pulsing center */}
                <div className="relative">
                  <div
                    className="w-5 h-5 border-3 border-black/30 border-t-black rounded-full animate-spin"
                    style={{ borderWidth: '3px' }}
                    aria-hidden="true"
                  />
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <div className="w-2 h-2 bg-black rounded-full radio-animate-live-pulse" />
                  </div>
                </div>
                <span className="font-bold text-black text-sm tracking-wide">
                  연결 중...
                </span>
              </>
            ) : (
              <>
                <div className="relative">
                  <Play className="w-5 h-5 fill-black text-black transition-transform duration-300 group-hover/btn:scale-110" aria-hidden="true" />
                  <div
                    className="absolute inset-0 blur-md opacity-0 group-hover/btn:opacity-100 transition-opacity"
                    style={{ background: 'black' }}
                    aria-hidden="true"
                  />
                </div>
                <span
                  className="font-bold text-black text-sm tracking-wide transition-transform duration-300 group-hover/btn:translate-x-0.5"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  지금 듣기
                </span>
              </>
            )}
          </div>
        </button>

        {/* Bottom gradient accent */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
          style={{
            background: `linear-gradient(90deg, transparent, #CDFF00, transparent)`,
          }}
          aria-hidden="true"
        />
      </div>

      {/* Outer glow effect */}
      <div
        className="absolute -inset-[1px] rounded-2xl md:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10 blur-xl"
        style={{
          background: `linear-gradient(135deg, #CDFF0020, transparent)`,
        }}
        aria-hidden="true"
      />
    </article>
  );
}
