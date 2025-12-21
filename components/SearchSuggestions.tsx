"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Song } from "@/lib/db";

interface SearchSuggestionsProps {
  suggestions: Song[];
  query: string;
  total: number;
  isLoading: boolean;
  onClose: () => void;
}

export function SearchSuggestions({
  suggestions,
  query,
  total,
  isLoading,
  onClose,
}: SearchSuggestionsProps) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  if (!isLoading && suggestions.length === 0) {
    return (
      <div
        ref={dropdownRef}
        className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-hidden"
      >
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          '{query}'에 대한 검색 결과가 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-hidden"
    >
      {isLoading ? (
        <div className="p-4 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">검색 중...</p>
        </div>
      ) : (
        <>
          <div className="max-h-80 overflow-y-auto">
            {suggestions.map((song) => {
              const displayTitle = song.titleKorean || song.titleEnglish || song.titleJapanese || song.title;
              const viewCount = typeof song.viewCount === 'bigint'
                ? song.viewCount.toString()
                : song.viewCount || '0';

              return (
                <button
                  key={song.vocadbId}
                  onClick={() => {
                    router.push(`/songs/${song.vocadbId}`);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  {/* Thumbnail */}
                  <div className="relative w-16 h-12 flex-shrink-0 rounded overflow-hidden bg-gray-200 dark:bg-gray-700">
                    {song.thumbUrl ? (
                      <Image
                        src={song.thumbUrl}
                        alt={displayTitle}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        🎵
                      </div>
                    )}
                  </div>

                  {/* Song info */}
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {displayTitle}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {song.artist}
                    </p>
                  </div>

                  {/* View count */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {parseInt(viewCount).toLocaleString()} views
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* See all results button */}
          {total > suggestions.length && (
            <button
              onClick={() => {
                router.push(`/search?q=${encodeURIComponent(query)}`);
                onClose();
              }}
              className="w-full p-3 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-medium text-sm transition-colors border-t border-purple-200 dark:border-purple-800"
            >
              모든 결과 보기 ({total.toLocaleString()}개)
            </button>
          )}
        </>
      )}
    </div>
  );
}
