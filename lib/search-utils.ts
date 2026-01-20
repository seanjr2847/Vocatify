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
