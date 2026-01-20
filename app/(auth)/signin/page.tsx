import { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/components/auth/SignInButton";
import { Music, Sparkles, TrendingUp, Radio, Headphones } from "lucide-react";

export const metadata: Metadata = {
  title: "로그인 | Vocatify",
  description: "보컬로이드 음악 차트 - Google 계정으로 로그인",
};

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0a]">
      {/* Animated background gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-[#39c5bb]/20 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-[#2da89e]/20 blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-[#39c5bb]/10 blur-[150px] animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Floating music notes decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <Music
            key={i}
            className="absolute text-[#39c5bb]/10 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${20 + Math.random() * 30}px`,
              height: `${20 + Math.random() * 30}px`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8 px-4">
        {/* Logo & Welcome */}
        <div className="flex flex-col items-center space-y-4">
          <Link
            href="/"
            className="group flex items-center space-x-3 text-[#39c5bb] transition-transform hover:scale-105"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-[#39c5bb]/20 blur-xl group-hover:bg-[#39c5bb]/30 transition-colors" />
              <Music className="relative h-14 w-14 drop-shadow-2xl" />
            </div>
            <span className="text-4xl font-bold tracking-tight bg-gradient-to-r from-[#39c5bb] to-[#2da89e] bg-clip-text text-transparent">
              Vocatify
            </span>
          </Link>

          <div className="flex items-center gap-2 text-white/60">
            <Sparkles className="h-4 w-4 animate-pulse" />
            <p className="text-center text-sm font-medium">
              보컬로이드 음악 차트에 오신 것을 환영합니다
            </p>
            <Sparkles className="h-4 w-4 animate-pulse" />
          </div>
        </div>

        {/* Sign In Card */}
        <div className="relative group">
          {/* Glow effect */}
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#39c5bb]/50 to-[#2da89e]/50 opacity-20 blur-xl group-hover:opacity-40 transition-opacity" />

          {/* Card */}
          <div className="relative rounded-2xl border border-white/10 bg-[#1a1a1a]/80 backdrop-blur-xl p-8 shadow-2xl">
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <h2 className="text-2xl font-bold text-white">음악의 세계로</h2>
                <p className="text-sm text-white/60">
                  Google 계정으로 간편하게 시작하세요
                </p>
              </div>

              <SignInButton />

              {/* Features */}
              <div className="grid grid-cols-3 gap-3 pt-4">
                <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[#39c5bb]/5 border border-[#39c5bb]/10">
                  <TrendingUp className="h-5 w-5 text-[#39c5bb]" />
                  <span className="text-xs text-white/60 font-medium">차트</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[#39c5bb]/5 border border-[#39c5bb]/10">
                  <Radio className="h-5 w-5 text-[#39c5bb]" />
                  <span className="text-xs text-white/60 font-medium">라디오</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[#39c5bb]/5 border border-[#39c5bb]/10">
                  <Headphones className="h-5 w-5 text-[#39c5bb]" />
                  <span className="text-xs text-white/60 font-medium">플레이리스트</span>
                </div>
              </div>

              <p className="text-center text-xs text-white/40 leading-relaxed">
                로그인하면{" "}
                <Link href="/terms" className="text-[#39c5bb]/80 hover:text-[#39c5bb] underline decoration-dotted transition">
                  서비스 약관
                </Link>
                과{" "}
                <Link href="/privacy" className="text-[#39c5bb]/80 hover:text-[#39c5bb] underline decoration-dotted transition">
                  개인정보 처리방침
                </Link>
                에 동의하게 됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-[#39c5bb] transition-colors group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            <span className="font-medium">홈으로 돌아가기</span>
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.1;
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
            opacity: 0.3;
          }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
