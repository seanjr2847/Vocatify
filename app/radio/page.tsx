'use client';

import { Metadata } from "next";
import { RADIO_CHANNELS } from '@/lib/radio/channels';
import RadioChannelCard from '@/components/radio/RadioChannelCard';
import { Radio, Sparkles, Waves, Zap } from "lucide-react";
import { useState, useEffect } from 'react';

export default function RadioPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1d2123] via-[#1a1f21] to-[#1d2123] relative overflow-hidden">
      {/* Ambient Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Radial gradients for depth */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#39c5bb]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#4A90E2]/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/3 w-72 h-72 bg-[#F5A623]/5 rounded-full blur-3xl" />

        {/* Animated particles */}
        {mounted && [...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full"
            style={{
              left: `${10 + i * 12}%`,
              top: `${20 + (i % 3) * 25}%`,
              animation: `float ${8 + i * 2}s ease-in-out infinite`,
              animationDelay: `${i * 0.8}s`,
            }}
          />
        ))}
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-12">
        {/* Enhanced Header with Animation */}
        <div className={`mb-16 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          {/* Icon and Title */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              {/* Pulsing glow */}
              <div className="absolute inset-0 bg-[#39c5bb]/30 rounded-2xl blur-xl animate-pulse" />

              {/* Icon container */}
              <div className="relative bg-gradient-to-br from-[#39c5bb]/20 to-[#39c5bb]/10 p-4 rounded-2xl border border-[#39c5bb]/30">
                <Radio className="h-10 w-10 text-[#39c5bb]" />
              </div>
            </div>

            <div>
              <h1
                className="text-5xl md:text-6xl font-bold text-white tracking-tight"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  textShadow: '0 0 40px rgba(57, 197, 187, 0.3)',
                }}
              >
                라디오 채널
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <Sparkles className="w-4 h-4 text-[#39c5bb]/70" />
                <p
                  className="text-white/50 text-sm tracking-wide uppercase"
                  style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '0.1em' }}
                >
                  Infinite Discovery Mode
                </p>
              </div>
            </div>
          </div>

          {/* Subtitle */}
          <p
            className="text-xl text-white/70 max-w-2xl leading-relaxed ml-[88px]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            당신을 위한 무한 재생 - 기분에 맞는 음악을 자동으로
          </p>

          {/* Decorative line */}
          <div className="mt-6 ml-[88px] h-[1px] w-64 bg-gradient-to-r from-[#39c5bb]/50 via-[#39c5bb]/20 to-transparent" />
        </div>

        {/* Channel Grid with Staggered Animation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {RADIO_CHANNELS.map((channel, idx) => (
            <div
              key={channel.slug}
              className={`transition-all duration-700 ${
                mounted
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
              }`}
              style={{
                transitionDelay: `${200 + idx * 150}ms`,
              }}
            >
              <RadioChannelCard channel={channel} />
            </div>
          ))}
        </div>

        {/* Enhanced Info Section */}
        <div
          className={`transition-all duration-1000 ${
            mounted
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '800ms' }}
        >
          <div className="relative rounded-3xl overflow-hidden">
            {/* Glassmorphic background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a]/90 to-[#0a0a0a]/90 backdrop-blur-xl" />
            <div className="absolute inset-0 border border-white/[0.08] rounded-3xl" />

            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#39c5bb]/5 via-transparent to-[#4A90E2]/5" />

            {/* Content */}
            <div className="relative p-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-[#39c5bb]/10">
                  <Waves className="w-5 h-5 text-[#39c5bb]" />
                </div>
                <h2
                  className="text-2xl font-bold text-white"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  라디오 채널이란?
                </h2>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {/* Feature 1 */}
                <div className="group">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 p-2 rounded-lg bg-[#39c5bb]/10 group-hover:bg-[#39c5bb]/20 transition-colors">
                      <Radio className="w-4 h-4 text-[#39c5bb]" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        무한 재생
                      </h3>
                      <p className="text-white/60 text-sm leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                        끝없이 이어지는 큐레이션된 음악 스트림
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="group">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 p-2 rounded-lg bg-[#4A90E2]/10 group-hover:bg-[#4A90E2]/20 transition-colors">
                      <Sparkles className="w-4 h-4 text-[#4A90E2]" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        스마트 추천
                      </h3>
                      <p className="text-white/60 text-sm leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                        태그 기반 알고리즘으로 비슷한 곡 자동 선곡
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="group">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 p-2 rounded-lg bg-[#F5A623]/10 group-hover:bg-[#F5A623]/20 transition-colors">
                      <Zap className="w-4 h-4 text-[#F5A623]" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        반복 방지
                      </h3>
                      <p className="text-white/60 text-sm leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                        이미 들은 곡은 제외하고 새로운 곡 발견
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) scale(1);
            opacity: 0.2;
          }
          50% {
            transform: translateY(-20px) scale(1.2);
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  );
}
