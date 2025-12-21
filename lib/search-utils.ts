/**
 * 검색 유틸리티 함수
 */

import { SearchSong } from './db';

/**
 * 검색어 하이라이팅을 위한 텍스트 분할
 * @param text 원본 텍스트
 * @param query 검색어
 * @returns 분할된 텍스트 배열 [{ text: string, highlighted: boolean }]
 */
export function highlightMatch(text: string, query: string): { text: string; highlighted: boolean }[] {
  if (!text || !query) {
    return [{ text: text || '', highlighted: false }];
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const startIndex = lowerText.indexOf(lowerQuery);

  if (startIndex === -1) {
    return [{ text, highlighted: false }];
  }

  const parts: { text: string; highlighted: boolean }[] = [];

  if (startIndex > 0) {
    parts.push({ text: text.slice(0, startIndex), highlighted: false });
  }

  parts.push({
    text: text.slice(startIndex, startIndex + query.length),
    highlighted: true,
  });

  if (startIndex + query.length < text.length) {
    parts.push({
      text: text.slice(startIndex + query.length),
      highlighted: false,
    });
  }

  return parts;
}

/**
 * 매칭된 필드의 라벨 반환
 */
export function getMatchedFieldLabel(field: SearchSong['matchedField']): string {
  switch (field) {
    case 'title':
      return '제목';
    case 'titleEnglish':
      return '영어 제목';
    case 'titleJapanese':
      return '일본어 제목';
    case 'titleKorean':
      return '한국어 제목';
    case 'titleRomaji':
      return '로마지';
    case 'artist':
      return '아티스트';
    default:
      return '';
  }
}

/**
 * 검색어 정규화 (특수문자 제거, 공백 정리)
 */
export function normalizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * 검색어에서 하이라이팅할 표시 제목 선택
 */
export function getDisplayTitleForHighlight(
  song: {
    title: string;
    titleKorean?: string | null;
    titleEnglish?: string | null;
    titleJapanese?: string | null;
    titleRomaji?: string | null;
  },
  matchedField?: SearchSong['matchedField']
): string {
  // matchedField가 제목 관련이면 해당 필드 반환
  switch (matchedField) {
    case 'titleKorean':
      return song.titleKorean || song.title;
    case 'titleEnglish':
      return song.titleEnglish || song.title;
    case 'titleJapanese':
      return song.titleJapanese || song.title;
    case 'titleRomaji':
      return song.titleRomaji || song.title;
    case 'title':
      return song.title;
    default:
      // 기본 우선순위: 한국어 > 영어 > 일본어 > 기본
      return song.titleKorean || song.titleEnglish || song.titleJapanese || song.title;
  }
}
