'use client';

import { useMusicPlayer } from '@/lib/MusicPlayerContext';
import { Play, Radio, Waves } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface RadioChannelCardProps {
  channel: {
    slug: string;
    nameKo: string;
    description: string;
    icon: string;
    color: string;
  };
}

export default function RadioChannelCard({ channel }: RadioChannelCardProps) {
  const { startRadio } = useMusicPlayer();
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleStart = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/radio/start?channel=${channel.slug}`);
      const data = await response.json();

      if (data.success && data.seedSong) {
        startRadio(data.seedSong.vocadbId);
        toast.success(`${channel.nameKo} 재생 시작`);
      } else {
        toast.error('라디오를 시작할 수 없습니다');
      }
    } catch (error) {
      console.error('Failed to start radio:', error);
      toast.error('라디오 시작 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative group overflow-hidden rounded-3xl transition-all duration-700 ease-out hover:scale-[1.02]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
      }}
    >
      {/* Glassmorphic container with depth */}
      <div className="relative bg-gradient-to-br from-[#1a1a1a]/90 to-[#0a0a0a]/90 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 transition-all duration-700">

        {/* Animated gradient background */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-3xl"
          style={{
            background: `radial-gradient(circle at 30% 20%, ${channel.color}15, transparent 50%),
                         radial-gradient(circle at 70% 80%, ${channel.color}10, transparent 50%)`,
          }}
        />

        {/* Animated waveform particles */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 rounded-full opacity-0 group-hover:opacity-30 transition-all duration-1000"
              style={{
                height: `${20 + Math.random() * 40}px`,
                left: `${20 + i * 15}%`,
                bottom: '20%',
                background: channel.color,
                animation: isHovered ? `wave ${1.5 + i * 0.2}s ease-in-out infinite` : 'none',
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
            className="absolute w-28 h-28 rounded-full opacity-0 group-hover:opacity-40 transition-all duration-700 blur-2xl"
            style={{ backgroundColor: channel.color }}
          />

          {/* Pulsing ring */}
          <div
            className="absolute w-24 h-24 rounded-full border-2 opacity-0 group-hover:opacity-60 transition-all duration-500"
            style={{
              borderColor: channel.color,
              animation: isHovered ? 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
            }}
          />

          {/* Icon container */}
          <div
            className="relative w-20 h-20 rounded-full flex items-center justify-center text-4xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-12"
            style={{
              background: `linear-gradient(135deg, ${channel.color}25, ${channel.color}15)`,
              boxShadow: `0 0 40px ${channel.color}20, inset 0 0 20px ${channel.color}10`,
            }}
          >
            <span className="relative z-10 drop-shadow-2xl">{channel.icon}</span>

            {/* Rotating radio icon badge */}
            <div
              className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500"
              style={{
                backgroundColor: channel.color,
                boxShadow: `0 0 20px ${channel.color}60`,
                animation: isHovered ? 'spin-slow 8s linear infinite' : 'none',
              }}
            >
              <Radio className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Text content with staggered animation */}
        <div className="relative z-10 space-y-3">
          {/* Channel name */}
          <div className="overflow-hidden">
            <h3
              className="text-2xl font-bold text-white transition-all duration-500 group-hover:translate-x-1"
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                letterSpacing: '-0.02em',
                textShadow: `0 0 20px ${channel.color}40`,
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

          {/* Frequency display (decorative) */}
          <div className="flex items-center gap-2 text-xs font-mono text-white/40 group-hover:text-white/60 transition-colors duration-500">
            <Waves className="w-3 h-3" />
            <span>{(88.0 + Math.random() * 20).toFixed(1)} MHz</span>
          </div>
        </div>

        {/* Enhanced play button */}
        <button
          onClick={handleStart}
          disabled={isLoading}
          className="relative mt-6 w-full group/btn overflow-hidden rounded-2xl transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: isLoading
              ? `linear-gradient(135deg, ${channel.color}60, ${channel.color}40)`
              : `linear-gradient(135deg, ${channel.color}, ${channel.color}dd)`,
            boxShadow: isHovered && !isLoading
              ? `0 8px 32px ${channel.color}40, 0 0 0 1px ${channel.color}30`
              : `0 4px 16px ${channel.color}20`,
          }}
        >
          {/* Button shine effect */}
          <div
            className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500"
            style={{
              background: `linear-gradient(90deg, transparent, ${channel.color}40, transparent)`,
              transform: isHovered ? 'translateX(100%)' : 'translateX(-100%)',
              transition: 'transform 0.8s ease-in-out',
            }}
          />

          {/* Button content */}
          <div className="relative flex items-center justify-center gap-3 px-6 py-4">
            {isLoading ? (
              <>
                <div
                  className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"
                  style={{ borderWidth: '3px' }}
                />
                <span className="font-bold text-white text-sm tracking-wide">
                  연결 중...
                </span>
              </>
            ) : (
              <>
                <div className="relative">
                  <Play className="w-5 h-5 fill-white text-white transition-transform duration-300 group-hover/btn:scale-110" />
                  <div
                    className="absolute inset-0 blur-md opacity-0 group-hover/btn:opacity-100 transition-opacity"
                    style={{ background: 'white' }}
                  />
                </div>
                <span
                  className="font-bold text-white text-sm tracking-wide transition-transform duration-300 group-hover/btn:translate-x-0.5"
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
            background: `linear-gradient(90deg, transparent, ${channel.color}, transparent)`,
          }}
        />
      </div>

      {/* Outer glow effect */}
      <div
        className="absolute -inset-[1px] rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10 blur-xl"
        style={{
          background: `linear-gradient(135deg, ${channel.color}20, transparent)`,
        }}
      />

      {/* Custom CSS animations */}
      <style jsx>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1.5); }
        }

        @keyframes pulse-ring {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.3;
          }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
