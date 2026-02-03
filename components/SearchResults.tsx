"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Song } from "@/lib/db";
import { ChevronLeft, ChevronRight, Plus, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDisplayTitle } from "@/lib/utils/format-utils";
import { PlayButton } from "@/components/PlayButton";
import { AddToPlaylistButton } from "@/components/user/AddToPlaylistButton";
import { useMusicPlayer } from "@/lib/MusicPlayerContext";
import { toast } from "sonner";

interface SearchResultsProps {
  initialResults: Song[];
  total: number;
  query: string;
  currentPage: number;
  sortBy: string;
  artistType: string;
  tagId?: number | null;
  tagName?: string | null;
}

const SORT_OPTIONS = [
  { value: "relevance", label: "관련성" },
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
  tagId: initialTagId,
  tagName: initialTagName,
}: SearchResultsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToPlaylist, startSimilarRadio } = useMusicPlayer();
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [artistType, setArtistType] = useState(initialArtistType);
  const [tagId] = useState(initialTagId);
  const [tagName] = useState(initialTagName);
  const [radioLoadingId, setRadioLoadingId] = useState<number | null>(null);

  const handleAddToQueue = (e: React.MouseEvent, song: Song) => {
    e.preventDefault();
    e.stopPropagation();
    addToPlaylist(song);
    toast.success(`"${getDisplayTitle(song)}"을(를) 재생 대기열에 추가했습니다`);
  };

  const handleStartRadio = async (e: React.MouseEvent, song: Song) => {
    e.preventDefault();
    e.stopPropagation();
    setRadioLoadingId(song.vocadbId);
    try {
      await startSimilarRadio(song.vocadbId);
      toast.success(`"${getDisplayTitle(song)}" 라디오를 시작합니다`);
    } catch (error) {
      console.error('Radio start error:', error);
      toast.error('라디오 시작에 실패했습니다');
    } finally {
      setRadioLoadingId(null);
    }
  };

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

    // Preserve tag filter
    if (tagId) {
      params.set("tagId", tagId.toString());
      if (tagName) {
        params.set("tagName", tagName);
      }
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

    // Preserve tag filter
    if (tagId) {
      params.set("tagId", tagId.toString());
      if (tagName) {
        params.set("tagName", tagName);
      }
    }

    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 pb-32 md:pb-40">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center text-[#39c5bb] hover:text-[#5eead4] mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          홈으로 돌아가기
        </Link>
        <h1 className="text-3xl font-bold text-white mb-2">
          {tagId && !query ? '태그 검색' : '검색 결과'}
        </h1>
        <p className="text-gray-400">
          {query ? (
            <>&apos;{query}&apos;에 대한 {total.toLocaleString()}개의 결과</>
          ) : tagId ? (
            <>{total.toLocaleString()}개의 곡</>
          ) : (
            <>{total.toLocaleString()}개의 결과</>
          )}
        </p>
      </div>

      {/* Tag Filter Indicator */}
      {tagId && (
        <div className="mb-6 animate-fadeIn">
          <div className="relative group">
            {/* Animated Glow Background */}
            <div className="absolute -inset-1 bg-[#39c5bb] rounded-2xl blur-lg opacity-20 group-hover:opacity-40 animate-pulse"></div>

            {/* Main Container */}
            <div className="relative flex items-center gap-3 px-5 py-3 bg-gradient-to-br from-[#39c5bb]/10 via-gray-900/60 to-[#39c5bb]/5 border-2 border-[#39c5bb]/30 rounded-2xl backdrop-blur-md overflow-hidden">
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#39c5bb]/20 to-transparent animate-shimmer"></div>
              </div>

              {/* Filter Icon */}
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-[#39c5bb]/20 flex items-center justify-center border border-[#39c5bb]/30">
                  <svg
                    className="w-4 h-4 text-[#39c5bb]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
              </div>

              {/* Filter Info */}
              <div className="relative flex-1 min-w-0">
                <div className="text-xs text-[#39c5bb]/70 font-medium mb-0.5">
                  ACTIVE FILTER
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-[#5eead4]">
                    {tagName || `Tag #${tagId}`}
                  </span>
                  <div className="h-1 w-1 rounded-full bg-[#39c5bb] animate-pulse"></div>
                </div>
              </div>

              {/* Remove Button */}
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete("tagId");
                  params.delete("tagName");
                  router.push(`/search?${params.toString()}`);
                }}
                className="relative flex-shrink-0 group/btn"
                title="태그 필터 제거"
              >
                <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-red-500/20 to-pink-500/20 hover:from-red-500/40 hover:to-pink-500/40 flex items-center justify-center border border-red-400/30 hover:border-red-400/60 transition-all duration-300 hover:scale-110">
                  {/* Glow on hover */}
                  <div className="absolute inset-0 rounded-lg bg-red-500/20 blur-md opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>

                  <svg
                    className="relative w-4 h-4 text-red-300 group-hover/btn:text-red-200 transition-all duration-300 group-hover/btn:rotate-90"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </button>

              {/* Decorative Corner Accents */}
              <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-[#39c5bb]/10 to-transparent rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-[#39c5bb]/10 to-transparent rounded-full blur-2xl"></div>
            </div>
          </div>

          {/* Inline Animation Styles */}
          <style jsx>{`
            @keyframes shimmer {
              0% {
                transform: translateX(-100%);
              }
              100% {
                transform: translateX(100%);
              }
            }
            .animate-shimmer {
              animation: shimmer 3s infinite;
            }
          `}</style>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 mb-6 flex-wrap">
        {/* Sort dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">정렬:</label>
          <select
            value={sortBy}
            onChange={(e) => updateFilters(e.target.value, undefined)}
            className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-[#39c5bb] transition-colors"
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
                  ? "bg-[#39c5bb] text-black"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              보컬로이드만
            </button>
            <button
              onClick={() => updateFilters(undefined, "all")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                artistType === "all"
                  ? "bg-[#39c5bb] text-black"
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
        <div className="relative py-24">
          {/* Decorative Background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5">
            <svg className="w-64 h-64" viewBox="0 0 200 200" fill="none">
              <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="0.5" className="text-[#39c5bb]" />
              <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="0.5" className="text-[#39c5bb]" />
              <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="0.5" className="text-[#39c5bb]" />
            </svg>
          </div>

          <div className="relative text-center">
            {/* Empty State Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-[#39c5bb]/10 to-[#39c5bb]/5 border border-[#39c5bb]/20">
              <svg className="w-10 h-10 text-[#39c5bb]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            {/* Main Message */}
            <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-gray-200 to-gray-400 bg-clip-text text-transparent">
              검색 결과가 없습니다
            </h3>

            {/* Contextual Message */}
            {tagId ? (
              <div className="max-w-md mx-auto space-y-4">
                <p className="text-gray-400 leading-relaxed">
                  이 태그와 <span className="text-[#39c5bb] font-semibold">&apos;{query}&apos;</span> 검색어가 모두 일치하는 곡이 없습니다.
                </p>

                {/* Clear Filter Button */}
                <button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete("tagId");
                    params.delete("tagName");
                    router.push(`/search?${params.toString()}`);
                  }}
                  className="group relative inline-flex items-center gap-2 px-6 py-3 rounded-xl overflow-hidden transition-all duration-300 hover:scale-105"
                >
                  {/* Button Background */}
                  <div className="absolute inset-0 bg-[#39c5bb]/20 group-hover:bg-[#39c5bb]/30 transition-all"></div>
                  <div className="absolute inset-0 border-2 border-[#39c5bb]/30 group-hover:border-[#39c5bb]/50 rounded-xl transition-all"></div>

                  {/* Button Content */}
                  <svg className="relative w-4 h-4 text-[#39c5bb] group-hover:text-[#5eead4] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="relative text-sm font-semibold text-[#39c5bb] group-hover:text-[#5eead4] transition-colors">
                    태그 필터 제거
                  </span>
                </button>
              </div>
            ) : (
              <p className="text-gray-400 max-w-md mx-auto">
                다른 검색어를 시도하거나 필터를 조정해보세요
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {initialResults.map((song) => {
            const displayTitle = getDisplayTitle(song);
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
                className="group flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-all hover:shadow-lg hover:shadow-[#39c5bb]/10 border border-transparent hover:border-[#39c5bb]/30"
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
                    <span className="truncate">{song.artistString}</span>
                    {publishDate && (
                      <>
                        <span className="text-gray-600">•</span>
                        <span>{publishDate}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex-shrink-0 text-right mr-2">
                  <div className="text-white font-semibold">
                    {parseInt(viewCount).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">조회수</div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Play Button */}
                  <PlayButton song={song} variant="small" />

                  {/* Add to Queue */}
                  <button
                    onClick={(e) => handleAddToQueue(e, song)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white hover:text-[#39c5bb]"
                    title="재생 대기열에 추가"
                  >
                    <Plus className="w-5 h-5" />
                  </button>

                  {/* Similar Radio */}
                  <button
                    onClick={(e) => handleStartRadio(e, song)}
                    disabled={radioLoadingId === song.vocadbId}
                    className={`w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white hover:text-[#39c5bb] ${
                      radioLoadingId === song.vocadbId ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title="비슷한 곡 라디오"
                  >
                    <Radio className="w-5 h-5" />
                  </button>

                  {/* Add to Playlist */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <AddToPlaylistButton
                      songId={song.vocadbId}
                      songTitle={displayTitle}
                      variant="ghost"
                      size="icon"
                      showText={false}
                      className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white hover:text-[#39c5bb]"
                    />
                  </div>
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
                      ? "bg-[#39c5bb] hover:bg-[#2db3a9] text-black"
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
