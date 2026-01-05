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
