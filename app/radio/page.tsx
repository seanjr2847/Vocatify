'use client';

import { RADIO_CHANNELS } from '@/lib/radio/channels';
import RadioChannelCard from '@/components/radio/RadioChannelCard';
import { Radio, Sparkles } from "lucide-react";
import { useState, useEffect } from 'react';

// SSR-safe deterministic particle positions based on index
const PARTICLE_POSITIONS = [
  { left: 10, top: 20 },
  { left: 22, top: 45 },
  { left: 34, top: 70 },
  { left: 46, top: 20 },
  { left: 58, top: 45 },
  { left: 70, top: 70 },
  { left: 82, top: 20 },
  { left: 94, top: 45 },
];

export default function RadioPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="bg-black overflow-hidden w-full flex flex-col min-h-screen">
      <main className="flex-1 flex flex-col">
          {/* Main Content - with safe-area padding for mobile */}
          <section
            className="flex-1 relative w-full py-6 overflow-y-auto"
            style={{
              paddingBottom: 'max(150px, calc(env(safe-area-inset-bottom, 0px) + 150px))',
            }}
          >
            <div className="relative">
              {/* Ambient Background Elements */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#CDFF00]/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#CDFF00]/3 rounded-full blur-3xl" />
                <div className="absolute top-1/3 right-1/3 w-72 h-72 bg-[#CDFF00]/4 rounded-full blur-3xl" />

                {/* SSR-Safe animated particles with deterministic positions */}
                {mounted && PARTICLE_POSITIONS.map((pos, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 bg-white/20 rounded-full radio-animate-float"
                    style={{
                      left: `${pos.left}%`,
                      top: `${pos.top}%`,
                      animationDuration: `${8 + i * 2}s`,
                      animationDelay: `${i * 0.8}s`,
                    }}
                  />
                ))}
              </div>

              <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
                {/* Enhanced Header with Animation */}
                <div className={`mb-12 md:mb-16 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                  {/* Icon and Title */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      {/* Pulsing glow */}
                      <div className="absolute inset-0 bg-[#CDFF00]/30 rounded-2xl blur-xl animate-pulse" aria-hidden="true" />

                      {/* Icon container with Live indicator */}
                      <div className="relative bg-gradient-to-br from-[#CDFF00]/20 to-[#CDFF00]/10 p-4 rounded-2xl border border-[#CDFF00]/30">
                        <Radio className="h-8 w-8 md:h-10 md:w-10 text-[#CDFF00]" />

                        {/* Live pulse indicator */}
                        <div className="absolute -top-1 -right-1">
                          <span className="flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#CDFF00] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#CDFF00]"></span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white">라디오</h1>
                        <span className="px-3 py-1 bg-[#CDFF00]/20 text-[#CDFF00] text-xs font-bold rounded-full border border-[#CDFF00]/30 animate-pulse">
                          LIVE
                        </span>
                      </div>
                      <p className="text-base md:text-lg text-gray-400">24/7 보컬로이드 음악 스트리밍</p>
                    </div>
                  </div>

                  {/* Enhanced Tagline */}
                  <div className="flex items-start gap-3 bg-gradient-to-r from-[#CDFF00]/10 to-transparent p-4 rounded-xl border-l-2 border-[#CDFF00]">
                    <Sparkles className="h-5 w-5 text-[#CDFF00] flex-shrink-0 mt-0.5" />
                    <p className="text-gray-300 text-sm md:text-base leading-relaxed">
                      다양한 분위기의 채널에서 엄선된 보컬로이드 음악을 즐겨보세요.
                      <br />
                      <span className="text-[#CDFF00] font-semibold">끊김 없는 연속 재생</span>으로 당신만의 음악 여정을 시작하세요.
                    </p>
                  </div>
                </div>

                {/* Channels Grid with staggered animation */}
                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                  {RADIO_CHANNELS.map((channel, index) => (
                    <div
                      key={channel.slug}
                      style={{
                        animationDelay: mounted ? `${index * 100}ms` : '0ms',
                      }}
                      className={mounted ? 'animate-fadeInUp' : 'opacity-0'}
                    >
                      <RadioChannelCard channel={channel} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>
    </div>
  );
}
