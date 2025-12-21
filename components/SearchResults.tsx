"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Song } from "@/lib/db";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchResultsProps {
  initialResults: Song[];
  total: number;
  query: string;
  currentPage: number;
  sortBy: string;
  artistType: string;
}

const SORT_OPTIONS = [
  { value: "viewCount", label: "조회수" },
  { value: "publishDate", label: "발매일" },
  { value: "title", label: "제목" },
  { value: "artist", label: "아티스트" },
];

export function SearchResults({
  initialResults,
  total,
  query,
  currentPage,
  sortBy: initialSortBy,
  artistType: initialArtistType,
}: SearchResultsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [artistType, setArtistType] = useState(initialArtistType);

  const totalPages = Math.ceil(total / 20);

  const updateFilters = (newSortBy?: string, newArtistType?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("q", query);

    if (newSortBy !== undefined) {
      params.set("sortBy", newSortBy);
      setSortBy(newSortBy);
    } else {
      params.set("sortBy", sortBy);
    }

    if (newArtistType !== undefined) {
      params.set("artistType", newArtistType === "Vocaloid" ? "vocaloid" : "all");
      setArtistType(newArtistType);
    } else {
      params.set("artistType", artistType === "Vocaloid" ? "vocaloid" : "all");
    }

    params.set("page", "1"); // Reset to first page on filter change
    router.push(`/search?${params.toString()}`);
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("q", query);
    params.set("page", page.toString());
    params.set("sortBy", sortBy);
    params.set("artistType", artistType === "Vocaloid" ? "vocaloid" : "all");
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center text-purple-400 hover:text-purple-300 mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          홈으로 돌아가기
        </Link>
        <h1 className="text-3xl font-bold text-white mb-2">검색 결과</h1>
        <p className="text-gray-400">
          '{query}'에 대한 {total.toLocaleString()}개의 결과
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 flex-wrap">
        {/* Sort dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">정렬:</label>
          <select
            value={sortBy}
            onChange={(e) => updateFilters(e.target.value, undefined)}
            className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-purple-500 transition-colors"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Artist type filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">아티스트:</label>
          <div className="flex bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <button
              onClick={() => updateFilters(undefined, "Vocaloid")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                artistType === "Vocaloid"
                  ? "bg-purple-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              보컬로이드만
            </button>
            <button
              onClick={() => updateFilters(undefined, "all")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                artistType === "all"
                  ? "bg-purple-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              모든 아티스트
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {initialResults.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-xl text-gray-400 mb-2">검색 결과가 없습니다</p>
          <p className="text-sm text-gray-500">다른 검색어를 시도해보세요</p>
        </div>
      ) : (
        <div className="space-y-2">
          {initialResults.map((song) => {
            const displayTitle = song.titleKorean || song.titleEnglish || song.titleJapanese || song.title;
            const viewCount = typeof song.viewCount === 'bigint'
              ? song.viewCount.toString()
              : song.viewCount || '0';
            const publishDate = song.publishDate
              ? new Date(song.publishDate).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : null;

            return (
              <Link
                key={song.vocadbId}
                href={`/songs/${song.vocadbId}`}
                className="flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-all hover:shadow-lg hover:shadow-purple-500/10 border border-transparent hover:border-purple-500/30"
              >
                {/* Thumbnail */}
                <div className="relative w-24 h-16 flex-shrink-0 rounded overflow-hidden bg-gray-700">
                  {song.thumbUrl ? (
                    <Image
                      src={song.thumbUrl}
                      alt={displayTitle}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      🎵
                    </div>
                  )}
                </div>

                {/* Song info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-lg mb-1 truncate">
                    {displayTitle}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <span className="truncate">{song.artist}</span>
                    {publishDate && (
                      <>
                        <span className="text-gray-600">•</span>
                        <span>{publishDate}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-white font-semibold">
                    {parseInt(viewCount).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">조회수</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            variant="outline"
            size="icon"
            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex gap-1">
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;

              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  className={
                    currentPage === pageNum
                      ? "bg-purple-600 hover:bg-purple-700 text-white"
                      : "bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                  }
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            variant="outline"
            size="icon"
            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Page info */}
      {totalPages > 1 && (
        <div className="text-center mt-4 text-sm text-gray-400">
          페이지 {currentPage} / {totalPages}
        </div>
      )}
    </div>
  );
}
