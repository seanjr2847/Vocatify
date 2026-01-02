"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Song } from "@/lib/db";
import { highlightMatch, getMatchedFieldLabel } from "@/lib/search-utils";

interface SearchSong extends Song {
  matchedField?: 'title' | 'titleEnglish' | 'titleJapanese' | 'titleKorean' | 'titleRomaji' | 'artist';
  relevanceScore?: number;
}

interface SearchSuggestionsProps {
  suggestions: SearchSong[];
  query: string;
  total: number;
  isLoading: boolean;
  selectedIndex: number;
  onClose: () => void;
  onSelectIndex: (index: number) => void;
}

/**
 * 텍스트 하이라이팅 컴포넌트
 */
function HighlightedText({ text, query }: { text: string; query: string }) {
  const parts = highlightMatch(text, query);

  return (
    <>
      {parts.map((part, index) =>
        part.highlighted ? (
          <mark
            key={index}
            className="bg-purple-500/30 text-purple-300 rounded px-0.5"
          >
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </>
  );
}

export function SearchSuggestions({
  suggestions,
  query,
  total,
  isLoading,
  selectedIndex,
  onClose,
  onSelectIndex,
}: SearchSuggestionsProps) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

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

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  const handleSelectSong = useCallback((vocadbId: number) => {
    router.push(`/songs/${vocadbId}`);
    onClose();
  }, [router, onClose]);

  const handleViewAllResults = useCallback(() => {
    router.push(`/search?q=${encodeURIComponent(query)}`);
    onClose();
  }, [router, query, onClose]);

  if (!isLoading && suggestions.length === 0) {
    return (
      <div
        ref={dropdownRef}
        className="absolute top-full left-0 right-0 mt-2 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 z-50 max-h-96 overflow-hidden"
      >
        <div className="p-4 text-center text-gray-400">
          <span className="text-purple-400">'{query}'</span>에 대한 검색 결과가 없습니다.
          <p className="text-sm text-gray-500 mt-1">다른 검색어를 시도해보세요</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-2 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 z-50 max-h-96 overflow-hidden"
    >
      {isLoading ? (
        <div className="p-4 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-400">검색 중...</p>
        </div>
      ) : (
        <>
          <div className="max-h-80 overflow-y-auto">
            {suggestions.map((song, index) => {
              const displayTitle = song.titleKorean || song.titleEnglish || song.titleJapanese || song.defaultName;
              const viewCount = typeof song.viewCount === 'bigint'
                ? song.viewCount.toString()
                : song.viewCount || '0';
              const isSelected = index === selectedIndex;
              const matchedFieldLabel = getMatchedFieldLabel(song.matchedField);

              // Determine what to highlight
              const shouldHighlightTitle = song.matchedField && song.matchedField !== 'artist';
              const shouldHighlightArtist = song.matchedField === 'artist';

              return (
                <button
                  key={song.vocadbId}
                  ref={(el) => { itemRefs.current[index] = el; }}
                  onClick={() => handleSelectSong(song.vocadbId)}
                  onMouseEnter={() => onSelectIndex(index)}
                  className={`w-full flex items-center gap-3 p-3 transition-colors border-b border-gray-700 last:border-b-0 ${
                    isSelected
                      ? 'bg-purple-900/40 border-l-2 border-l-purple-500'
                      : 'hover:bg-gray-700'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative w-16 h-12 flex-shrink-0 rounded overflow-hidden bg-gray-700">
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
                    <p className="font-medium text-sm text-white truncate">
                      {shouldHighlightTitle ? (
                        <HighlightedText text={displayTitle} query={query} />
                      ) : (
                        displayTitle
                      )}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-400 truncate">
                        {shouldHighlightArtist ? (
                          <HighlightedText text={song.artistString} query={query} />
                        ) : (
                          song.artistString
                        )}
                      </p>
                      {matchedFieldLabel && song.matchedField !== 'titleKorean' && song.matchedField !== 'title' && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">
                          {matchedFieldLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* View count */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-gray-400">
                      {parseInt(viewCount).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-gray-500">조회수</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* See all results button */}
          {total > suggestions.length && (
            <button
              onClick={handleViewAllResults}
              className={`w-full p-3 bg-purple-900/20 hover:bg-purple-900/30 text-purple-400 font-medium text-sm transition-colors border-t border-purple-800 ${
                selectedIndex === suggestions.length ? 'bg-purple-900/40' : ''
              }`}
            >
              모든 결과 보기 ({total.toLocaleString()}개)
            </button>
          )}

          {/* Keyboard hint */}
          <div className="px-3 py-2 bg-gray-900/50 border-t border-gray-700">
            <p className="text-[10px] text-gray-500 text-center">
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-400">↑</kbd>
                <kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-400">↓</kbd>
                탐색
              </span>
              <span className="mx-2">•</span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-400">Enter</kbd>
                선택
              </span>
              <span className="mx-2">•</span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-400">Esc</kbd>
                닫기
              </span>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
