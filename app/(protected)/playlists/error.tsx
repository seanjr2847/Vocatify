"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

/**
 * Error Boundary for Playlists Section
 * Next.js 15 automatic error handling with recovery
 */

export default function PlaylistsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error("Playlists error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        {/* Error Icon with Glow */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            {/* Outer glow */}
            <div
              className={`
                absolute inset-0 rounded-full
                bg-gradient-to-br from-red-500 to-orange-500
                opacity-20 blur-3xl
                animate-pulse
              `}
            />
            {/* Icon container */}
            <div
              className={`
                relative p-6 rounded-full
                bg-gradient-to-br from-red-500/20 to-orange-500/20
                border-2 border-red-500/30
                shadow-2xl shadow-red-500/20
              `}
            >
              <AlertTriangle className="h-16 w-16 text-red-400" />
            </div>
          </div>
        </div>

        {/* Error Message */}
        <div className="text-center mb-8">
          <h1
            className="text-4xl font-bold text-white mb-4"
            style={{ fontFamily: "Quicksand, sans-serif" }}
          >
            문제가 발생했습니다
          </h1>
          <p className="text-white/60 text-lg mb-2">
            플레이리스트를 불러오는 중 오류가 발생했습니다
          </p>

          {/* Error Details (Development) */}
          {process.env.NODE_ENV === "development" && (
            <div
              className={`
                mt-6 p-4 rounded-xl
                bg-white/5 border border-white/10
                text-left
              `}
            >
              <p className="text-red-400 text-sm font-mono break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-white/40 text-xs mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {/* Retry Button */}
          <button
            onClick={reset}
            className={`
              group relative px-8 py-4 rounded-full
              bg-[#CDFF00] text-black
              font-bold text-lg
              transition-all duration-300
              hover:scale-105 hover:shadow-2xl hover:shadow-[#CDFF00]/50
              active:scale-95
              flex items-center justify-center gap-3
            `}
          >
            <RefreshCw className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500" />
            <span>다시 시도</span>
          </button>

          {/* Home Button */}
          <Link
            href="/"
            className={`
              group relative px-8 py-4 rounded-full
              bg-white/10 text-white border-2 border-white/20
              font-bold text-lg
              transition-all duration-300
              hover:bg-white/20 hover:border-white/30
              active:scale-95
              flex items-center justify-center gap-3
            `}
          >
            <Home className="h-5 w-5" />
            <span>홈으로</span>
          </Link>
        </div>

        {/* Help Text */}
        <p className="text-center text-white/40 text-sm mt-8">
          문제가 계속되면 페이지를 새로고침하거나 나중에 다시 시도해주세요
        </p>
      </div>
    </div>
  );
}
