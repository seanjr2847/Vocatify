/**
 * Shared utility functions for formatting numbers, dates, and song titles
 * Used across multiple components to ensure consistent formatting
 */

import type { Song } from '@/lib/db';

/**
 * Format large numbers with K, M, B suffixes
 * @example formatNumber(1500) => "1.5K"
 * @example formatNumber(2000000) => "2.0M"
 */
export function formatNumber(num: bigint | number | null | undefined): string {
  if (!num) return '0';
  const n = typeof num === 'bigint' ? Number(num) : num;

  if (n >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toFixed(1)}B`;
  }
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }
  return Math.round(n).toLocaleString();
}

/**
 * Format date in Korean locale
 * @example formatDate(new Date('2024-01-15')) => "2024년 1월 15일"
 */
export function formatDate(date: Date | null | undefined): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get display title with fallback priority: Korean → English → Japanese → Romaji → Default
 * @example getDisplayTitle(song) => song.titleKorean || song.titleEnglish || ...
 */
export function getDisplayTitle(song: Pick<Song, 'titleKorean' | 'titleEnglish' | 'titleJapanese' | 'titleRomaji' | 'defaultName'>): string {
  return song.titleKorean || song.titleEnglish || song.titleJapanese || song.titleRomaji || song.defaultName;
}

/**
 * Generate YouTube thumbnail URL from video ID
 * Uses mqdefault (320x180) for balanced quality and performance
 * @example getYouTubeThumbnail('dQw4w9WgXcQ') => 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg'
 */
export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

/**
 * Format publish date as relative time (Korean)
 * @example formatPublishDate(new Date()) => '오늘'
 * @example formatPublishDate(yesterday) => '어제'
 * @example formatPublishDate(lastWeek) => '5일 전'
 */
export function formatPublishDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diffTime = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;

  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
